import { render, screen } from "@testing-library/react";
import App from "../../App";
import { usePortForwardStore } from "../../stores/portforwards";
import { useK8s } from "../../hooks/useK8s";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");
jest.mock("../../hooks/useK8s");
jest.mock("../Groups", () => ({
  Groups: () => <div>Groups</div>,
}));
jest.mock("../ServiceList", () => ({
  ServiceList: () => <div>ServiceList</div>,
}));
jest.mock("../ClusterPanel", () => ({
  ClusterPanel: () => <div>Clusters</div>,
}));
jest.mock("../ConfigMenu", () => ({
  ConfigMenu: () => <button aria-label="Config menu">Config</button>,
}));

describe("App", () => {
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
      loadNamespaces: jest.fn(),
      refreshActiveForwards: jest.fn(),
      setSelectedCluster: jest.fn(),
    });

    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: null,
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });
  });

  it("should render app title", () => {
    render(<App />);
    expect(screen.getByText("Porter")).toBeInTheDocument();
    expect(screen.getByText("K8s Port Forward Manager")).toBeInTheDocument();
  });

  it("should render error message when error exists", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: "Test error message",
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should not render error message when error is null", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: null,
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should not render error message when error is empty string", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: "",
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should render ClusterPanel", () => {
    render(<App />);
    expect(screen.getByText("Clusters")).toBeInTheDocument();
  });

  it("should render ConfigMenu", () => {
    render(<App />);
    const configButton = screen.getByLabelText("Config menu");
    expect(configButton).toBeInTheDocument();
  });

  it("should handle long error messages", () => {
    const longError = "A".repeat(200);
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: longError,
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.getByText(longError)).toBeInTheDocument();
  });

  it("should handle special characters in error messages", () => {
    const specialError = 'Error: <script>alert("xss")</script> & "quotes"';
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: specialError,
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.getByText(specialError)).toBeInTheDocument();
  });

  it("should render all main sections", () => {
    render(<App />);

    expect(screen.getByText("Porter")).toBeInTheDocument();
    expect(screen.getByText("K8s Port Forward Manager")).toBeInTheDocument();
    expect(screen.getByText("Clusters")).toBeInTheDocument();
  });

  it("should handle undefined error gracefully", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: undefined,
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });

    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
