import { render, screen, fireEvent } from "@testing-library/react";
import { ServicePortCheckbox } from "../ServicePortCheckbox";

describe("ServicePortCheckbox", () => {
  const mockPort = {
    name: "http",
    port: 8080,
    protocol: "TCP",
  };

  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render port information", () => {
    render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText("http")).toBeInTheDocument();
    expect(screen.getByText("(8080/TCP)")).toBeInTheDocument();
  });

  it("should call onToggle when clicked", () => {
    render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it("should show selected state when isSelected is true", () => {
    render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={true}
        onToggle={mockOnToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("should show unselected state when isSelected is false", () => {
    render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("should display checkmark icon when selected", () => {
    const { container } = render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={true}
        onToggle={mockOnToggle}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should not display checkmark icon when not selected", () => {
    const { container } = render(
      <ServicePortCheckbox
        port={mockPort}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });

  it("should handle different port configurations", () => {
    const customPort = {
      name: "grpc",
      port: 9090,
      protocol: "UDP",
    };

    render(
      <ServicePortCheckbox
        port={customPort}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText("grpc")).toBeInTheDocument();
    expect(screen.getByText("(9090/UDP)")).toBeInTheDocument();
  });
});
