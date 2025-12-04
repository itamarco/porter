import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getClusters: () => ipcRenderer.invoke('get-clusters'),
  getNamespaces: (cluster: string) => ipcRenderer.invoke('get-namespaces', cluster),
  getServices: (cluster: string, namespace: string) =>
    ipcRenderer.invoke('get-services', cluster, namespace),
  startPortForward: (config: {
    cluster: string;
    namespace: string;
    service: string;
    servicePort: number;
    localPort: number;
  }) => ipcRenderer.invoke('start-port-forward', config),
  stopPortForward: (id: string) => ipcRenderer.invoke('stop-port-forward', id),
  getActiveForwards: () => ipcRenderer.invoke('get-active-forwards'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  openInBrowser: (url: string) => ipcRenderer.invoke('open-in-browser', url),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  onPortForwardUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('port-forward-update', (_event, data) => callback(data));
  },
  removePortForwardListener: () => {
    ipcRenderer.removeAllListeners('port-forward-update');
  },
});

