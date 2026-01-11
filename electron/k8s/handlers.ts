import { IpcMain, shell, dialog, BrowserWindow } from "electron";
import { K8sClient } from "./client";
import { getClusters } from "./clusters";
import { getNamespaces, getServices } from "./services";
import { PortForwardManager } from "./portforward";
import { getProcessUsingPort, killProcess } from "./port-utils";
import {
  loadConfig,
  saveConfig,
  resetConfig,
  exportConfig,
  importConfig,
  AppConfig,
} from "../config";
import { logger } from "../logger";
import fs from "fs";

let k8sClient: K8sClient | null = null;

function getClient(): K8sClient {
  if (!k8sClient) {
    k8sClient = new K8sClient();
  }
  return k8sClient;
}

export function setupK8sHandlers(
  ipcMain: IpcMain,
  portForwardManager: PortForwardManager
) {
  ipcMain.handle("get-clusters", async () => {
    try {
      const client = getClient();
      return await getClusters(client);
    } catch (error) {
      logger.error("Error getting clusters:", error);
      throw error;
    }
  });

  ipcMain.handle("get-namespaces", async (_event, cluster: string) => {
    try {
      const client = getClient();
      const namespaces = await getNamespaces(client, cluster);
      return namespaces;
    } catch (error) {
      logger.error(
        `[IPC] Error getting namespaces for cluster ${cluster}:`,
        error
      );
      if (error instanceof Error) {
        logger.error(`[IPC] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  });

  ipcMain.handle(
    "get-services",
    async (_event, cluster: string, namespace: string) => {
      try {
        const client = getClient();
        const services = await getServices(client, cluster, namespace);
        return services;
      } catch (error) {
        logger.error(
          `[IPC] Error getting services for cluster ${cluster}, namespace ${namespace}:`,
          error
        );
        if (error instanceof Error) {
          logger.error(`[IPC] Error details:`, {
            message: error.message,
            stack: error.stack,
          });
        }
        throw error;
      }
    }
  );

  ipcMain.handle(
    "start-port-forward",
    async (
      _event,
      config: {
        cluster: string;
        namespace: string;
        service: string;
        servicePort: number;
        localPort: number;
      }
    ) => {
      try {
        const id = await portForwardManager.startPortForward(config);
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
    }
  );

  ipcMain.handle("stop-port-forward", async (_event, id: string) => {
    try {
      return portForwardManager.stopPortForward(id);
    } catch (error) {
      logger.error("Error stopping port forward:", error);
      throw error;
    }
  });

  ipcMain.handle("get-active-forwards", async () => {
    try {
      return portForwardManager.getActiveForwards();
    } catch (error) {
      logger.error("Error getting active forwards:", error);
      throw error;
    }
  });

  ipcMain.handle("load-config", async () => {
    try {
      return loadConfig();
    } catch (error) {
      logger.error("Error loading config:", error);
      throw error;
    }
  });

  ipcMain.handle("save-config", async (_event, config: AppConfig) => {
    try {
      saveConfig(config);
      return true;
    } catch (error) {
      logger.error("Error saving config:", error);
      throw error;
    }
  });

  ipcMain.handle("open-in-browser", async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error("Error opening browser:", error);
      throw error;
    }
  });

  ipcMain.handle("reset-config", async () => {
    try {
      resetConfig();
      return true;
    } catch (error) {
      logger.error("Error resetting config:", error);
      throw error;
    }
  });

  ipcMain.handle("export-config", async () => {
    try {
      return exportConfig();
    } catch (error) {
      logger.error("Error exporting config:", error);
      throw error;
    }
  });

  ipcMain.handle("import-config", async (_event, config: AppConfig) => {
    try {
      importConfig(config);
      return true;
    } catch (error) {
      logger.error("Error importing config:", error);
      throw error;
    }
  });

  ipcMain.handle("export-config-to-file", async () => {
    try {
      const config = exportConfig();
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows.length > 0 ? windows[0] : null;

      if (!mainWindow) {
        throw new Error("No window available");
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export State",
        defaultPath: "porter-config.json",
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      fs.writeFileSync(
        result.filePath,
        JSON.stringify(config, null, 2),
        "utf-8"
      );
      return { canceled: false, filePath: result.filePath };
    } catch (error) {
      logger.error("Error exporting config to file:", error);
      throw error;
    }
  });

  ipcMain.handle("import-config-from-file", async () => {
    try {
      const windows = BrowserWindow.getAllWindows();
      const mainWindow = windows.length > 0 ? windows[0] : null;

      if (!mainWindow) {
        throw new Error("No window available");
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Import State",
        filters: [
          { name: "JSON Files", extensions: ["json"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const config = JSON.parse(fileContent);
      importConfig(config);
      return { canceled: false, config };
    } catch (error) {
      logger.error("Error importing config from file:", error);
      throw error;
    }
  });

  portForwardManager.on("update", (status) => {
    const windows = require("electron").BrowserWindow.getAllWindows();
    windows.forEach((window: Electron.BrowserWindow) => {
      window.webContents.send("port-forward-update", status);
    });
  });

  portForwardManager.on("port-occupied", (data) => {
    const windows = require("electron").BrowserWindow.getAllWindows();
    windows.forEach((window: Electron.BrowserWindow) => {
      window.webContents.send("port-occupied", data);
    });
  });

  ipcMain.handle("get-port-process", async (_event, port: number) => {
    try {
      return await getProcessUsingPort(port);
    } catch (error) {
      logger.error("Error getting port process:", error);
      throw error;
    }
  });

  ipcMain.handle("kill-port-process", async (_event, port: number) => {
    try {
      const processInfo = await getProcessUsingPort(port);
      if (!processInfo) {
        throw new Error(`No process found using port ${port}`);
      }
      await killProcess(processInfo.pid);
      return true;
    } catch (error) {
      logger.error("Error killing port process:", error);
      throw error;
    }
  });

  ipcMain.handle("respond-port-occupied", async (_event, forwardId: string, shouldKill: boolean) => {
    try {
      portForwardManager.respondToPortOccupied(forwardId, shouldKill);
      return true;
    } catch (error) {
      logger.error("Error responding to port occupied:", error);
      throw error;
    }
  });
}
