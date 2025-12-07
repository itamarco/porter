import { useEffect } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import { PortForwardState, PortForwardStatus } from "../types/electron";

const stateLabels: Record<PortForwardState, string> = {
  [PortForwardState.CONNECTING]: "Connecting",
  [PortForwardState.ACTIVE]: "Active",
  [PortForwardState.RECONNECTING]: "Reconnecting",
  [PortForwardState.FAILED]: "Failed",
  [PortForwardState.STOPPED]: "Stopped",
};

export function ActiveForwards() {
  const { activeForwards } = usePortForwardStore();
  const { refreshActiveForwards } = useK8s();

  useEffect(() => {
    refreshActiveForwards();
    const interval = setInterval(refreshActiveForwards, 2000);
    return () => clearInterval(interval);
  }, []);

  if (activeForwards.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-3">
          Active Port Forwards
        </h2>
        <p className="text-gray-300 text-sm">No active port forwards</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-100 mb-3">
        Active Port Forwards
      </h2>
      <div className="space-y-3">
        {activeForwards.map((forward: PortForwardStatus) => (
          <ForwardCard key={forward.id} forward={forward} />
        ))}
      </div>
    </div>
  );
}

function ForwardCard({ forward }: { forward: PortForwardStatus }) {
  const handleStop = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.stopPortForward(forward.id);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to stop port forward"
      );
    }
  };

  const handleRetry = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.stopPortForward(forward.id);
      await window.electronAPI.startPortForward({
        cluster: forward.cluster,
        namespace: forward.namespace,
        service: forward.service,
        servicePort: forward.servicePort,
        localPort: forward.localPort,
      });
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to retry port forward"
      );
    }
  };

  const stateBgColors: Record<PortForwardState, string> = {
    [PortForwardState.CONNECTING]: "rgba(234, 179, 8, 0.15)",
    [PortForwardState.ACTIVE]: "rgba(34, 197, 94, 0.15)",
    [PortForwardState.RECONNECTING]: "rgba(234, 179, 8, 0.15)",
    [PortForwardState.FAILED]: "rgba(220, 38, 38, 0.15)",
    [PortForwardState.STOPPED]: "rgba(156, 163, 175, 0.15)",
  };

  const stateBorderColors: Record<PortForwardState, string> = {
    [PortForwardState.CONNECTING]: "rgba(234, 179, 8, 0.3)",
    [PortForwardState.ACTIVE]: "rgba(34, 197, 94, 0.3)",
    [PortForwardState.RECONNECTING]: "rgba(234, 179, 8, 0.3)",
    [PortForwardState.FAILED]: "rgba(220, 38, 38, 0.3)",
    [PortForwardState.STOPPED]: "rgba(156, 163, 175, 0.3)",
  };

  return (
    <div
      className="glass-card rounded-xl p-4"
      style={{
        background: stateBgColors[forward.state],
        borderColor: stateBorderColors[forward.state],
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm text-gray-100">
            {forward.service} ({forward.namespace})
          </span>
          <span
            className="px-2 py-0.5 text-[10px] font-semibold rounded-lg glass-badge text-gray-100"
            style={{
              background: stateBgColors[forward.state],
              borderColor: stateBorderColors[forward.state],
            }}
          >
            {stateLabels[forward.state]}
          </span>
        </div>
        <div className="flex gap-1.5">
          {forward.state === PortForwardState.FAILED && (
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg text-gray-100"
              style={{
                background: "rgba(59, 130, 246, 0.25)",
                borderColor: "rgba(59, 130, 246, 0.4)",
              }}
            >
              Retry
            </button>
          )}
          {forward.state !== PortForwardState.STOPPED && (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg text-gray-100"
              style={{
                background: "rgba(220, 38, 38, 0.25)",
                borderColor: "rgba(220, 38, 38, 0.4)",
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-300">
        <div>
          {forward.cluster} → localhost:{forward.localPort} (service port:{" "}
          {forward.servicePort})
        </div>
        {forward.error && (
          <div className="mt-2 text-red-200 text-xs font-medium">
            {forward.error}
          </div>
        )}
        {forward.retryCount > 0 && (
          <div className="mt-2 text-yellow-200 text-xs">
            Retry attempt: {forward.retryCount}/{5}
          </div>
        )}
        {forward.nextRetryAt && (
          <div className="mt-2 text-yellow-200 text-xs">
            Next retry: {new Date(forward.nextRetryAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
