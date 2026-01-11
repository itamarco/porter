export enum PortForwardState {
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  RECONNECTING = "RECONNECTING",
  FAILED = "FAILED",
  STOPPED = "STOPPED",
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

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  assetUrl: string | null;
  releaseNotes: string | null;
}

export interface ProcessInfo {
  pid: number;
  port: number;
  processName: string;
  commandLine: string;
  forwardId?: string;
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
  resetConfig: () => Promise<boolean>;
  exportConfig: () => Promise<AppConfig>;
  importConfig: (config: AppConfig) => Promise<boolean>;
  exportConfigToFile: () => Promise<{ canceled: boolean; filePath?: string }>;
  importConfigFromFile: () => Promise<{
    canceled: boolean;
    config?: AppConfig;
  }>;
  openInBrowser: (url: string) => Promise<boolean>;
  getLogPath: () => Promise<string>;
  onPortForwardUpdate: (callback: (data: PortForwardStatus) => void) => void;
  onConfigReset: (callback: () => void) => void;
  onConfigImported: (callback: () => void) => void;
  removePortForwardListener: () => void;
  removeConfigListeners: () => void;
  checkForUpdates: () => Promise<UpdateInfo>;
  onUpdateStatus: (callback: (data: UpdateInfo) => void) => void;
  removeUpdateStatusListener: () => void;
  getPortProcess: (port: number) => Promise<ProcessInfo | null>;
  killPortProcess: (port: number) => Promise<boolean>;
  onPortOccupied: (callback: (data: ProcessInfo) => void) => void;
  removePortOccupiedListener: () => void;
  respondPortOccupied: (forwardId: string, shouldKill: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
