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
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Port Forwards</h2>
        <p className="text-gray-500 text-sm">No active port forwards</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Port Forwards</h2>
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

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">
            {forward.service} ({forward.namespace})
          </span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${stateColors[forward.state]}`}
          >
            {stateLabels[forward.state]}
          </span>
        </div>
        <div className="flex gap-2">
          {forward.state === PortForwardState.FAILED && (
            <button
              onClick={handleRetry}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
          {forward.state !== PortForwardState.STOPPED && (
            <button
              onClick={handleStop}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600">
        <div>
          {forward.cluster} → localhost:{forward.localPort} (service port: {forward.servicePort})
        </div>
        {forward.error && (
          <div className="mt-1 text-red-600 text-xs">{forward.error}</div>
        )}
        {forward.retryCount > 0 && (
          <div className="mt-1 text-yellow-600 text-xs">
            Retry attempt: {forward.retryCount}/{5}
          </div>
        )}
        {forward.nextRetryAt && (
          <div className="mt-1 text-yellow-600 text-xs">
            Next retry: {new Date(forward.nextRetryAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

