import { render, screen, fireEvent } from "@testing-library/react";
import { NamespaceConfig } from "../NamespaceConfig";
import { usePortForwardStore } from "../../stores/portforwards";

jest.mock("../../stores/portforwards");

describe("NamespaceConfig", () => {
  const mockAddNamespace = jest.fn();
  const mockRemoveNamespace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when no cluster is selected", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: null,
      namespaces: [],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    const { container } = render(<NamespaceConfig />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when cluster is selected", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system"],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    expect(screen.getByText("Configured Namespaces")).toBeInTheDocument();
  });

  it("should display available namespaces in dropdown", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system", "monitoring"],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("kube-system")).toBeInTheDocument();
    expect(screen.getByText("monitoring")).toBeInTheDocument();
  });

  it("should filter out already configured namespaces from dropdown", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system", "monitoring"],
      configuredNamespaces: { "test-context": ["default"] },
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option")).map(
      (opt) => opt.textContent
    );

    expect(options).not.toContain("default");
    expect(options).toContain("kube-system");
    expect(options).toContain("monitoring");
  });

  it("should call addNamespace when namespace is selected", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system"],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "default" } });

    expect(mockAddNamespace).toHaveBeenCalledWith("test-context", "default");
  });

  it("should reset select value after adding namespace", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system"],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "default" } });

    expect(select.value).toBe("");
  });

  it("should display configured namespaces as chips", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system"],
      configuredNamespaces: { "test-context": ["default", "kube-system"] },
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("kube-system")).toBeInTheDocument();
  });

  it("should call removeNamespace when remove button is clicked", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default", "kube-system"],
      configuredNamespaces: { "test-context": ["default"] },
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const removeButtons = screen.getAllByRole("button");
    const removeButton = removeButtons.find((btn) => btn.querySelector("svg"));
    fireEvent.click(removeButton!);

    expect(mockRemoveNamespace).toHaveBeenCalledWith("test-context", "default");
  });

  it('should show "No namespaces configured" when no namespaces are configured', () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default"],
      configuredNamespaces: {},
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    expect(screen.getByText("No namespaces configured")).toBeInTheDocument();
  });

  it("should not add namespace if it is already configured", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      selectedCluster: "test-context",
      namespaces: ["default"],
      configuredNamespaces: { "test-context": ["default"] },
      addNamespace: mockAddNamespace,
      removeNamespace: mockRemoveNamespace,
    });

    render(<NamespaceConfig />);

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    const defaultOption = options.find((opt) => opt.textContent === "default");

    expect(defaultOption).toBeUndefined();
  });
});
