import log from "electron-log";

const mockLog = {
  transports: {
    file: {
      level: "info",
      getFile: jest.fn(() => ({ path: "/mock/log/path.log" })),
    },
    console: {
      level: "warn",
    },
  },
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock("electron-log", () => mockLog);

jest.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

describe("logger", () => {
  let logger: typeof import("../logger").logger;
  const originalEnv = process.env;
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "debug").mockImplementation();
    delete require.cache[require.resolve("../logger")];
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  });

  describe("info", () => {
    it("should call log.info", () => {
      logger = require("../logger").logger;
      logger.info("test message");
      expect(mockLog.info).toHaveBeenCalledWith("test message");
    });

    it("should handle multiple arguments", () => {
      logger = require("../logger").logger;
      logger.info("message", { key: "value" }, 123);
      expect(mockLog.info).toHaveBeenCalledWith(
        "message",
        { key: "value" },
        123
      );
    });

    it("should call log.info with all provided arguments", () => {
      logger = require("../logger").logger;
      logger.info("arg1", "arg2", { key: "value" });
      expect(mockLog.info).toHaveBeenCalledWith("arg1", "arg2", {
        key: "value",
      });
    });
  });

  describe("error", () => {
    it("should call log.error", () => {
      logger = require("../logger").logger;
      logger.error("error message");
      expect(mockLog.error).toHaveBeenCalledWith("error message");
    });

    it("should always call console.error", () => {
      logger = require("../logger").logger;
      logger.error("error message");
      expect(console.error).toHaveBeenCalledWith("error message");
    });

    it("should handle error objects", () => {
      logger = require("../logger").logger;
      const error = new Error("test error");
      logger.error(error);
      expect(mockLog.error).toHaveBeenCalledWith(error);
      expect(console.error).toHaveBeenCalledWith(error);
    });
  });

  describe("warn", () => {
    it("should call log.warn", () => {
      logger = require("../logger").logger;
      logger.warn("warning message");
      expect(mockLog.warn).toHaveBeenCalledWith("warning message");
    });

    it("should handle multiple arguments", () => {
      logger = require("../logger").logger;
      logger.warn("warning", { key: "value" });
      expect(mockLog.warn).toHaveBeenCalledWith("warning", { key: "value" });
    });
  });

  describe("debug", () => {
    it("should call log.debug", () => {
      logger = require("../logger").logger;
      logger.debug("debug message");
      expect(mockLog.debug).toHaveBeenCalledWith("debug message");
    });

    it("should handle multiple arguments", () => {
      logger = require("../logger").logger;
      logger.debug("debug", { key: "value" });
      expect(mockLog.debug).toHaveBeenCalledWith("debug", { key: "value" });
    });
  });

  describe("getLogPath", () => {
    it("should return log file path", () => {
      logger = require("../logger").logger;
      const path = logger.getLogPath();
      expect(path).toBe("/mock/log/path.log");
      expect(mockLog.transports.file.getFile).toHaveBeenCalled();
    });
  });
});
