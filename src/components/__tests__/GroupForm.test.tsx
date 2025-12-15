import { render, screen, fireEvent } from "@testing-library/react";
import { GroupForm } from "../GroupForm";
import { usePortForwardStore } from "../../stores/portforwards";
import { ClusterInfo, ServiceInfo } from "../../types/electron";

jest.mock("../../stores/portforwards");

describe("GroupForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      services: {},
      selectedServices: {},
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
    });
  });

  it("should only show namespaces that have selected services", () => {
    const clusters: ClusterInfo[] = [
      { name: "test-cluster", context: "test-context", server: "https://test" },
    ];

    const defaultServices: ServiceInfo[] = [
      {
        name: "test-service",
        namespace: "default",
        ports: [{ name: "http", port: 80, targetPort: 8080, protocol: "TCP" }],
      },
    ];

    const otherServices: ServiceInfo[] = [
      {
        name: "other-service",
        namespace: "other",
        ports: [
          { name: "http", port: 8081, targetPort: 8081, protocol: "TCP" },
        ],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      services: {
        "test-context:default": defaultServices,
        "test-context:other": otherServices, // visited in past, should NOT be shown
      },
      selectedServices: {
        "test-context:default": ["test-service:80"], // only selected namespace
      },
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
    });

    render(<GroupForm group={null} onClose={jest.fn()} />);

    expect(screen.getByText(/\(1 selected\)/)).toBeInTheDocument();

    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.queryByText("other")).not.toBeInTheDocument();

    const namespaceButton = screen.getByText("default").closest("button");
    fireEvent.click(namespaceButton!);

    expect(screen.getByText("test-service")).toBeInTheDocument();
    expect(screen.getByText(/http \(80\/TCP\)/)).toBeInTheDocument();
    expect(screen.queryByText("other-service")).not.toBeInTheDocument();
  });
});
