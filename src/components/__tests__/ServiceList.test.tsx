import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ServiceList } from "../ServiceList";
import { usePortForwardStore } from "../../stores/portforwards";
import { useK8s } from "../../hooks/useK8s";
import { ClusterInfo, ServiceInfo } from "../../types/electron";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");
jest.mock("../../hooks/useK8s");

describe("ServiceList", () => {
  const mockElectronAPI = createMockElectronAPI();

  beforeEach(() => {
    window.electronAPI = mockElectronAPI as any;
    jest.clearAllMocks();
    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      refreshActiveForwards: jest.fn(),
    });
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      configuredNamespaces: {},
      services: {},
      selectedServices: {},
      activeForwards: [],
      getPortOverride: jest.fn(),
    });
  });

  it("should render message when no clusters with namespaces", () => {
    render(<ServiceList />);
    expect(screen.getByText("No services selected")).toBeInTheDocument();
  });

  it("should render services for configured namespaces", () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    const services: ServiceInfo[] = [
      {
        name: "test-service",
        namespace: "default",
        ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { "test-context": ["default"] },
      services: { "test-context:default": services },
      selectedServices: { "test-context:default": ["test-service:80"] },
      activeForwards: [],
      getPortOverride: jest.fn(),
    });

    render(<ServiceList />);

    expect(screen.getByText("Selected Services")).toBeInTheDocument();
    expect(screen.getByText("test-cluster")).toBeInTheDocument();
  });

  it("should render cluster with selected services", () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    const services: ServiceInfo[] = [
      {
        name: "test-service",
        namespace: "default",
        ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { "test-context": ["default"] },
      services: { "test-context:default": services },
      selectedServices: { "test-context:default": ["test-service:80"] },
      activeForwards: [],
      getPortOverride: jest.fn(),
    });

    render(<ServiceList />);

    expect(screen.getByText("Selected Services")).toBeInTheDocument();
    expect(screen.getByText("test-cluster")).toBeInTheDocument();
  });

  it("should expand service to show ports", () => {
    const clusters: ClusterInfo[] = [
      {
        name: "test-cluster",
        context: "test-context",
        server: "https://test.com",
      },
    ];
    const services: ServiceInfo[] = [
      {
        name: "test-service",
        namespace: "default",
        ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { "test-context": ["default"] },
      services: { "test-context:default": services },
      selectedServices: { "test-context:default": ["test-service:80"] },
      activeForwards: [],
      getPortOverride: jest.fn(),
    });

    render(<ServiceList />);

    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    expect(screen.getByText("http")).toBeInTheDocument();
    expect(screen.getByText(/80\/TCP/)).toBeInTheDocument();
  });
});
