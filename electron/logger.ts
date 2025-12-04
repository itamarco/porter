import log from "electron-log";

log.transports.file.level = "info";
log.transports.console.level = process.env.NODE_ENV === "development" ? "debug" : "warn";

const isDev = process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";

if (!isDev) {
  try {
    const { app } = require("electron");
    if (app && app.isPackaged) {
      log.transports.console.level = false;
    }
  } catch {
    log.transports.console.level = false;
  }
}

export const logger = {
  info: (...args: unknown[]) => {
    log.info(...args);
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    log.error(...args);
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    log.warn(...args);
    if (isDev) {
      console.warn(...args);
    }
  },
  debug: (...args: unknown[]) => {
    log.debug(...args);
    if (isDev) {
      console.debug(...args);
    }
  },
  getLogPath: () => log.transports.file.getFile().path,
};

