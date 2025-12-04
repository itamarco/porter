import fs from "fs";
import { app, BrowserWindow, ipcMain } from "electron";
import os from "os";
import path from "path";
import { logger } from "./logger";
import { setupK8sHandlers } from "./k8s/handlers";
import { PortForwardManager } from "./k8s/portforward";
import { K8sClient } from "./k8s/client";

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
    pluginCandidates.push(path.join(__dirname, "..", "electron", "resources", "bin", archDir));
    pluginCandidates.push(path.join(__dirname, "..", "resources", "bin", archDir));
  }

  const currentPath = process.env.PATH || "";
  const pluginPaths = pluginCandidates.filter((dir) => fs.existsSync(dir));
  const pathsToAdd = [...pluginPaths, ...additionalPaths].filter((p) => p && !currentPath.includes(p));

  if (pathsToAdd.length > 0) {
    process.env.PATH = [...pathsToAdd, currentPath].filter(Boolean).join(":");
  }
}

fixPath();

const portForwardManager = new PortForwardManager();
const k8sClient = new K8sClient();
portForwardManager.setK8sClient(k8sClient);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  logger.info("Preload path:", preloadPath);
  logger.info("Log file location:", logger.getLogPath());

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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
