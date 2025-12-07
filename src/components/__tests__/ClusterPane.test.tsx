import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClusterPane } from "../ClusterPane";

describe("ClusterPane", () => {
  const mockCluster = {
    name: "test-cluster",
    context: "test-context",
  };

  const mockOnToggle = jest.fn();
  const mockOnLoadNamespaces = jest.fn().mockResolvedValue(undefined);
  const mockOnLoadServices = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render cluster name", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={false}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.getByText("test-cluster")).toBeInTheDocument();
  });

  it("should call onToggle when cluster button is clicked", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={false}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("test-cluster").closest("button");
    fireEvent.click(button!);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it("should show namespace count badge when namespaces are available", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={false}
        onToggle={mockOnToggle}
        availableNamespaces={["default", "kube-system"]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.getByText("2 NS")).toBeInTheDocument();
  });

  it("should not show namespace count badge when no namespaces", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={false}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.queryByText(/NS/)).not.toBeInTheDocument();
  });

  it("should load namespaces when expanded and no namespaces available", async () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    await waitFor(() => {
      expect(mockOnLoadNamespaces).toHaveBeenCalled();
    });
  });

  it("should show loading state when loading namespaces", async () => {
    const slowLoadNamespaces = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={slowLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Loading namespaces...")).toBeInTheDocument();
    });
  });

  it("should display namespaces when expanded", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={["default", "kube-system"]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("kube-system")).toBeInTheDocument();
  });

  it("should show error message when hasError is true", () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
        hasError={true}
      />
    );

    expect(screen.getByText("Failed to load namespaces")).toBeInTheDocument();
  });

  it('should show "No namespaces found" when expanded with empty namespaces and no error', async () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
        hasError={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No namespaces found")).toBeInTheDocument();
    });
  });

  it("should not load namespaces if hasError is true", async () => {
    render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
        hasError={true}
      />
    );

    await waitFor(() => {
      expect(mockOnLoadNamespaces).not.toHaveBeenCalled();
    });
  });

  it("should not load namespaces if already attempted", async () => {
    const { rerender } = render(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    await waitFor(() => {
      expect(mockOnLoadNamespaces).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ClusterPane
        cluster={mockCluster}
        isExpanded={true}
        onToggle={mockOnToggle}
        availableNamespaces={[]}
        onLoadNamespaces={mockOnLoadNamespaces}
        onLoadServices={mockOnLoadServices}
      />
    );

    await waitFor(() => {
      expect(mockOnLoadNamespaces).toHaveBeenCalledTimes(1);
    });
  });
});
