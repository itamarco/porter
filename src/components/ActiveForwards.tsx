import { useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { PortForwardState, PortForwardStatus } from '../types/electron';

const stateColors: Record<PortForwardState, string> = {
  [PortForwardState.CONNECTING]: 'bg-yellow-100 text-yellow-800',
  [PortForwardState.ACTIVE]: 'bg-green-100 text-green-800',
  [PortForwardState.RECONNECTING]: 'bg-yellow-100 text-yellow-800',
  [PortForwardState.FAILED]: 'bg-red-100 text-red-800',
  [PortForwardState.STOPPED]: 'bg-gray-100 text-gray-800',
};

const stateLabels: Record<PortForwardState, string> = {
  [PortForwardState.CONNECTING]: 'Connecting',
  [PortForwardState.ACTIVE]: 'Active',
  [PortForwardState.RECONNECTING]: 'Reconnecting',
  [PortForwardState.FAILED]: 'Failed',
  [PortForwardState.STOPPED]: 'Stopped',
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
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Active Port Forwards</h2>
        <p className="text-gray-700 text-base">No active port forwards</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Active Port Forwards</h2>
      <div className="space-y-4">
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
      alert(error instanceof Error ? error.message : 'Failed to stop port forward');
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
      alert(error instanceof Error ? error.message : 'Failed to retry port forward');
    }
  };

  const stateBgColors: Record<PortForwardState, string> = {
    [PortForwardState.CONNECTING]: 'rgba(234, 179, 8, 0.15)',
    [PortForwardState.ACTIVE]: 'rgba(34, 197, 94, 0.15)',
    [PortForwardState.RECONNECTING]: 'rgba(234, 179, 8, 0.15)',
    [PortForwardState.FAILED]: 'rgba(220, 38, 38, 0.15)',
    [PortForwardState.STOPPED]: 'rgba(156, 163, 175, 0.15)',
  };

  const stateBorderColors: Record<PortForwardState, string> = {
    [PortForwardState.CONNECTING]: 'rgba(234, 179, 8, 0.3)',
    [PortForwardState.ACTIVE]: 'rgba(34, 197, 94, 0.3)',
    [PortForwardState.RECONNECTING]: 'rgba(234, 179, 8, 0.3)',
    [PortForwardState.FAILED]: 'rgba(220, 38, 38, 0.3)',
    [PortForwardState.STOPPED]: 'rgba(156, 163, 175, 0.3)',
  };

  return (
    <div className="glass-card rounded-xl p-5" style={{
      background: stateBgColors[forward.state],
      borderColor: stateBorderColors[forward.state]
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">
            {forward.service} ({forward.namespace})
          </span>
          <span
            className="px-3 py-1 text-xs font-semibold rounded-lg glass-badge text-gray-800"
            style={{
              background: stateBgColors[forward.state],
              borderColor: stateBorderColors[forward.state]
            }}
          >
            {stateLabels[forward.state]}
          </span>
        </div>
        <div className="flex gap-2">
          {forward.state === PortForwardState.FAILED && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-800"
              style={{
                background: 'rgba(59, 130, 246, 0.25)',
                borderColor: 'rgba(59, 130, 246, 0.4)'
              }}
            >
              Retry
            </button>
          )}
          {forward.state !== PortForwardState.STOPPED && (
            <button
              onClick={handleStop}
              className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-800"
              style={{
                background: 'rgba(220, 38, 38, 0.25)',
                borderColor: 'rgba(220, 38, 38, 0.4)'
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-700">
        <div>
          {forward.cluster} → localhost:{forward.localPort} (service port: {forward.servicePort})
        </div>
        {forward.error && (
          <div className="mt-2 text-red-800 text-xs font-medium">{forward.error}</div>
        )}
        {forward.retryCount > 0 && (
          <div className="mt-2 text-yellow-800 text-xs">
            Retry attempt: {forward.retryCount}/{5}
          </div>
        )}
        {forward.nextRetryAt && (
          <div className="mt-2 text-yellow-800 text-xs">
            Next retry: {new Date(forward.nextRetryAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

