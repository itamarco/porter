import { renderHook, waitFor } from "@testing-library/react";
import { useK8s } from "../useK8s";
import { usePortForwardStore } from "../../stores/portforwards";
import {
  ClusterInfo,
  ServiceInfo,
  PortForwardStatus,
  PortForwardState,
} from "../../types/electron";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");

describe("useK8s", () => {
  const mockElectronAPI = createMockElectronAPI();

  beforeEach(() => {
    window.electronAPI = mockElectronAPI as any;
    jest.clearAllMocks();

    const mockStoreState = {
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      groups: [],
      activeForwards: [],
      setClusters: jest.fn(),
      setSelectedCluster: jest.fn(),
      setNamespaces: jest.fn(),
      setServices: jest.fn(),
      setActiveForwards: jest.fn(),
      updateForward: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      loadConfig: jest.fn().mockResolvedValue(undefined),
    };

    (usePortForwardStore as unknown as jest.Mock).mockReturnValue(
      mockStoreState
    );
    Object.defineProperty(usePortForwardStore, "getState", {
      value: jest.fn().mockReturnValue(mockStoreState),
      writable: true,
      configurable: true,
    });
  });

  describe("initialization", () => {
    it("should load clusters on mount", async () => {
      const mockClusters: ClusterInfo[] = [
        {
          name: "test-cluster",
          context: "test-context",
          server: "https://test.com",
        },
      ];
      (mockElectronAPI.getClusters as jest.Mock).mockResolvedValue(
        mockClusters
      );

      const mockSetClusters = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: mockSetClusters,
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: jest.fn(),
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      renderHook(() => useK8s());

      await waitFor(() => {
        expect(mockElectronAPI.getClusters).toHaveBeenCalled();
        expect(mockSetClusters).toHaveBeenCalledWith(mockClusters);
      });
    });

    it("should set up port forward listener on mount", () => {
      renderHook(() => useK8s());

      expect(mockElectronAPI.onPortForwardUpdate).toHaveBeenCalled();
    });

    it("should clean up port forward listener on unmount", () => {
      const { unmount } = renderHook(() => useK8s());

      unmount();

      expect(mockElectronAPI.removePortForwardListener).toHaveBeenCalled();
    });
  });

  describe("loadClusters", () => {
    it("should load and set clusters", async () => {
      const mockClusters: ClusterInfo[] = [
        {
          name: "test-cluster",
          context: "test-context",
          server: "https://test.com",
        },
      ];
      (mockElectronAPI.getClusters as jest.Mock).mockResolvedValue(
        mockClusters
      );

      const mockSetClusters = jest.fn();
      const mockSetLoading = jest.fn();
      const mockSetError = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: mockSetClusters,
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: jest.fn(),
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: mockSetLoading,
        setError: mockSetError,
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      const { result } = renderHook(() => useK8s());

      await waitFor(() => {
        expect(mockSetLoading).toHaveBeenCalledWith(true);
        expect(mockSetClusters).toHaveBeenCalledWith(mockClusters);
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });

    it("should handle errors when loading clusters", async () => {
      const error = new Error("Failed to load clusters");
      (mockElectronAPI.getClusters as jest.Mock).mockRejectedValue(error);

      const mockSetError = jest.fn();
      const mockSetLoading = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: jest.fn(),
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: jest.fn(),
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: mockSetLoading,
        setError: mockSetError,
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      renderHook(() => useK8s());

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith("Failed to load clusters");
        expect(mockSetLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("loadNamespaces", () => {
    it("should load and set namespaces for cluster", async () => {
      const mockNamespaces = ["default", "kube-system"];
      (mockElectronAPI.getNamespaces as jest.Mock).mockResolvedValue(
        mockNamespaces
      );

      const mockSetNamespaces = jest.fn();
      const mockSetLoading = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: jest.fn(),
        setSelectedCluster: jest.fn(),
        setNamespaces: mockSetNamespaces,
        setServices: jest.fn(),
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: mockSetLoading,
        setError: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      const { result } = renderHook(() => useK8s());

      const namespaces = await result.current.loadNamespaces("test-cluster");

      expect(mockElectronAPI.getNamespaces).toHaveBeenCalledWith(
        "test-cluster"
      );
      expect(mockSetNamespaces).toHaveBeenCalledWith(mockNamespaces);
      expect(namespaces).toEqual(mockNamespaces);
    });

    it("should return empty array when electron API is not available", async () => {
      window.electronAPI = undefined as any;

      const { result } = renderHook(() => useK8s());

      const namespaces = await result.current.loadNamespaces("test-cluster");

      expect(namespaces).toEqual([]);
    });
  });

  describe("loadServices", () => {
    it("should load and set services for cluster and namespace", async () => {
      const mockServices: ServiceInfo[] = [
        {
          name: "test-service",
          namespace: "default",
          ports: [
            { name: "http", port: 80, targetPort: 8080, protocol: "TCP" },
          ],
        },
      ];
      (mockElectronAPI.getServices as jest.Mock).mockResolvedValue(
        mockServices
      );

      const mockSetServices = jest.fn();
      const mockSetLoading = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: jest.fn(),
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: mockSetServices,
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: mockSetLoading,
        setError: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      const { result } = renderHook(() => useK8s());

      await result.current.loadServices("test-cluster", "default");

      expect(mockElectronAPI.getServices).toHaveBeenCalledWith(
        "test-cluster",
        "default"
      );
      expect(mockSetServices).toHaveBeenCalledWith(
        "test-cluster",
        "default",
        mockServices
      );
    });

    it("should handle errors when loading services", async () => {
      const error = new Error("Failed to load services");
      (mockElectronAPI.getServices as jest.Mock).mockRejectedValue(error);

      const mockSetError = jest.fn();
      const mockSetLoading = jest.fn();

      (usePortForwardStore as jest.Mock).mockReturnValue({
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: jest.fn(),
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: jest.fn(),
        setActiveForwards: jest.fn(),
        updateForward: jest.fn(),
        setLoading: mockSetLoading,
        setError: mockSetError,
        loadConfig: jest.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useK8s());

      await result.current.loadServices("test-cluster", "default");

      expect(mockSetError).toHaveBeenCalledWith("Failed to load services");
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe("refreshActiveForwards", () => {
    it("should load and set active forwards", async () => {
      const mockForwards: PortForwardStatus[] = [
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
      (mockElectronAPI.getActiveForwards as jest.Mock).mockResolvedValue(
        mockForwards
      );

      const mockSetActiveForwards = jest.fn();
      const mockStoreState = {
        clusters: [],
        selectedCluster: null,
        configuredNamespaces: {},
        services: {},
        selectedServices: {},
        groups: [],
        activeForwards: [],
        setClusters: jest.fn(),
        setSelectedCluster: jest.fn(),
        setNamespaces: jest.fn(),
        setServices: jest.fn(),
        setActiveForwards: mockSetActiveForwards,
        updateForward: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        loadConfig: jest.fn().mockResolvedValue(undefined),
      };
      (usePortForwardStore as jest.Mock).mockReturnValue(mockStoreState);
      (usePortForwardStore.getState as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(mockStoreState);

      const { result } = renderHook(() => useK8s());

      await result.current.refreshActiveForwards();

      expect(mockElectronAPI.getActiveForwards).toHaveBeenCalled();
      expect(mockSetActiveForwards).toHaveBeenCalledWith(mockForwards);
    });
  });
});
