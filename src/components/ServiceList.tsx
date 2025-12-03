import { useState } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ServiceInfo, ServicePortInfo } from '../types/electron';

export function ServiceList() {
  const { selectedCluster, configuredNamespaces, services } = usePortForwardStore();
  const { loadServices } = useK8s();

  if (!selectedCluster) {
    return null;
  }

  const configured = configuredNamespaces[selectedCluster] || [];

  const handleLoadServices = async (namespace: string) => {
    if (selectedCluster) {
      await loadServices(selectedCluster, namespace);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
      {configured.length === 0 ? (
        <p className="text-gray-500 text-sm">Add namespaces above to see services</p>
      ) : (
        <div className="space-y-4">
          {configured.map((namespace) => {
            const serviceKey = `${selectedCluster}:${namespace}`;
            const serviceList = services[serviceKey] || [];

            return (
              <div key={namespace} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-800">{namespace}</h3>
                  <button
                    onClick={() => handleLoadServices(namespace)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Refresh
                  </button>
                </div>
                {serviceList.length === 0 ? (
                  <p className="text-gray-500 text-sm">No services found</p>
                ) : (
                  <div className="space-y-2">
                    {serviceList.map((service) => (
                      <ServiceCard
                        key={service.name}
                        service={service}
                        cluster={selectedCluster}
                        namespace={namespace}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const [localPort, setLocalPort] = useState(port.port.toString());
  const [starting, setStarting] = useState(false);

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

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700">
          {port.name} ({port.protocol})
        </div>
        <div className="text-xs text-gray-500">
          Service: {port.port} → Local: {localPort}
        </div>
      </div>
      <input
        type="number"
        value={localPort}
        onChange={(e) => setLocalPort(e.target.value)}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
        placeholder="Local port"
        min="1"
        max="65535"
      />
      <button
        onClick={handleStart}
        disabled={starting || !localPort}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {starting ? 'Starting...' : 'Start'}
      </button>
    </div>
  );
}

