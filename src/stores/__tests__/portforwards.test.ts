import { renderHook, act } from "@testing-library/react";
import { usePortForwardStore } from "../portforwards";
import {
  ClusterInfo,
  ServiceInfo,
  PortForwardStatus,
  PortForwardState,
} from "../../types/electron";

describe("usePortForwardStore", () => {
  beforeEach(() => {
    usePortForwardStore.setState({
      clusters: [],
      selectedCluster: null,
      namespaces: [],
      configuredNamespaces: {},
      portOverrides: {},
      services: {},
      activeForwards: [],
      loading: false,
      error: null,
    });
  });

  describe("setClusters", () => {
    it("should set clusters", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const clusters: ClusterInfo[] = [
        {
          name: "test-cluster",
          context: "test-context",
          server: "https://test.com",
        },
      ];

      act(() => {
        result.current.setClusters(clusters);
      });

      expect(result.current.clusters).toEqual(clusters);
    });
  });

  describe("setSelectedCluster", () => {
    it("should set selected cluster", () => {
      const { result } = renderHook(() => usePortForwardStore());

      act(() => {
        result.current.setSelectedCluster("test-context");
      });

      expect(result.current.selectedCluster).toBe("test-context");
    });

    it("should allow setting cluster to null", () => {
      const { result } = renderHook(() => usePortForwardStore());

      act(() => {
        result.current.setSelectedCluster("test-context");
        result.current.setSelectedCluster(null);
      });

      expect(result.current.selectedCluster).toBeNull();
    });
  });

  describe("setNamespaces", () => {
    it("should set namespaces", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const namespaces = ["default", "kube-system"];

      act(() => {
        result.current.setNamespaces(namespaces);
      });

      expect(result.current.namespaces).toEqual(namespaces);
    });
  });

  describe("addNamespace", () => {
    it("should add namespace to configured namespaces", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const cluster = "test-cluster";
      const namespace = "default";

      act(() => {
        result.current.addNamespace(cluster, namespace);
      });

      expect(result.current.configuredNamespaces[cluster]).toContain(namespace);
    });

    it("should not add duplicate namespaces", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const cluster = "test-cluster";
      const namespace = "default";

      act(() => {
        result.current.addNamespace(cluster, namespace);
        result.current.addNamespace(cluster, namespace);
      });

      expect(
        result.current.configuredNamespaces[cluster].filter(
          (ns) => ns === namespace
        ).length
      ).toBe(1);
    });
  });

  describe("removeNamespace", () => {
    it("should remove namespace from configured namespaces", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const cluster = "test-cluster";
      const namespace = "default";

      act(() => {
        result.current.addNamespace(cluster, namespace);
        result.current.removeNamespace(cluster, namespace);
      });

      expect(result.current.configuredNamespaces[cluster]).not.toContain(
        namespace
      );
    });

    it("should handle removing non-existent namespace gracefully", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const cluster = "test-cluster";
      const namespace = "default";

      act(() => {
        result.current.removeNamespace(cluster, namespace);
      });

      expect(result.current.configuredNamespaces[cluster] || []).not.toContain(
        namespace
      );
    });
  });

  describe("setPortOverride", () => {
    it("should set port override", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const key = "test-key";
      const port = 8080;

      act(() => {
        result.current.setPortOverride(key, port);
      });

      expect(result.current.portOverrides[key]).toBe(port);
    });

    it("should update existing port override", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const key = "test-key";

      act(() => {
        result.current.setPortOverride(key, 8080);
        result.current.setPortOverride(key, 9090);
      });

      expect(result.current.portOverrides[key]).toBe(9090);
    });
  });

  describe("getPortOverride", () => {
    it("should get port override", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const key = "test-key";
      const port = 8080;

      act(() => {
        result.current.setPortOverride(key, port);
      });

      expect(result.current.getPortOverride(key)).toBe(port);
    });

    it("should return undefined for non-existent override", () => {
      const { result } = renderHook(() => usePortForwardStore());

      expect(result.current.getPortOverride("non-existent")).toBeUndefined();
    });
  });

  describe("setServices", () => {
    it("should set services for cluster and namespace", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const cluster = "test-cluster";
      const namespace = "default";
      const services: ServiceInfo[] = [
        {
          name: "test-service",
          namespace: "default",
          ports: [
            { name: "http", port: 80, targetPort: 8080, protocol: "TCP" },
          ],
        },
      ];

      act(() => {
        result.current.setServices(cluster, namespace, services);
      });

      expect(result.current.services[`${cluster}:${namespace}`]).toEqual(
        services
      );
    });
  });

  describe("setActiveForwards", () => {
    it("should set active forwards", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const forwards: PortForwardStatus[] = [
        {
          id: "test-id",
          cluster: "test-cluster",
          namespace: "default",
          service: "test-service",
          servicePort: 80,
          localPort: 8080,
          state: PortForwardState.ACTIVE,
          retryCount: 0,
        },
      ];

      act(() => {
        result.current.setActiveForwards(forwards);
      });

      expect(result.current.activeForwards).toEqual(forwards);
    });
  });

  describe("updateForward", () => {
    it("should update existing forward", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const forward: PortForwardStatus = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        retryCount: 0,
      };

      act(() => {
        result.current.setActiveForwards([forward]);
        result.current.updateForward({
          ...forward,
          state: PortForwardState.FAILED,
        });
      });

      expect(result.current.activeForwards[0].state).toBe(
        PortForwardState.FAILED
      );
    });

    it("should add new forward if not exists", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const forward: PortForwardStatus = {
        id: "test-id",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        retryCount: 0,
      };

      act(() => {
        result.current.updateForward(forward);
      });

      expect(result.current.activeForwards).toHaveLength(1);
      expect(result.current.activeForwards[0]).toEqual(forward);
    });
  });

  describe("setLoading", () => {
    it("should set loading state", () => {
      const { result } = renderHook(() => usePortForwardStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => usePortForwardStore());
      const error = "Test error";

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);
    });

    it("should clear error when set to null", () => {
      const { result } = renderHook(() => usePortForwardStore());

      act(() => {
        result.current.setError("Test error");
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("loadConfig", () => {
    it("should load config from electron API", async () => {
      const mockConfig = {
        configuredNamespaces: { "test-cluster": ["default"] },
        portOverrides: { "test-key": 8080 },
      };

      (window.electronAPI?.loadConfig as jest.Mock).mockResolvedValue(
        mockConfig
      );

      const { result } = renderHook(() => usePortForwardStore());

      await act(async () => {
        await result.current.loadConfig();
      });

      expect(result.current.configuredNamespaces).toEqual(
        mockConfig.configuredNamespaces
      );
      expect(result.current.portOverrides).toEqual(mockConfig.portOverrides);
    });

    it("should handle load config error gracefully", async () => {
      (window.electronAPI?.loadConfig as jest.Mock).mockRejectedValue(
        new Error("Load failed")
      );

      const { result } = renderHook(() => usePortForwardStore());
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await act(async () => {
        await result.current.loadConfig();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("saveConfig", () => {
    it("should save config to electron API", async () => {
      const { result } = renderHook(() => usePortForwardStore());

      act(() => {
        result.current.addNamespace("test-cluster", "default");
        result.current.setPortOverride("test-key", 8080);
      });

      await act(async () => {
        await result.current.saveConfig();
      });

      expect(window.electronAPI?.saveConfig).toHaveBeenCalledWith({
        configuredNamespaces: { "test-cluster": ["default"] },
        portOverrides: { "test-key": 8080 },
        selectedServices: {},
        groups: [],
      });
    });

    it("should handle save config error gracefully", async () => {
      (window.electronAPI?.saveConfig as jest.Mock).mockRejectedValue(
        new Error("Save failed")
      );

      const { result } = renderHook(() => usePortForwardStore());
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      act(() => {
        result.current.addNamespace("test-cluster", "default");
      });

      await act(async () => {
        await result.current.saveConfig();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
