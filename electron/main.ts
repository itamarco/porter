import fs from "fs";
import { app, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import os from "os";
import path from "path";
import { logger } from "./logger";
import { setupK8sHandlers } from "./k8s/handlers";
import { PortForwardManager } from "./k8s/portforward";
import { K8sClient } from "./k8s/client";
import { resetConfig, exportConfig, importConfig } from "./config";

app.setName("Porter");

function fixPath() {
  const homedir = os.homedir();
  const additionalPaths = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    path.join(homedir, "google-cloud-sdk", "bin"),
    "/usr/local/google-cloud-sdk/bin",
    path.join(homedir, "Downloads", "google-cloud-sdk", "bin"),
    path.join(homedir, ".local", "bin"),
    "/usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/bin",
  ];

  const pluginCandidates: string[] = [];
  if (process.platform === "darwin") {
    const archDir = process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
    pluginCandidates.push(path.join(process.resourcesPath, "bin", archDir));
    pluginCandidates.push(
      path.join(__dirname, "..", "electron", "resources", "bin", archDir)
    );
    pluginCandidates.push(
      path.join(__dirname, "..", "resources", "bin", archDir)
    );
  }

  const currentPath = process.env.PATH || "";
  const pluginPaths = pluginCandidates.filter((dir) => fs.existsSync(dir));
  const pathsToAdd = [...pluginPaths, ...additionalPaths].filter(
    (p) => p && !currentPath.includes(p)
  );

  if (pathsToAdd.length > 0) {
    process.env.PATH = [...pathsToAdd, currentPath].filter(Boolean).join(":");
  }
}

fixPath();

const portForwardManager = new PortForwardManager();
const k8sClient = new K8sClient();
portForwardManager.setK8sClient(k8sClient);

let mainWindow: BrowserWindow | null = null;

function createMenu() {
  const isMac = process.platform === "darwin";
  const appName = app.getName();

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "Config",
      submenu: [
        {
          label: "Reset State",
          click: async () => {
            if (mainWindow) {
              const result = await dialog.showMessageBox(mainWindow, {
                type: "warning",
                buttons: ["Cancel", "Reset"],
                defaultId: 0,
                cancelId: 0,
                title: "Reset State",
                message: "Are you sure you want to reset all state?",
                detail:
                  "This will delete all your configured namespaces, port overrides, selected services, and groups. This action cannot be undone.",
              });
              if (result.response === 1) {
                try {
                  resetConfig();
                  mainWindow.webContents.send("config-reset");
                  await dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "Reset Complete",
                    message: "State has been reset successfully.",
                  });
                } catch (error) {
                  logger.error("Error resetting config:", error);
                  await dialog.showMessageBox(mainWindow, {
                    type: "error",
                    title: "Error",
                    message: "Failed to reset state.",
                  });
                }
              }
            }
          },
        },
        {
          label: "Export State",
          click: async () => {
            if (mainWindow) {
              try {
                const config = exportConfig();
                const result = await dialog.showSaveDialog(mainWindow, {
                  title: "Export State",
                  defaultPath: "porter-config.json",
                  filters: [
                    { name: "JSON Files", extensions: ["json"] },
                    { name: "All Files", extensions: ["*"] },
                  ],
                });
                if (!result.canceled && result.filePath) {
                  fs.writeFileSync(
                    result.filePath,
                    JSON.stringify(config, null, 2),
                    "utf-8"
                  );
                  await dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "Export Complete",
                    message: "State has been exported successfully.",
                  });
                }
              } catch (error) {
                logger.error("Error exporting config:", error);
                await dialog.showMessageBox(mainWindow, {
                  type: "error",
                  title: "Error",
                  message: "Failed to export state.",
                });
              }
            }
          },
        },
        {
          label: "Import State",
          click: async () => {
            if (mainWindow) {
              try {
                const result = await dialog.showOpenDialog(mainWindow, {
                  title: "Import State",
                  filters: [
                    { name: "JSON Files", extensions: ["json"] },
                    { name: "All Files", extensions: ["*"] },
                  ],
                  properties: ["openFile"],
                });
                if (!result.canceled && result.filePaths.length > 0) {
                  const filePath = result.filePaths[0];
                  const fileContent = fs.readFileSync(filePath, "utf-8");
                  const config = JSON.parse(fileContent);
                  importConfig(config);
                  mainWindow.webContents.send("config-imported");
                  await dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "Import Complete",
                    message:
                      "State has been imported successfully. Please reload the application to see the changes.",
                  });
                }
              } catch (error) {
                logger.error("Error importing config:", error);
                await dialog.showMessageBox(mainWindow, {
                  type: "error",
                  title: "Error",
                  message:
                    "Failed to import state. Please ensure the file is valid JSON.",
                });
              }
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  let iconPath: string | undefined;
  if (process.platform === "darwin") {
    iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "..", "icon.icns")
      : path.join(__dirname, "..", "assets", "icon.icns");
  } else {
    iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "assets", "icon.png")
      : path.join(__dirname, "..", "assets", "icon.png");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    icon: iconPath && fs.existsSync(iconPath) ? iconPath : undefined,
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      if (
        message.includes("Autofill.enable") ||
        message.includes("Autofill.setAddresses")
      ) {
        event.preventDefault();
      }
    }
  );

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

setupK8sHandlers(ipcMain, portForwardManager);

ipcMain.handle("get-log-path", async () => {
  return logger.getLogPath();
});
