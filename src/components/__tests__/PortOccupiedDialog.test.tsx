import { render, screen, fireEvent } from "@testing-library/react";
import { PortOccupiedDialog } from "../PortOccupiedDialog";
import { ProcessInfo } from "../../types/electron";

describe("PortOccupiedDialog", () => {
  const mockProcessInfo: ProcessInfo = {
    pid: 12345,
    port: 8080,
    processName: "node",
    commandLine: "/usr/bin/kubectl port-forward service/test 8080:80",
  };

  const mockOnKill = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with process information", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Port 8080 is Already in Use/i)).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("node")).toBeInTheDocument();
    expect(screen.getByText(/kubectl port-forward/i)).toBeInTheDocument();
  });

  it("should show warning message", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Warning:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Killing this process may cause data loss/i)
    ).toBeInTheDocument();
  });

  it("should call onKill when Kill Process button is clicked", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    const killButton = screen.getByText(/Kill Process & Retry/i);
    fireEvent.click(killButton);

    expect(mockOnKill).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it("should call onCancel when Cancel button is clicked", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnKill).not.toHaveBeenCalled();
  });

  it("should call onCancel when backdrop is clicked", () => {
    const { container } = render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnKill).not.toHaveBeenCalled();
  });

  it("should call onCancel when Escape key is pressed", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnKill).not.toHaveBeenCalled();
  });

  it("should display all process details correctly", () => {
    render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Port:")).toBeInTheDocument();
    expect(screen.getByText("8080")).toBeInTheDocument();
    
    expect(screen.getByText("PID:")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    
    expect(screen.getByText("Process:")).toBeInTheDocument();
    expect(screen.getByText("node")).toBeInTheDocument();
    
    expect(screen.getByText("Command:")).toBeInTheDocument();
    expect(screen.getByText("/usr/bin/kubectl port-forward service/test 8080:80")).toBeInTheDocument();
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = render(
      <PortOccupiedDialog
        processInfo={mockProcessInfo}
        onKill={mockOnKill}
        onCancel={mockOnCancel}
      />
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
