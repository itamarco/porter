export enum PortForwardState {
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
  STOPPED = 'STOPPED',
}

export interface ClusterInfo {
  name: string;
  context: string;
  server: string;
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  ports: ServicePortInfo[];
}

export interface ServicePortInfo {
  name: string;
  port: number;
  targetPort: string | number;
  protocol: string;
}

export interface PortForwardConfig {
  cluster: string;
  namespace: string;
  service: string;
  servicePort: number;
  localPort: number;
}

export interface PortForwardStatus extends PortForwardConfig {
  id: string;
  state: PortForwardState;
  retryCount: number;
  error?: string;
  lastError?: string;
  nextRetryAt?: Date;
}

export interface AppConfig {
  configuredNamespaces: Record<string, string[]>;
}

export interface ElectronAPI {
  getClusters: () => Promise<ClusterInfo[]>;
  getNamespaces: (cluster: string) => Promise<string[]>;
  getServices: (cluster: string, namespace: string) => Promise<ServiceInfo[]>;
  startPortForward: (config: PortForwardConfig) => Promise<string>;
  stopPortForward: (id: string) => Promise<boolean>;
  getActiveForwards: () => Promise<PortForwardStatus[]>;
  loadConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  onPortForwardUpdate: (callback: (data: PortForwardStatus) => void) => void;
  removePortForwardListener: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

