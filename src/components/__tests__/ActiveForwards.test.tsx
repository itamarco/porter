import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActiveForwards } from "../ActiveForwards";
import { usePortForwardStore } from "../../stores/portforwards";
import { useK8s } from "../../hooks/useK8s";
import { PortForwardState, PortForwardStatus } from "../../types/electron";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");
jest.mock("../../hooks/useK8s");

describe("ActiveForwards", () => {
  const mockElectronAPI = createMockElectronAPI();
  const mockRefreshActiveForwards = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    window.electronAPI = mockElectronAPI as any;

    (useK8s as jest.Mock).mockReturnValue({
      refreshActiveForwards: mockRefreshActiveForwards,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render title", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: [],
    });

    render(<ActiveForwards />);

    expect(screen.getByText("Active Port Forwards")).toBeInTheDocument();
  });

  it("should show message when no active forwards", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: [],
    });

    render(<ActiveForwards />);

    expect(screen.getByText("No active port forwards")).toBeInTheDocument();
  });

  it("should call refreshActiveForwards on mount", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: [],
    });

    render(<ActiveForwards />);

    expect(mockRefreshActiveForwards).toHaveBeenCalled();
  });

  it("should call refreshActiveForwards every 2 seconds", () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: [],
    });

    render(<ActiveForwards />);

    expect(mockRefreshActiveForwards).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2000);
    expect(mockRefreshActiveForwards).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(2000);
    expect(mockRefreshActiveForwards).toHaveBeenCalledTimes(3);
  });

  it("should render active forwards", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText("test-service (default)")).toBeInTheDocument();
    expect(
      screen.getByText(/test-cluster → localhost:8080/)
    ).toBeInTheDocument();
  });

  it("should display forward state", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should call stopPortForward when stop button is clicked", async () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    const stopButton = screen.getByText("Stop");
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopPortForward).toHaveBeenCalledWith("forward-1");
    });
  });

  it("should show retry button for failed forwards", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.FAILED,
        error: "Connection failed",
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("should call retry logic when retry button is clicked", async () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.FAILED,
        error: "Connection failed",
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopPortForward).toHaveBeenCalledWith("forward-1");
      expect(mockElectronAPI.startPortForward).toHaveBeenCalledWith({
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
      });
    });
  });

  it("should display error message when present", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.FAILED,
        error: "Connection timeout",
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
  });

  it("should display retry count when greater than 0", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.RECONNECTING,
        error: null,
        retryCount: 3,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText(/Retry attempt: 3\/5/)).toBeInTheDocument();
  });

  it("should display next retry time when present", () => {
    const nextRetryAt = new Date(Date.now() + 60000).toISOString();
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.RECONNECTING,
        error: null,
        retryCount: 1,
        nextRetryAt,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText(/Next retry:/)).toBeInTheDocument();
  });

  it("should not show stop button for stopped forwards", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "test-cluster",
        namespace: "default",
        service: "test-service",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.STOPPED,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.queryByText("Stop")).not.toBeInTheDocument();
  });

  it("should handle multiple forwards", () => {
    const forwards: PortForwardStatus[] = [
      {
        id: "forward-1",
        cluster: "cluster-1",
        namespace: "default",
        service: "service-1",
        servicePort: 80,
        localPort: 8080,
        state: PortForwardState.ACTIVE,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
      {
        id: "forward-2",
        cluster: "cluster-2",
        namespace: "kube-system",
        service: "service-2",
        servicePort: 443,
        localPort: 8443,
        state: PortForwardState.ACTIVE,
        error: null,
        retryCount: 0,
        nextRetryAt: null,
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      activeForwards: forwards,
    });

    render(<ActiveForwards />);

    expect(screen.getByText("service-1 (default)")).toBeInTheDocument();
    expect(screen.getByText("service-2 (kube-system)")).toBeInTheDocument();
  });
});
