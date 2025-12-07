import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NamespaceChip } from "../NamespaceChip";
import { usePortForwardStore } from "../../stores/portforwards";
import { ServiceInfo } from "../../types/electron";

jest.mock("../../stores/portforwards");

describe("NamespaceChip", () => {
  const mockOnLoadServices = jest.fn().mockResolvedValue(undefined);
  const mockToggleServicePortSelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePortForwardStore as jest.Mock).mockReturnValue({
      services: {},
      selectedServices: {},
      toggleServicePortSelection: mockToggleServicePortSelection,
    });
  });

  it("should render namespace name", () => {
    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("should expand when clicked", async () => {
    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    await waitFor(() => {
      fireEvent.click(button!);
    });

    await waitFor(() => {
      expect(screen.queryByText("No services found")).toBeInTheDocument();
    });
  });

  it("should call onLoadServices when expanded and no services exist", async () => {
    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(mockOnLoadServices).toHaveBeenCalledWith(
        "test-context",
        "default"
      );
    });
  });

  it("should not call onLoadServices when services already exist", async () => {
    const services: Record<string, ServiceInfo[]> = {
      "test-context:default": [
        {
          name: "test-service",
          namespace: "default",
          ports: [
            { name: "http", port: 80, targetPort: 8080, protocol: "TCP" },
          ],
        },
      ],
    };

    (usePortForwardStore as jest.Mock).mockReturnValue({
      services,
      selectedServices: {},
      toggleServicePortSelection: mockToggleServicePortSelection,
    });

    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(mockOnLoadServices).not.toHaveBeenCalled();
    });
  });

  it("should display services when expanded", () => {
    const services: Record<string, ServiceInfo[]> = {
      "test-context:default": [
        {
          name: "test-service",
          namespace: "default",
          ports: [
            { name: "http", port: 80, targetPort: 8080, protocol: "TCP" },
          ],
        },
      ],
    };

    (usePortForwardStore as jest.Mock).mockReturnValue({
      services,
      selectedServices: {},
      toggleServicePortSelection: mockToggleServicePortSelection,
    });

    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    fireEvent.click(button!);

    expect(screen.getByText("test-service")).toBeInTheDocument();
  });

  it("should show selected count badge when services are selected", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      services: {},
      selectedServices: {
        "test-context:default": ["test-service:80", "test-service:443"],
      },
      toggleServicePortSelection: mockToggleServicePortSelection,
    });

    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should show loading spinner when loading services", async () => {
    const slowLoadServices = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={slowLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    fireEvent.click(button!);

    await waitFor(() => {
      const spinner = button!.querySelector("svg.animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  it('should show "No services found" when expanded with no services', async () => {
    render(
      <NamespaceChip
        cluster="test-context"
        namespace="default"
        onLoadServices={mockOnLoadServices}
      />
    );

    const button = screen.getByText("default").closest("button");
    fireEvent.click(button!);

    await waitFor(() => {
      expect(screen.getByText("No services found")).toBeInTheDocument();
    });
  });
});
