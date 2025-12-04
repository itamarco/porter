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

export interface Group {
  id: string;
  name: string;
  servicePorts: string[];
}

export interface AppConfig {
  configuredNamespaces: Record<string, string[]>;
  portOverrides: Record<string, number>;
  selectedServices: Record<string, string[]>;
  groups: Group[];
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
  openInBrowser: (url: string) => Promise<boolean>;
  onPortForwardUpdate: (callback: (data: PortForwardStatus) => void) => void;
  removePortForwardListener: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

