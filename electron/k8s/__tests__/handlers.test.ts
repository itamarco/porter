import { IpcMain } from "electron";
import { setupK8sHandlers } from "../handlers";
import { PortForwardManager } from "../portforward";
import { K8sClient } from "../client";
import { getClusters } from "../clusters";
import { getNamespaces, getServices } from "../services";
import { loadConfig, saveConfig } from "../../config";
import { shell } from "electron";

jest.mock("../client");
jest.mock("../clusters");
jest.mock("../services");
jest.mock("../../config");
jest.mock("electron", () => ({
  shell: {
    openExternal: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(),
  },
}));

describe("setupK8sHandlers", () => {
  let mockIpcMain: jest.Mocked<IpcMain>;
  let mockPortForwardManager: jest.Mocked<PortForwardManager>;
  let mockBrowserWindow: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBrowserWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows.mockReturnValue([mockBrowserWindow]);

    mockIpcMain = {
      handle: jest.fn(),
    } as any;

    mockPortForwardManager = {
      startPortForward: jest.fn(),
      stopPortForward: jest.fn(),
      getActiveForwards: jest.fn(),
      on: jest.fn(),
    } as any;

    const mockK8sClientInstance = {} as K8sClient;
    (K8sClient as jest.Mock).mockImplementation(() => mockK8sClientInstance);
  });

  it("should register get-clusters handler", async () => {
    const mockClusters = [
      { name: "cluster1", context: "context1", server: "https://server1.com" },
    ];
    (getClusters as jest.Mock).mockResolvedValue(mockClusters);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "get-clusters"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!();
    expect(result).toEqual(mockClusters);
  });

  it("should register get-namespaces handler", async () => {
    const mockNamespaces = ["default", "kube-system"];
    (getNamespaces as jest.Mock).mockResolvedValue(mockNamespaces);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "get-namespaces"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, "test-cluster");
    expect(result).toEqual(mockNamespaces);
    expect(getNamespaces).toHaveBeenCalledWith(
      expect.anything(),
      "test-cluster"
    );
  });

  it("should register get-services handler", async () => {
    const mockServices = [
      {
        name: "test-service",
        namespace: "default",
        ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
      },
    ];
    (getServices as jest.Mock).mockResolvedValue(mockServices);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "get-services"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, "test-cluster", "default");
    expect(result).toEqual(mockServices);
    expect(getServices).toHaveBeenCalledWith(
      expect.anything(),
      "test-cluster",
      "default"
    );
  });

  it("should register start-port-forward handler", async () => {
    const config = {
      cluster: "test-cluster",
      namespace: "default",
      service: "test-service",
      servicePort: 80,
      localPort: 8080,
    };
    (mockPortForwardManager.startPortForward as jest.Mock).mockResolvedValue(
      "forward-id"
    );

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "start-port-forward"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, config);
    expect(result).toBe("forward-id");
    expect(mockPortForwardManager.startPortForward).toHaveBeenCalledWith(
      config
    );
  });

  it("should register stop-port-forward handler", async () => {
    (mockPortForwardManager.stopPortForward as jest.Mock).mockReturnValue(true);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "stop-port-forward"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, "forward-id");
    expect(result).toBe(true);
    expect(mockPortForwardManager.stopPortForward).toHaveBeenCalledWith(
      "forward-id"
    );
  });

  it("should register get-active-forwards handler", async () => {
    const mockForwards = [
      {
        id: "forward-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: "ACTIVE",
        retryCount: 0,
      },
    ];
    (mockPortForwardManager.getActiveForwards as jest.Mock).mockReturnValue(
      mockForwards
    );

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "get-active-forwards"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!();
    expect(result).toEqual(mockForwards);
  });

  it("should register load-config handler", async () => {
    const mockConfig = {
      configuredNamespaces: { cluster1: ["default"] },
      portOverrides: { key1: 8080 },
    };
    (loadConfig as jest.Mock).mockReturnValue(mockConfig);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "load-config"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!();
    expect(result).toEqual(mockConfig);
  });

  it("should register save-config handler", async () => {
    const config = {
      configuredNamespaces: { cluster1: ["default"] },
      portOverrides: { key1: 8080 },
    };
    (saveConfig as jest.Mock).mockReturnValue(undefined);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "save-config"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, config);
    expect(result).toBe(true);
    expect(saveConfig).toHaveBeenCalledWith(config);
  });

  it("should register open-in-browser handler", async () => {
    (shell.openExternal as jest.Mock).mockResolvedValue(undefined);

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "open-in-browser"
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler!(null, "http://localhost:8080");
    expect(result).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledWith("http://localhost:8080");
  });

  it("should set up port forward update listener", () => {
    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    expect(mockPortForwardManager.on).toHaveBeenCalledWith(
      "update",
      expect.any(Function)
    );

    const updateCallback = mockPortForwardManager.on.mock.calls.find(
      (call) => call[0] === "update"
    )?.[1];

    const status = {
      id: "forward-id",
      cluster: "test-cluster",
      namespace: "default",
      service: "test-service",
      servicePort: 80,
      localPort: 8080,
      state: "ACTIVE",
      retryCount: 0,
    };

    updateCallback!(status);

    expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
      "port-forward-update",
      status
    );
  });

  it("should handle errors in handlers", async () => {
    const error = new Error("Test error");
    (getClusters as jest.Mock).mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    setupK8sHandlers(mockIpcMain, mockPortForwardManager);

    const handler = mockIpcMain.handle.mock.calls.find(
      (call) => call[0] === "get-clusters"
    )?.[1];

    await expect(handler!()).rejects.toThrow("Test error");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
