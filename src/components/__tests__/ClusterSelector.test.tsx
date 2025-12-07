import { render, screen, fireEvent } from "@testing-library/react";
import { ClusterSelector } from "../ClusterSelector";
import { usePortForwardStore } from "../../stores/portforwards";
import { useK8s } from "../../hooks/useK8s";
import { ClusterInfo } from "../../types/electron";

jest.mock("../../stores/portforwards");
jest.mock("../../hooks/useK8s");

describe("ClusterSelector", () => {
  const mockSetSelectedCluster = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useK8s as jest.Mock).mockReturnValue({
      setSelectedCluster: mockSetSelectedCluster,
    });
  });

  it("should render label", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
    });

    render(<ClusterSelector />);
    expect(screen.getByText("Select Cluster")).toBeInTheDocument();
  });

  it("should render default option when no cluster selected", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
    });

    render(<ClusterSelector />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("");
    expect(screen.getByText("-- Select a cluster --")).toBeInTheDocument();
  });

  it("should render clusters as options", () => {
    const clusters: ClusterInfo[] = [
      { name: "cluster1", context: "ctx1", server: "https://server1.com" },
      { name: "cluster2", context: "ctx2", server: "https://server2.com" },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      selectedCluster: null,
    });

    render(<ClusterSelector />);

    expect(screen.getByText("cluster1")).toBeInTheDocument();
    expect(screen.getByText("cluster2")).toBeInTheDocument();
  });

  it("should call setSelectedCluster when cluster is selected", () => {
    const clusters: ClusterInfo[] = [
      { name: "cluster1", context: "ctx1", server: "https://server1.com" },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      selectedCluster: null,
    });

    render(<ClusterSelector />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "ctx1" } });

    expect(mockSetSelectedCluster).toHaveBeenCalledWith("ctx1");
  });

  it("should show selected cluster", () => {
    const clusters: ClusterInfo[] = [
      { name: "cluster1", context: "ctx1", server: "https://server1.com" },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      selectedCluster: "ctx1",
    });

    render(<ClusterSelector />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("ctx1");
  });

  it("should call setSelectedCluster with null when default option is selected", () => {
    const clusters: ClusterInfo[] = [
      { name: "cluster1", context: "ctx1", server: "https://server1.com" },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      selectedCluster: "ctx1",
    });

    render(<ClusterSelector />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "" } });

    expect(mockSetSelectedCluster).toHaveBeenCalledWith(null);
  });

  it("should handle empty clusters list", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
    });

    render(<ClusterSelector />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("-- Select a cluster --")).toBeInTheDocument();
  });
});
