import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import { EventEmitter } from "events";
import { K8sClient } from "./client";
import { logger } from "../logger";

export enum PortForwardState {
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  RECONNECTING = "RECONNECTING",
  FAILED = "FAILED",
  STOPPED = "STOPPED",
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
  private maxRetries = 0;
  private retryDelayMs = 1000;
  private maxRetryDelayMs = 30000;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly connectionTimeoutMs = 30000;
  private readonly healthCheckIntervalMs = 5000;
  private podName: string | null = null;

  constructor(
    private config: PortForwardConfig,
    private k8sClient?: K8sClient
  ) {
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
      nextRetryAt: this.reconnectTimeout
        ? new Date(Date.now() + this.retryDelayMs)
        : undefined,
    };
  }

  async start() {
    if (this.state === PortForwardState.STOPPED) {
      return;
    }

    if (this.state === PortForwardState.ACTIVE) {
      return;
    }

    this.state = PortForwardState.CONNECTING;
    this.emit("status-change", this.getStatus());

    this.connectionTimeout = setTimeout(() => {
      if (this.state === PortForwardState.CONNECTING) {
        logger.error(
          `[PortForward] Connection timeout for ${this.config.id}: port-forward did not establish within ${this.connectionTimeoutMs}ms`
        );
        this.handleError(
          "Connection timeout: port-forward did not establish within 30s"
        );
      }
    }, this.connectionTimeoutMs);

    await this.spawnProcess();
    this.startHealthCheck();
  }

  private async spawnProcess() {
    const args = [
      "port-forward",
      `service/${this.config.service}`,
      `${this.config.localPort}:${this.config.servicePort}`,
      "--namespace",
      this.config.namespace,
      "--context",
      this.config.cluster,
    ];

    logger.info(
      `[PortForward] Starting port-forward for service/${this.config.service} ${this.config.localPort}:${this.config.servicePort}`
    );

    this.process = spawn("kubectl", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      if (output.includes("Forwarding from")) {
        this.clearConnectionTimeout();
        this.clearReconnectTimeout();
        if (
          this.state === PortForwardState.CONNECTING ||
          this.state === PortForwardState.RECONNECTING
        ) {
          this.state = PortForwardState.ACTIVE;
          this.retryCount = 0;
          this.retryDelayMs = 1000;
          this.emit("status-change", this.getStatus());
        }
      }
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const error = data.toString();
      if (error.includes("error") || error.includes("Error")) {
        logger.error(
          `[PortForward] Error detected in kubectl stderr for ${this.config.id}:`,
          error.trim()
        );
        const userFriendlyError = this.extractUserFriendlyError(error);
        this.handleError(userFriendlyError);
      }
    });

    this.process.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        logger.error(
          `[PortForward] kubectl process exited with non-zero code ${code} for ${this.config.id}`
        );
        this.handleError(`Process exited with code ${code}`);
      } else if (signal) {
        logger.error(
          `[PortForward] kubectl process killed by signal ${signal} for ${this.config.id}`
        );
        this.handleError(`Process killed by signal ${signal}`);
      }
    });

    this.process.on("error", (error) => {
      logger.error(
        `[PortForward] Failed to spawn kubectl process for ${this.config.id}:`,
        error
      );
      logger.error(`[PortForward] Error details:`, {
        message: error.message,
        stack: error.stack,
      });
      this.handleError(`Failed to spawn kubectl: ${error.message}`);
    });
  }

  private async getPodName(): Promise<string | null> {
    if (this.podName) {
      return this.podName;
    }

    return new Promise((resolve) => {
      const args = [
        "get",
        "endpoints",
        this.config.service,
        "--namespace",
        this.config.namespace,
        "--context",
        this.config.cluster,
        "-o",
        "jsonpath={.subsets[0].addresses[0].targetRef.name}",
      ];

      const proc = spawn("kubectl", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output = "";
      proc.stdout?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const error = data.toString();
      });

      proc.on("exit", (code) => {
        if (code === 0 && output.trim()) {
          this.podName = output.trim();
          resolve(this.podName);
        } else {
          this.tryAlternativePodSelection(resolve);
        }
      });

      proc.on("error", (error) => {
        logger.error(
          `[PortForward] Error spawning kubectl for pod lookup:`,
          error
        );
        logger.error(`[PortForward] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
        this.tryAlternativePodSelection(resolve);
      });
    });
  }

  private tryAlternativePodSelection(resolve: (value: string | null) => void) {
    const args = [
      "get",
      "pods",
      "--namespace",
      this.config.namespace,
      "--context",
      this.config.cluster,
      "--field-selector",
      "status.phase=Running",
      "-o",
      "jsonpath={.items[0].metadata.name}",
    ];

    const proc = spawn("kubectl", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    proc.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const error = data.toString();
    });

    proc.on("exit", (code) => {
      if (code === 0 && output.trim()) {
        this.podName = output.trim();
        resolve(this.podName);
      } else {
        logger.error(
          `[PortForward] Alternative pod lookup failed (code: ${code}, output: "${output.trim()}")`
        );
        resolve(null);
      }
    });

    proc.on("error", (error) => {
      logger.error(
        `[PortForward] Error spawning kubectl for alternative pod lookup:`,
        error
      );
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
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
    });

    socket.once("timeout", () => {
      logger.error(
        `[PortForward] Health check timeout for ${this.config.id} on localhost:${this.config.localPort}`
      );
      socket.destroy();
      this.handleError(
        `Port forward failed: Connection timeout on localhost:${this.config.localPort}`
      );
    });

    socket.once("error", (error) => {
      logger.error(
        `[PortForward] Health check error for ${this.config.id} on localhost:${this.config.localPort}:`,
        error
      );
      socket.destroy();
      this.handleError(
        `Port forward failed: Connection refused on localhost:${this.config.localPort}`
      );
    });

    socket.connect(this.config.localPort, "localhost");
  }

  private extractUserFriendlyError(error: string): string {
    const errorStr = error.trim();

    if (errorStr.includes("connection refused")) {
      return `Port forward failed: Connection refused. The service may not be listening on port ${this.config.servicePort}.`;
    }

    if (errorStr.includes("lost connection to pod")) {
      return `Port forward failed: Lost connection to pod.`;
    }

    if (errorStr.includes("port-forward")) {
      const match = errorStr.match(/error forwarding port (\d+) -> (\d+)/);
      if (match) {
        return `Port forward failed: Unable to forward port ${match[1]} to ${match[2]}.`;
      }
    }

    if (errorStr.includes("No pod found")) {
      return `Port forward failed: No pod found for service ${this.config.service}.`;
    }

    const lines = errorStr.split("\n");
    const firstLine = lines[0] || errorStr;

    if (firstLine.length > 200) {
      return `Port forward failed: ${firstLine.substring(0, 200)}...`;
    }

    return `Port forward failed: ${firstLine}`;
  }

  private handleError(error: string) {
    logger.error(`[PortForward] Handling error for ${this.config.id}:`, error);

    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    this.lastError = error;

    if (this.state === PortForwardState.STOPPED) {
      return;
    }

    this.state = PortForwardState.FAILED;
    this.emit("status-change", { ...this.getStatus(), error });
    this.emit("failed");
    this.stop();
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private killProcess() {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  stop() {
    this.state = PortForwardState.STOPPED;
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.killProcess();
    this.emit("status-change", this.getStatus());
  }

  private lastError?: string;
}

export class PortForwardManager extends EventEmitter {
  private forwards: Map<string, PortForwardInstance> = new Map();
  private k8sClient?: K8sClient;

  setK8sClient(client: K8sClient) {
    this.k8sClient = client;
  }

  async startPortForward(
    config: Omit<PortForwardConfig, "id">
  ): Promise<string> {
    const id = `${config.cluster}-${config.namespace}-${config.service}-${config.servicePort}-${config.localPort}`;

    if (this.forwards.has(id)) {
      logger.error(`[PortForwardManager] Port forward ${id} already exists`);
      throw new Error("Port forward already exists");
    }

    const instance = new PortForwardInstance({ ...config, id }, this.k8sClient);

    instance.on("status-change", (status) => {
      this.emit("update", status);
    });

    instance.on("failed", () => {
      logger.error(
        `[PortForwardManager] Port forward ${id} failed, removing from manager`
      );
      this.forwards.delete(id);
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
    return Array.from(this.forwards.values()).map((instance) =>
      instance.getStatus()
    );
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
