import {
  PortForwardInstance,
  PortForwardManager,
  PortForwardState,
} from "../portforward";
import { K8sClient } from "../client";
import { spawn, ChildProcess } from "child_process";
import * as net from "net";

jest.mock("child_process");
jest.mock("net");

describe("PortForwardInstance", () => {
  let mockProcess: jest.Mocked<ChildProcess>;
  let mockK8sClient: jest.Mocked<K8sClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockProcess = {
      stdout: {
        on: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn(),
      kill: jest.fn(),
    } as any;

    mockK8sClient = {} as any;

    (spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create instance with config", () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);

      expect(instance.getId()).toBe("test-id");
    });
  });

  describe("getStatus", () => {
    it("should return current status", () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);
      const status = instance.getStatus();

      expect(status).toMatchObject({
        ...config,
        state: PortForwardState.CONNECTING,
        retryCount: 0,
      });
    });
  });

  describe("start", () => {
    it("should spawn kubectl process", async () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);

      jest.spyOn(instance as any, "getPodName").mockResolvedValue("test-pod");
      jest.spyOn(instance as any, "startHealthCheck").mockImplementation();

      await instance.start();

      expect((instance as any).getPodName).toHaveBeenCalled();
    });

    it("should not start if already stopped", async () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);
      instance.stop();

      await instance.start();

      expect(spawn).not.toHaveBeenCalled();
    });

    it("should transition to ACTIVE when forwarding message received", async () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);
      const statusChangeSpy = jest.fn();
      instance.on("status-change", statusChangeSpy);

      jest.spyOn(instance as any, "getPodName").mockResolvedValue("test-pod");
      jest.spyOn(instance as any, "spawnProcess").mockResolvedValue(undefined);
      jest.spyOn(instance as any, "startHealthCheck").mockImplementation();
      (instance as any).process = mockProcess;

      await instance.start();

      const stdoutHandler = (
        mockProcess.stdout!.on as jest.Mock
      ).mock.calls.find((call) => call[0] === "data")?.[1];

      if (stdoutHandler) {
        stdoutHandler(Buffer.from("Forwarding from"));
      }

      expect(statusChangeSpy).toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should stop process and clean up", () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);
      jest.spyOn(instance as any, "getPodName").mockResolvedValue("test-pod");
      jest.spyOn(instance as any, "spawnProcess").mockResolvedValue(undefined);
      jest.spyOn(instance as any, "startHealthCheck").mockImplementation();
      (instance as any).process = mockProcess;

      instance.stop();

      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
      const status = instance.getStatus();
      expect(status.state).toBe(PortForwardState.STOPPED);
    });
  });

  describe("getPodName", () => {
    it("should get pod name from endpoints", async () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);

      const endpointProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("test-pod"));
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
      } as any;

      (spawn as jest.Mock).mockReturnValueOnce(endpointProcess);

      const podName = await (instance as any).getPodName();

      expect(podName).toBe("test-pod");
    });

    it("should try alternative pod selection if endpoints fail", async () => {
      const config = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const instance = new PortForwardInstance(config, mockK8sClient);

      const endpointProcess = {
        stdout: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === "exit") {
            callback(1);
          }
        }),
      } as any;

      const podProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("alternative-pod"));
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
      } as any;

      (spawn as jest.Mock)
        .mockReturnValueOnce(endpointProcess)
        .mockReturnValueOnce(podProcess);

      const podName = await (instance as any).getPodName();

      expect(podName).toBe("alternative-pod");
    });
  });
});

describe("PortForwardManager", () => {
  let manager: PortForwardManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new PortForwardManager();
  });

  describe("startPortForward", () => {
    it("should start port forward and return id", async () => {
      const config = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const startSpy = jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      const id = await manager.startPortForward(config);

      expect(id).toBe("test-cluster-default-test-service-80-8080");
      expect(startSpy).toHaveBeenCalled();
      const forwards = manager.getActiveForwards();
      expect(forwards).toHaveLength(1);
    });

    it("should throw error if forward already exists", async () => {
      const config = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      await manager.startPortForward(config);

      await expect(manager.startPortForward(config)).rejects.toThrow(
        "Port forward already exists"
      );
    });

    it("should emit update events", async () => {
      const config = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      const updateSpy = jest.fn();
      manager.on("update", updateSpy);

      jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      await manager.startPortForward(config);

      const instance = manager.getForward(
        "test-cluster-default-test-service-80-8080"
      );
      expect(instance).toBeDefined();
      if (instance) {
        const statusChangeHandler = (instance as any).listeners(
          "status-change"
        )[0];
        if (statusChangeHandler) {
          statusChangeHandler(instance.getStatus());
          expect(updateSpy).toHaveBeenCalled();
        }
      }
    });
  });

  describe("stopPortForward", () => {
    it("should stop and remove forward", async () => {
      const config = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest.spyOn(PortForwardInstance.prototype, "stop").mockImplementation();
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      const id = await manager.startPortForward(config);
      const result = manager.stopPortForward(id);

      expect(result).toBe(true);
      expect(manager.getActiveForwards()).toHaveLength(0);
    });

    it("should return false if forward does not exist", () => {
      const result = manager.stopPortForward("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("getActiveForwards", () => {
    it("should return empty array when no forwards", () => {
      expect(manager.getActiveForwards()).toEqual([]);
    });

    it("should return all active forwards", async () => {
      const config = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };

      jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      await manager.startPortForward(config);

      const forwards = manager.getActiveForwards();
      expect(forwards).toHaveLength(1);
      expect(forwards[0]).toMatchObject({
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      });
    });
  });

  describe("stopAll", () => {
    it("should stop all forwards", async () => {
      const config1 = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      };
      const config2 = {
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service2",
        servicePort: 80,
        localPort: 8081,
      };

      jest
        .spyOn(PortForwardInstance.prototype, "start")
        .mockResolvedValue(undefined);
      jest.spyOn(PortForwardInstance.prototype, "stop").mockImplementation();
      jest
        .spyOn(PortForwardInstance.prototype, "getPodName")
        .mockResolvedValue("test-pod");
      jest
        .spyOn(PortForwardInstance.prototype, "spawnProcess")
        .mockResolvedValue(undefined);
      jest
        .spyOn(PortForwardInstance.prototype, "startHealthCheck")
        .mockImplementation();

      await manager.startPortForward(config1);
      await manager.startPortForward(config2);

      manager.stopAll();

      expect(manager.getActiveForwards()).toHaveLength(0);
    });
  });
});
