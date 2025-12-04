import { IpcMain, shell } from 'electron';
import { K8sClient } from './client';
import { getClusters } from './clusters';
import { getNamespaces, getServices } from './services';
import { PortForwardManager } from './portforward';
import { loadConfig, saveConfig, AppConfig } from '../config';
import { logger } from '../logger';

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
      logger.error('Error getting clusters:', error);
      throw error;
    }
  });

  ipcMain.handle('get-namespaces', async (_event, cluster: string) => {
    logger.info(`[IPC] get-namespaces called with cluster: ${cluster}`);
    try {
      const client = getClient();
      const namespaces = await getNamespaces(client, cluster);
      logger.info(`[IPC] get-namespaces succeeded, returning ${namespaces.length} namespaces`);
      return namespaces;
    } catch (error) {
      logger.error(`[IPC] Error getting namespaces for cluster ${cluster}:`, error);
      if (error instanceof Error) {
        logger.error(`[IPC] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  });

  ipcMain.handle('get-services', async (_event, cluster: string, namespace: string) => {
    logger.info(`[IPC] get-services called with cluster: ${cluster}, namespace: ${namespace}`);
    try {
      const client = getClient();
      const services = await getServices(client, cluster, namespace);
      logger.info(`[IPC] get-services succeeded, returning ${services.length} services`);
      return services;
    } catch (error) {
      logger.error(`[IPC] Error getting services for cluster ${cluster}, namespace ${namespace}:`, error);
      if (error instanceof Error) {
        logger.error(`[IPC] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
      }
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
    logger.info(`[IPC] start-port-forward called with config:`, config);
    try {
      const id = await portForwardManager.startPortForward(config);
      logger.info(`[IPC] start-port-forward succeeded, returned ID: ${id}`);
      return id;
    } catch (error) {
      logger.error(`[IPC] Error starting port forward:`, error);
      if (error instanceof Error) {
        logger.error(`[IPC] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  });

  ipcMain.handle('stop-port-forward', async (_event, id: string) => {
    try {
      return portForwardManager.stopPortForward(id);
    } catch (error) {
      logger.error('Error stopping port forward:', error);
      throw error;
    }
  });

  ipcMain.handle('get-active-forwards', async () => {
    try {
      return portForwardManager.getActiveForwards();
    } catch (error) {
      logger.error('Error getting active forwards:', error);
      throw error;
    }
  });

  ipcMain.handle('load-config', async () => {
    try {
      return loadConfig();
    } catch (error) {
      logger.error('Error loading config:', error);
      throw error;
    }
  });

  ipcMain.handle('save-config', async (_event, config: AppConfig) => {
    try {
      saveConfig(config);
      return true;
    } catch (error) {
      logger.error('Error saving config:', error);
      throw error;
    }
  });

  ipcMain.handle('open-in-browser', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error('Error opening browser:', error);
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
