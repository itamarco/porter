import { contextBridge, ipcRenderer } from "electron";

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electronAPI", {
  getClusters: () => ipcRenderer.invoke("get-clusters"),
  getNamespaces: (cluster: string) =>
    ipcRenderer.invoke("get-namespaces", cluster),
  getServices: (cluster: string, namespace: string) =>
    ipcRenderer.invoke("get-services", cluster, namespace),
  startPortForward: (config: {
    cluster: string;
    namespace: string;
    service: string;
    servicePort: number;
    localPort: number;
  }) => ipcRenderer.invoke("start-port-forward", config),
  stopPortForward: (id: string) => ipcRenderer.invoke("stop-port-forward", id),
  getActiveForwards: () => ipcRenderer.invoke("get-active-forwards"),
  loadConfig: () => ipcRenderer.invoke("load-config"),
  saveConfig: (config: any) => ipcRenderer.invoke("save-config", config),
  resetConfig: () => ipcRenderer.invoke("reset-config"),
  exportConfig: () => ipcRenderer.invoke("export-config"),
  importConfig: (config: any) => ipcRenderer.invoke("import-config", config),
  exportConfigToFile: () => ipcRenderer.invoke("export-config-to-file"),
  importConfigFromFile: () => ipcRenderer.invoke("import-config-from-file"),
  openInBrowser: (url: string) => ipcRenderer.invoke("open-in-browser", url),
  getLogPath: () => ipcRenderer.invoke("get-log-path"),
  onPortForwardUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on("port-forward-update", (_event, data) => callback(data));
  },
  onConfigReset: (callback: () => void) => {
    ipcRenderer.on("config-reset", () => callback());
  },
  onConfigImported: (callback: () => void) => {
    ipcRenderer.on("config-imported", () => callback());
  },
  removePortForwardListener: () => {
    ipcRenderer.removeAllListeners("port-forward-update");
  },
  removeConfigListeners: () => {
    ipcRenderer.removeAllListeners("config-reset");
    ipcRenderer.removeAllListeners("config-imported");
  },
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  onUpdateStatus: (callback: (data: any) => void) => {
    ipcRenderer.on("update-status", (_event, data) => callback(data));
  },
  removeUpdateStatusListener: () => {
    ipcRenderer.removeAllListeners("update-status");
  },
});
