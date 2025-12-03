import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { EventEmitter } from 'events';
import { K8sClient } from './client';

export enum PortForwardState {
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
  STOPPED = 'STOPPED',
}

export interface PortForwardConfig {
  id: string;
  cluster: string;
  namespace: string;
  service: string;
  servicePort: number;
  localPort: number;
}

export interface PortForwardStatus extends PortForwardConfig {
  state: PortForwardState;
  retryCount: number;
  error?: string;
  lastError?: string;
  nextRetryAt?: Date;
}

export class PortForwardInstance extends EventEmitter {
  private process: ChildProcess | null = null;
  private state: PortForwardState = PortForwardState.CONNECTING;
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelayMs = 1000;
  private maxRetryDelayMs = 30000;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly connectionTimeoutMs = 30000;
  private readonly healthCheckIntervalMs = 5000;
  private podName: string | null = null;

  constructor(private config: PortForwardConfig, private k8sClient?: K8sClient) {
    super();
  }

  getId(): string {
    return this.config.id;
  }

  getStatus(): PortForwardStatus {
    return {
      ...this.config,
      state: this.state,
      retryCount: this.retryCount,
      nextRetryAt: this.reconnectTimeout ? new Date(Date.now() + this.retryDelayMs) : undefined,
    };
  }

  async start() {
    if (this.state === PortForwardState.STOPPED) {
      return;
    }

    this.state = PortForwardState.CONNECTING;
    this.emit('status-change', this.getStatus());

    this.connectionTimeout = setTimeout(() => {
      if (this.state === PortForwardState.CONNECTING) {
        this.handleError('Connection timeout: port-forward did not establish within 30s');
      }
    }, this.connectionTimeoutMs);

    await this.spawnProcess();
    this.startHealthCheck();
  }

  private async spawnProcess() {
    const podName = await this.getPodName();
    
    if (!podName) {
      this.handleError('No pod found for service');
      return;
    }

    const args = [
      'port-forward',
      `pod/${podName}`,
      `${this.config.localPort}:${this.config.servicePort}`,
      '--namespace',
      this.config.namespace,
      '--context',
      this.config.cluster,
    ];

    this.process = spawn('kubectl', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Forwarding from')) {
        this.clearConnectionTimeout();
        if (this.state === PortForwardState.CONNECTING || this.state === PortForwardState.RECONNECTING) {
          this.state = PortForwardState.ACTIVE;
          this.retryCount = 0;
          this.retryDelayMs = 1000;
          this.emit('status-change', this.getStatus());
        }
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      if (error.includes('error') || error.includes('Error')) {
        this.handleError(error);
      }
    });

    this.process.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        this.handleError(`Process exited with code ${code}`);
      } else if (signal) {
        this.handleError(`Process killed by signal ${signal}`);
      }
    });

    this.process.on('error', (error) => {
      this.handleError(`Failed to spawn kubectl: ${error.message}`);
    });
  }

  private async getPodName(): Promise<string | null> {
    if (this.podName) {
      return this.podName;
    }

    return new Promise((resolve) => {
      const args = [
        'get',
        'endpoints',
        this.config.service,
        '--namespace',
        this.config.namespace,
        '--context',
        this.config.cluster,
        '-o',
        'jsonpath={.subsets[0].addresses[0].targetRef.name}',
      ];

      const proc = spawn('kubectl', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      proc.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('exit', (code) => {
        if (code === 0 && output.trim()) {
          this.podName = output.trim();
          resolve(this.podName);
        } else {
          this.tryAlternativePodSelection(resolve);
        }
      });

      proc.on('error', () => {
        this.tryAlternativePodSelection(resolve);
      });
    });
  }

  private tryAlternativePodSelection(resolve: (value: string | null) => void) {
    const args = [
      'get',
      'pods',
      '--namespace',
      this.config.namespace,
      '--context',
      this.config.cluster,
      '--field-selector',
      'status.phase=Running',
      '-o',
      'jsonpath={.items[0].metadata.name}',
    ];

    const proc = spawn('kubectl', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('exit', (code) => {
      if (code === 0 && output.trim()) {
        this.podName = output.trim();
        resolve(this.podName);
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => {
      resolve(null);
    });
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      if (this.state === PortForwardState.ACTIVE) {
        this.checkConnection();
      }
    }, this.healthCheckIntervalMs);
  }

  private checkConnection() {
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
    });

    socket.once('timeout', () => {
      socket.destroy();
      this.handleError('Health check failed: connection timeout');
    });

    socket.once('error', () => {
      socket.destroy();
      this.handleError('Health check failed: connection refused');
    });

    socket.connect(this.config.localPort, 'localhost');
  }

  private handleError(error: string) {
    this.clearConnectionTimeout();
    this.lastError = error;

    if (this.state === PortForwardState.STOPPED) {
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      this.state = PortForwardState.FAILED;
      this.emit('status-change', { ...this.getStatus(), error });
      this.stop();
      return;
    }

    this.retryCount++;
    this.state = PortForwardState.RECONNECTING;
    this.emit('status-change', { ...this.getStatus(), error });

    this.retryDelayMs = Math.min(
      this.retryDelayMs * 2,
      this.maxRetryDelayMs
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.state !== PortForwardState.STOPPED) {
        this.killProcess();
        this.start();
      }
    }, this.retryDelayMs);
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private killProcess() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  stop() {
    this.state = PortForwardState.STOPPED;
    this.clearConnectionTimeout();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.killProcess();
    this.emit('status-change', this.getStatus());
  }

  private lastError?: string;
}

export class PortForwardManager extends EventEmitter {
  private forwards: Map<string, PortForwardInstance> = new Map();
  private k8sClient?: K8sClient;

  setK8sClient(client: K8sClient) {
    this.k8sClient = client;
  }

  async startPortForward(config: Omit<PortForwardConfig, 'id'>): Promise<string> {
    const id = `${config.cluster}-${config.namespace}-${config.service}-${config.servicePort}-${config.localPort}`;
    
    if (this.forwards.has(id)) {
      throw new Error('Port forward already exists');
    }

    const instance = new PortForwardInstance({ ...config, id }, this.k8sClient);
    
    instance.on('status-change', (status) => {
      this.emit('update', status);
    });

    this.forwards.set(id, instance);
    await instance.start();

    return id;
  }

  stopPortForward(id: string): boolean {
    const instance = this.forwards.get(id);
    if (instance) {
      instance.stop();
      this.forwards.delete(id);
      return true;
    }
    return false;
  }

  getActiveForwards(): PortForwardStatus[] {
    return Array.from(this.forwards.values()).map((instance) => instance.getStatus());
  }

  getForward(id: string): PortForwardInstance | undefined {
    return this.forwards.get(id);
  }

  stopAll() {
    for (const instance of this.forwards.values()) {
      instance.stop();
    }
    this.forwards.clear();
  }
}

