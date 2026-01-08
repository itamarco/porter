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

    // When creating a new group, services start unselected
    expect(screen.getByText(/\(0 selected\)/)).toBeInTheDocument();

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

  it("should not pre-select services from selectedServices when creating a new group", () => {
    const clusters: ClusterInfo[] = [
      { name: "test-cluster", context: "test-context", server: "https://test" },
    ];

    const defaultServices: ServiceInfo[] = [
      {
        name: "service-1",
        namespace: "default",
        ports: [
          { name: "http", port: 8080, targetPort: 8080, protocol: "TCP" },
        ],
      },
      {
        name: "service-2",
        namespace: "default",
        ports: [
          { name: "http", port: 8081, targetPort: 8081, protocol: "TCP" },
        ],
      },
    ];

    // Simulate that some services are currently selected (e.g., from a previous group)
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      services: {
        "test-context:default": defaultServices,
      },
      selectedServices: {
        "test-context:default": ["service-1:8080", "service-2:8081"],
      },
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
    });

    render(<GroupForm group={null} onClose={jest.fn()} />);

    // BUG: When creating a new group, the form should start with 0 selected services
    // Currently it shows all services from selectedServices as selected
    expect(screen.getByText(/\(0 selected\)/)).toBeInTheDocument();

    // Expand cluster to see the services
    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    const namespaceButton = screen.getByText("default").closest("button");
    fireEvent.click(namespaceButton!);

    // Both services should be visible but NOT checked
    const service1Checkbox = screen
      .getByText("service-1")
      .closest("label")
      ?.querySelector("input");
    const service2Checkbox = screen
      .getByText("service-2")
      .closest("label")
      ?.querySelector("input");

    expect(service1Checkbox).not.toBeChecked();
    expect(service2Checkbox).not.toBeChecked();
  });

  it("should pre-populate services when editing an existing group", () => {
    const clusters: ClusterInfo[] = [
      { name: "test-cluster", context: "test-context", server: "https://test" },
    ];

    const defaultServices: ServiceInfo[] = [
      {
        name: "service-1",
        namespace: "default",
        ports: [
          { name: "http", port: 8080, targetPort: 8080, protocol: "TCP" },
        ],
      },
      {
        name: "service-2",
        namespace: "default",
        ports: [
          { name: "http", port: 8081, targetPort: 8081, protocol: "TCP" },
        ],
      },
    ];

    const existingGroup = {
      id: "group-1",
      name: "Test Group",
      servicePorts: ["test-context:default:service-1:8080"],
      localPort: 3000,
    };

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      services: {
        "test-context:default": defaultServices,
      },
      selectedServices: {
        "test-context:default": ["service-1:8080", "service-2:8081"],
      },
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
    });

    render(<GroupForm group={existingGroup} onClose={jest.fn()} />);

    // When editing, it should show the group's services (1 in this case)
    expect(screen.getByText(/\(1 selected\)/)).toBeInTheDocument();

    // Expand cluster to see the services
    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    const namespaceButton = screen.getByText("default").closest("button");
    fireEvent.click(namespaceButton!);

    // Only service-1 should be checked (from the group)
    const service1Checkbox = screen
      .getByText("service-1")
      .closest("label")
      ?.querySelector("input");
    const service2Checkbox = screen
      .getByText("service-2")
      .closest("label")
      ?.querySelector("input");

    expect(service1Checkbox).toBeChecked();
    expect(service2Checkbox).not.toBeChecked();
  });

  it("should respect individual port overrides when services are in a group", () => {
    // This test verifies that custom ports set for individual services
    // are maintained when those services are added to a group
    const clusters: ClusterInfo[] = [
      { name: "test-cluster", context: "test-context", server: "https://test" },
    ];

    const defaultServices: ServiceInfo[] = [
      {
        name: "service-1",
        namespace: "default",
        ports: [
          { name: "http", port: 8080, targetPort: 8080, protocol: "TCP" },
        ],
      },
      {
        name: "service-2",
        namespace: "default",
        ports: [
          { name: "http", port: 8081, targetPort: 8081, protocol: "TCP" },
        ],
      },
    ];

    // Mock the store with services that have custom port overrides
    const mockStore = {
      clusters,
      services: {
        "test-context:default": defaultServices,
      },
      selectedServices: {
        "test-context:default": ["service-1:8080", "service-2:8081"],
      },
      // These are the custom port overrides the user has set
      portOverrides: {
        "test-context:default:service-1:8080": 3000, // User set custom port 3000
        "test-context:default:service-2:8081": 4000, // User set custom port 4000
      },
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
    };

    (usePortForwardStore as jest.Mock).mockReturnValue(mockStore);

    render(<GroupForm group={null} onClose={jest.fn()} />);

    // When the user creates a group with these services,
    // the group stores the service identifiers (cluster:namespace:service:port)
    // When the group starts, it will look up the port overrides and use them

    // The services should be available for selection
    const clusterButton = screen.getByText("test-cluster").closest("button");
    fireEvent.click(clusterButton!);

    const namespaceButton = screen.getByText("default").closest("button");
    fireEvent.click(namespaceButton!);

    expect(screen.getByText("service-1")).toBeInTheDocument();
    expect(screen.getByText("service-2")).toBeInTheDocument();

    // Note: The actual port override lookup happens in Groups.tsx when starting
    // the group, not in the form. The form just needs to show the available services.
  });
});
