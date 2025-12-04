import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { EventEmitter } from 'events';
import { K8sClient } from './client';
import { logger } from '../logger';

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
      logger.info(`[PortForward] Cannot start port-forward ${this.config.id}: already stopped`);
      return;
    }

    logger.info(`[PortForward] Starting port-forward ${this.config.id}`, {
      cluster: this.config.cluster,
      namespace: this.config.namespace,
      service: this.config.service,
      servicePort: this.config.servicePort,
      localPort: this.config.localPort,
    });

    this.state = PortForwardState.CONNECTING;
    this.emit('status-change', this.getStatus());

    this.connectionTimeout = setTimeout(() => {
      if (this.state === PortForwardState.CONNECTING) {
        logger.error(`[PortForward] Connection timeout for ${this.config.id}: port-forward did not establish within ${this.connectionTimeoutMs}ms`);
        this.handleError('Connection timeout: port-forward did not establish within 30s');
      }
    }, this.connectionTimeoutMs);

    await this.spawnProcess();
    this.startHealthCheck();
  }

  private async spawnProcess() {
    logger.info(`[PortForward] Getting pod name for service ${this.config.service} in namespace ${this.config.namespace}`);
    const podName = await this.getPodName();
    
    if (!podName) {
      logger.error(`[PortForward] No pod found for service ${this.config.service} in namespace ${this.config.namespace}, cluster ${this.config.cluster}`);
      this.handleError('No pod found for service');
      return;
    }

    logger.info(`[PortForward] Found pod: ${podName} for service ${this.config.service}`);

    const args = [
      'port-forward',
      `pod/${podName}`,
      `${this.config.localPort}:${this.config.servicePort}`,
      '--namespace',
      this.config.namespace,
      '--context',
      this.config.cluster,
    ];

    logger.info(`[PortForward] Spawning kubectl process with args:`, args.join(' '));

    this.process = spawn('kubectl', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    logger.info(`[PortForward] kubectl process spawned with PID: ${this.process.pid}`);

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      logger.info(`[PortForward] kubectl stdout for ${this.config.id}:`, output.trim());
      if (output.includes('Forwarding from')) {
        logger.info(`[PortForward] Port-forward ${this.config.id} established successfully`);
        this.clearConnectionTimeout();
        if (this.state === PortForwardState.CONNECTING || this.state === PortForwardState.RECONNECTING) {
          this.state = PortForwardState.ACTIVE;
          this.retryCount = 0;
          this.retryDelayMs = 1000;
          logger.info(`[PortForward] Port-forward ${this.config.id} is now ACTIVE`);
          this.emit('status-change', this.getStatus());
        }
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      logger.info(`[PortForward] kubectl stderr for ${this.config.id}:`, error.trim());
      if (error.includes('error') || error.includes('Error')) {
        logger.error(`[PortForward] Error detected in kubectl stderr for ${this.config.id}:`, error.trim());
        this.handleError(error);
      }
    });

    this.process.on('exit', (code, signal) => {
      logger.info(`[PortForward] kubectl process exited for ${this.config.id}`, { code, signal });
      if (code !== 0 && code !== null) {
        logger.error(`[PortForward] kubectl process exited with non-zero code ${code} for ${this.config.id}`);
        this.handleError(`Process exited with code ${code}`);
      } else if (signal) {
        logger.error(`[PortForward] kubectl process killed by signal ${signal} for ${this.config.id}`);
        this.handleError(`Process killed by signal ${signal}`);
      } else {
        logger.info(`[PortForward] kubectl process exited normally for ${this.config.id}`);
      }
    });

    this.process.on('error', (error) => {
      logger.error(`[PortForward] Failed to spawn kubectl process for ${this.config.id}:`, error);
      logger.error(`[PortForward] Error details:`, {
        message: error.message,
        stack: error.stack,
      });
      this.handleError(`Failed to spawn kubectl: ${error.message}`);
    });
  }

  private async getPodName(): Promise<string | null> {
    if (this.podName) {
      logger.info(`[PortForward] Using cached pod name: ${this.podName}`);
      return this.podName;
    }

    logger.info(`[PortForward] Looking up pod name for service ${this.config.service} via endpoints`);

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

      logger.info(`[PortForward] Executing kubectl:`, args.join(' '));

      const proc = spawn('kubectl', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      proc.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        logger.info(`[PortForward] kubectl stderr during pod lookup:`, error.trim());
      });

      proc.on('exit', (code) => {
        logger.info(`[PortForward] kubectl get endpoints exited with code ${code}`);
        if (code === 0 && output.trim()) {
          this.podName = output.trim();
          logger.info(`[PortForward] Successfully found pod name via endpoints: ${this.podName}`);
          resolve(this.podName);
        } else {
          logger.info(`[PortForward] Failed to get pod via endpoints (code: ${code}, output: "${output.trim()}"), trying alternative method`);
          this.tryAlternativePodSelection(resolve);
        }
      });

      proc.on('error', (error) => {
        logger.error(`[PortForward] Error spawning kubectl for pod lookup:`, error);
        logger.error(`[PortForward] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
        this.tryAlternativePodSelection(resolve);
      });
    });
  }

  private tryAlternativePodSelection(resolve: (value: string | null) => void) {
    logger.info(`[PortForward] Trying alternative pod selection method: getting first running pod in namespace`);
    
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

    logger.info(`[PortForward] Executing kubectl:`, args.join(' '));

    const proc = spawn('kubectl', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      logger.info(`[PortForward] kubectl stderr during alternative pod lookup:`, error.trim());
    });

    proc.on('exit', (code) => {
      logger.info(`[PortForward] Alternative pod lookup exited with code ${code}`);
      if (code === 0 && output.trim()) {
        this.podName = output.trim();
        logger.info(`[PortForward] Successfully found pod via alternative method: ${this.podName}`);
        resolve(this.podName);
      } else {
        logger.error(`[PortForward] Alternative pod lookup failed (code: ${code}, output: "${output.trim()}")`);
        resolve(null);
      }
    });

    proc.on('error', (error) => {
      logger.error(`[PortForward] Error spawning kubectl for alternative pod lookup:`, error);
      logger.error(`[PortForward] Error details:`, {
        message: error.message,
        stack: error.stack,
      });
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
    logger.info(`[PortForward] Performing health check for ${this.config.id} on localhost:${this.config.localPort}`);
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      logger.info(`[PortForward] Health check passed for ${this.config.id}`);
      socket.destroy();
    });

    socket.once('timeout', () => {
      logger.error(`[PortForward] Health check timeout for ${this.config.id} on localhost:${this.config.localPort}`);
      socket.destroy();
      this.handleError('Health check failed: connection timeout');
    });

    socket.once('error', (error) => {
      logger.error(`[PortForward] Health check error for ${this.config.id} on localhost:${this.config.localPort}:`, error);
      socket.destroy();
      this.handleError('Health check failed: connection refused');
    });

    socket.connect(this.config.localPort, 'localhost');
  }

  private handleError(error: string) {
    logger.error(`[PortForward] Handling error for ${this.config.id}:`, error);
    logger.error(`[PortForward] Current state: ${this.state}, retry count: ${this.retryCount}/${this.maxRetries}`);
    
    this.clearConnectionTimeout();
    this.lastError = error;

    if (this.state === PortForwardState.STOPPED) {
      logger.info(`[PortForward] Port-forward ${this.config.id} is stopped, ignoring error`);
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      logger.error(`[PortForward] Max retries (${this.maxRetries}) reached for ${this.config.id}, marking as FAILED`);
      this.state = PortForwardState.FAILED;
      this.emit('status-change', { ...this.getStatus(), error });
      this.stop();
      return;
    }

    this.retryCount++;
    this.state = PortForwardState.RECONNECTING;
    logger.info(`[PortForward] Scheduling retry ${this.retryCount}/${this.maxRetries} for ${this.config.id} in ${this.retryDelayMs}ms`);
    this.emit('status-change', { ...this.getStatus(), error });

    this.retryDelayMs = Math.min(
      this.retryDelayMs * 2,
      this.maxRetryDelayMs
    );

    this.reconnectTimeout = setTimeout(() => {
      logger.info(`[PortForward] Retrying port-forward ${this.config.id} (attempt ${this.retryCount})`);
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
      logger.info(`[PortForward] Killing kubectl process (PID: ${this.process.pid}) for ${this.config.id}`);
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  stop() {
    logger.info(`[PortForward] Stopping port-forward ${this.config.id}`);
    this.state = PortForwardState.STOPPED;
    this.clearConnectionTimeout();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      logger.info(`[PortForward] Cleared reconnect timeout for ${this.config.id}`);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info(`[PortForward] Stopped health check for ${this.config.id}`);
    }

    this.killProcess();
    logger.info(`[PortForward] Port-forward ${this.config.id} stopped`);
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
    
    logger.info(`[PortForwardManager] Starting port-forward with ID: ${id}`, config);
    
    if (this.forwards.has(id)) {
      logger.error(`[PortForwardManager] Port forward ${id} already exists`);
      throw new Error('Port forward already exists');
    }

    const instance = new PortForwardInstance({ ...config, id }, this.k8sClient);
    
    instance.on('status-change', (status) => {
      logger.info(`[PortForwardManager] Status change for ${id}:`, status.state);
      this.emit('update', status);
    });

    this.forwards.set(id, instance);
    logger.info(`[PortForwardManager] Registered port-forward ${id}, starting instance...`);
    await instance.start();
    logger.info(`[PortForwardManager] Port-forward ${id} start initiated`);

    return id;
  }

  stopPortForward(id: string): boolean {
    logger.info(`[PortForwardManager] Stopping port-forward: ${id}`);
    const instance = this.forwards.get(id);
    if (instance) {
      instance.stop();
      this.forwards.delete(id);
      logger.info(`[PortForwardManager] Port-forward ${id} stopped and removed`);
      return true;
    }
    logger.info(`[PortForwardManager] Port-forward ${id} not found`);
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

