import { render, screen, fireEvent } from "@testing-library/react";
import { ServicePortList } from "../ServicePortList";

describe("ServicePortList", () => {
  const mockService = {
    name: "test-service",
    ports: [
      { name: "http", port: 80, protocol: "TCP" },
      { name: "https", port: 443, protocol: "TCP" },
    ],
  };

  const mockOnPortToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render service name", () => {
    render(
      <ServicePortList
        service={mockService}
        selectedServicePorts={[]}
        onPortToggle={mockOnPortToggle}
      />
    );

    expect(screen.getByText("test-service")).toBeInTheDocument();
  });

  it("should render all ports", () => {
    render(
      <ServicePortList
        service={mockService}
        selectedServicePorts={[]}
        onPortToggle={mockOnPortToggle}
      />
    );

    expect(screen.getByText("http")).toBeInTheDocument();
    expect(screen.getByText("https")).toBeInTheDocument();
  });

  it("should call onPortToggle with correct service and port when port is clicked", () => {
    render(
      <ServicePortList
        service={mockService}
        selectedServicePorts={[]}
        onPortToggle={mockOnPortToggle}
      />
    );

    const httpCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(httpCheckbox);

    expect(mockOnPortToggle).toHaveBeenCalledWith("test-service", 80);
  });

  it("should mark ports as selected when they are in selectedServicePorts", () => {
    render(
      <ServicePortList
        service={mockService}
        selectedServicePorts={["test-service:80"]}
        onPortToggle={mockOnPortToggle}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("should handle service with no ports", () => {
    const serviceWithoutPorts = {
      name: "empty-service",
      ports: [],
    };

    render(
      <ServicePortList
        service={serviceWithoutPorts}
        selectedServicePorts={[]}
        onPortToggle={mockOnPortToggle}
      />
    );

    expect(screen.getByText("empty-service")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("should handle multiple selected ports", () => {
    render(
      <ServicePortList
        service={mockService}
        selectedServicePorts={["test-service:80", "test-service:443"]}
        onPortToggle={mockOnPortToggle}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });
});
