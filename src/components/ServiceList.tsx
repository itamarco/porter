import { useState, useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ServiceInfo, ServicePortInfo, PortForwardState, PortForwardStatus, ClusterInfo } from '../types/electron';

export function ServiceList() {
  const { clusters, configuredNamespaces, services } = usePortForwardStore();
  const { loadServices, refreshActiveForwards } = useK8s();

  useEffect(() => {
    refreshActiveForwards();
    const interval = setInterval(refreshActiveForwards, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadServices = async (cluster: string, namespace: string) => {
    await loadServices(cluster, namespace);
  };

  const clustersWithNamespaces = clusters.filter(
    (cluster: ClusterInfo) => (configuredNamespaces[cluster.context] || []).length > 0
  );

  if (clustersWithNamespaces.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
        <p className="text-gray-500 text-sm">Add namespaces to clusters above to see services</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
      <div className="space-y-6">
        {clustersWithNamespaces.map((cluster: ClusterInfo) => {
          const namespaces = configuredNamespaces[cluster.context] || [];
          return (
            <div key={cluster.context} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">{cluster.name}</h3>
              <div className="space-y-4">
                {namespaces.map((namespace: string) => {
                  const serviceKey = `${cluster.context}:${namespace}`;
                  const serviceList = services[serviceKey] || [];

                  return (
                    <div key={namespace}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-700">{namespace}</h4>
                        <button
                          onClick={() => handleLoadServices(cluster.context, namespace)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Refresh
                        </button>
                      </div>
                      {serviceList.length === 0 ? (
                        <p className="text-gray-500 text-sm">No services found</p>
                      ) : (
                        <div className="space-y-2">
                          {serviceList.map((service: ServiceInfo) => (
                            <ServiceCard
                              key={service.name}
                              service={service}
                              cluster={cluster.context}
                              namespace={namespace}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  cluster,
  namespace,
}: {
  service: ServiceInfo;
  cluster: string;
  namespace: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded p-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium text-gray-900">{service.name}</span>
        <span className="text-sm text-gray-500">
          {service.ports.length} port{service.ports.length !== 1 ? 's' : ''}
        </span>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2">
          {service.ports.map((port) => (
            <PortForwardCard
              key={port.name}
              port={port}
              service={service.name}
              cluster={cluster}
              namespace={namespace}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortForwardCard({
  port,
  service,
  cluster,
  namespace,
}: {
  port: ServicePortInfo;
  service: string;
  cluster: string;
  namespace: string;
}) {
  const { activeForwards } = usePortForwardStore();
  const [localPort, setLocalPort] = useState(port.port.toString());
  const [starting, setStarting] = useState(false);

  const forwardId = `${cluster}-${namespace}-${service}-${port.port}-${parseInt(localPort, 10)}`;
  const activeForward = activeForwards.find((f: PortForwardStatus) => f.id === forwardId);
  const isActive = activeForward && activeForward.state === PortForwardState.ACTIVE;

  const handleStart = async () => {
    if (!window.electronAPI) {
      alert('Electron API not available');
      return;
    }
    try {
      setStarting(true);
      await window.electronAPI.startPortForward({
        cluster,
        namespace,
        service,
        servicePort: port.port,
        localPort: parseInt(localPort, 10),
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start port forward');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!window.electronAPI || !activeForward) return;
    try {
      await window.electronAPI.stopPortForward(activeForward.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to stop port forward');
    }
  };

  const handleOpenBrowser = () => {
    if (window.electronAPI && activeForward) {
      window.electronAPI.openInBrowser(`http://localhost:${activeForward.localPort}`);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded ${isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">
          {port.name} ({port.protocol})
        </div>
        <div className="text-xs text-gray-500">
          Service: {port.port} → Local: {localPort}
          {isActive && (
            <span className="ml-2 text-green-600 font-medium">● Active</span>
          )}
        </div>
      </div>
      {isActive ? (
        <div className="flex gap-2">
          <button
            onClick={handleOpenBrowser}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Open
          </button>
          <button
            onClick={handleStop}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
        </div>
      ) : (
        <>
          <input
            type="number"
            value={localPort}
            onChange={(e) => setLocalPort(e.target.value)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="Local port"
            min="1"
            max="65535"
            disabled={starting}
          />
          <button
            onClick={handleStart}
            disabled={starting || !localPort}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting...' : 'Start'}
          </button>
        </>
      )}
    </div>
  );
}

