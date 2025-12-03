import { IpcMain } from 'electron';
import { K8sClient } from './client';
import { getClusters } from './clusters';
import { getNamespaces, getServices } from './services';
import { PortForwardManager } from './portforward';
import { loadConfig, saveConfig, AppConfig } from '../config';

let k8sClient: K8sClient | null = null;

function getClient(): K8sClient {
  if (!k8sClient) {
    k8sClient = new K8sClient();
  }
  return k8sClient;
}

export function setupK8sHandlers(ipcMain: IpcMain, portForwardManager: PortForwardManager) {
  ipcMain.handle('get-clusters', async () => {
    try {
      const client = getClient();
      return await getClusters(client);
    } catch (error) {
      console.error('Error getting clusters:', error);
      throw error;
    }
  });

  ipcMain.handle('get-namespaces', async (_event, cluster: string) => {
    try {
      const client = getClient();
      return await getNamespaces(client, cluster);
    } catch (error) {
      console.error('Error getting namespaces:', error);
      throw error;
    }
  });

  ipcMain.handle('get-services', async (_event, cluster: string, namespace: string) => {
    try {
      const client = getClient();
      return await getServices(client, cluster, namespace);
    } catch (error) {
      console.error('Error getting services:', error);
      throw error;
    }
  });

  ipcMain.handle('start-port-forward', async (_event, config: {
    cluster: string;
    namespace: string;
    service: string;
    servicePort: number;
    localPort: number;
  }) => {
    try {
      return await portForwardManager.startPortForward(config);
    } catch (error) {
      console.error('Error starting port forward:', error);
      throw error;
    }
  });

  ipcMain.handle('stop-port-forward', async (_event, id: string) => {
    try {
      return portForwardManager.stopPortForward(id);
    } catch (error) {
      console.error('Error stopping port forward:', error);
      throw error;
    }
  });

  ipcMain.handle('get-active-forwards', async () => {
    try {
      return portForwardManager.getActiveForwards();
    } catch (error) {
      console.error('Error getting active forwards:', error);
      throw error;
    }
  });

  ipcMain.handle('load-config', async () => {
    try {
      return loadConfig();
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  });

  ipcMain.handle('save-config', async (_event, config: AppConfig) => {
    try {
      saveConfig(config);
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  });

  portForwardManager.on('update', (status) => {
    const windows = require('electron').BrowserWindow.getAllWindows();
    windows.forEach((window: Electron.BrowserWindow) => {
      window.webContents.send('port-forward-update', status);
    });
  });
}
