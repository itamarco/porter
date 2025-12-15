import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ClusterPanel } from "../ClusterPanel";
import { usePortForwardStore } from "../../stores/portforwards";
import { useK8s } from "../../hooks/useK8s";
import { ClusterInfo, ServiceInfo } from "../../types/electron";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");
jest.mock("../../hooks/useK8s");

describe("ClusterPanel", () => {
  const mockElectronAPI = createMockElectronAPI();

  beforeEach(() => {
    window.electronAPI = mockElectronAPI as any;
    jest.clearAllMocks();

    const mockAddNamespace = jest.fn();
    const mockRemoveNamespace = jest.fn();

    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      loadNamespaces: jest.fn().mockResolvedValue([]),
      refreshActiveForwards: jest.fn(),
    });

    const mockStoreReturn = {
      clusters: [],
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      portOverrides: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
      setPortOverride: jest.fn(),
      getPortOverride: jest.fn().mockReturnValue(undefined),
    };

    (usePortForwardStore as unknown as jest.Mock).mockReturnValue(
      mockStoreReturn
    );
    Object.defineProperty(usePortForwardStore, "getState", {
      value: jest.fn().mockReturnValue(mockStoreReturn),
      writable: true,
      configurable: true,
    });
  });

  it("should render clusters list", () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    (usePortForwardStore as unknown as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      portOverrides: {},
      addNamespace: jest.fn(),
      removeNamespace: jest.fn(),
      setPortOverride: jest.fn(),
      getPortOverride: jest.fn().mockReturnValue(undefined),
    });

    render(<ClusterPanel />);
    expect(screen.getByText("Services Discovery")).toBeInTheDocument();
    expect(screen.getByText("test-cluster")).toBeInTheDocument();
  });

  it("should show message when no clusters found", () => {
    render(<ClusterPanel />);
    expect(screen.getByText("No clusters found")).toBeInTheDocument();
  });

  it("should toggle cluster expansion", async () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    (usePortForwardStore as unknown as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      portOverrides: {},
      addNamespace: jest.fn(),
      removeNamespace: jest.fn(),
      setPortOverride: jest.fn(),
      getPortOverride: jest.fn().mockReturnValue(undefined),
    });

    const mockLoadNamespaces = jest.fn().mockResolvedValue(["default"]);
    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      loadNamespaces: mockLoadNamespaces,
      refreshActiveForwards: jest.fn(),
    });

    render(<ClusterPanel />);

    const clusterButton = screen.getByText("test-cluster").closest("button");
    expect(clusterButton).toBeInTheDocument();

    fireEvent.click(clusterButton!);

    await waitFor(() => {
      expect(mockLoadNamespaces).toHaveBeenCalled();
    });
  });

  it("should load namespaces when cluster is expanded", async () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    const mockLoadNamespaces = jest
      .fn()
      .mockResolvedValue(["default", "kube-system"]);

    (usePortForwardStore as unknown as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      portOverrides: {},
      addNamespace: jest.fn(),
      removeNamespace: jest.fn(),
      setPortOverride: jest.fn(),
      getPortOverride: jest.fn().mockReturnValue(undefined),
    });

    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      loadNamespaces: mockLoadNamespaces,
      refreshActiveForwards: jest.fn(),
    });

    render(<ClusterPanel />);

    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    await waitFor(() => {
      expect(mockLoadNamespaces).toHaveBeenCalledWith("test-context");
    });
  });

  it("should display namespaces when loaded", async () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];

    (usePortForwardStore as unknown as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      portOverrides: {},
      addNamespace: jest.fn(),
      removeNamespace: jest.fn(),
      setPortOverride: jest.fn(),
      getPortOverride: jest.fn().mockReturnValue(undefined),
    });

    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      loadNamespaces: jest.fn().mockResolvedValue(["default"]),
      refreshActiveForwards: jest.fn(),
    });

    render(<ClusterPanel />);

    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    await waitFor(() => {
      expect(screen.getByText("default")).toBeInTheDocument();
    });
  });

  it("should call refreshActiveForwards on mount", () => {
    const mockRefreshActiveForwards = jest.fn();

    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      loadNamespaces: jest.fn().mockResolvedValue([]),
      refreshActiveForwards: mockRefreshActiveForwards,
    });

    render(<ClusterPanel />);

    expect(mockRefreshActiveForwards).toHaveBeenCalled();
  });
});
