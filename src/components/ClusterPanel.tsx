import { useState, useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ServiceInfo, ServicePortInfo, PortForwardState } from '../types/electron';

export function ClusterPanel() {
  const { clusters, configuredNamespaces, services } = usePortForwardStore();
  const { loadServices, loadNamespaces, refreshActiveForwards } = useK8s();
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [clusterNamespaces, setClusterNamespaces] = useState<Record<string, string[]>>({});

  useEffect(() => {
    refreshActiveForwards();
    const interval = setInterval(refreshActiveForwards, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleCluster = (cluster: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [cluster]: !prev[cluster],
    }));
  };

  const handleAddNamespace = async (cluster: string, namespace: string) => {
    const { addNamespace } = usePortForwardStore.getState();
    if (!configuredNamespaces[cluster]?.includes(namespace)) {
      addNamespace(cluster, namespace);
      await loadServices(cluster, namespace);
    }
  };

  const handleRemoveNamespace = (cluster: string, namespace: string) => {
    const { removeNamespace } = usePortForwardStore.getState();
    removeNamespace(cluster, namespace);
  };

  const handleRefreshServices = async (cluster: string, namespace: string) => {
    await loadServices(cluster, namespace);
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Clusters</h2>
      {clusters.length === 0 ? (
        <p className="text-gray-500 text-sm">No clusters found</p>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => (
            <ClusterPane
              key={cluster.context}
              cluster={cluster}
              isExpanded={expandedClusters[cluster.context] || false}
              onToggle={() => toggleCluster(cluster.context)}
              configuredNamespaces={configuredNamespaces[cluster.context] || []}
              availableNamespaces={clusterNamespaces[cluster.context] || []}
              services={services}
              onAddNamespace={(ns) => handleAddNamespace(cluster.context, ns)}
              onRemoveNamespace={(ns) => handleRemoveNamespace(cluster.context, ns)}
              onRefreshServices={(ns) => handleRefreshServices(cluster.context, ns)}
              onLoadNamespaces={async () => {
                const namespaces = await loadNamespaces(cluster.context);
                setClusterNamespaces((prev) => ({
                  ...prev,
                  [cluster.context]: namespaces,
                }));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterPane({
  cluster,
  isExpanded,
  onToggle,
  configuredNamespaces,
  availableNamespaces,
  services,
  onAddNamespace,
  onRemoveNamespace,
  onRefreshServices,
  onLoadNamespaces,
}: {
  cluster: { name: string; context: string };
  isExpanded: boolean;
  onToggle: () => void;
  configuredNamespaces: string[];
  availableNamespaces: string[];
  services: Record<string, ServiceInfo[]>;
  onAddNamespace: (namespace: string) => void;
  onRemoveNamespace: (namespace: string) => void;
  onRefreshServices: (namespace: string) => void;
  onLoadNamespaces: () => Promise<void>;
}) {
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);

  useEffect(() => {
    if (isExpanded && availableNamespaces.length === 0) {
      loadNamespacesForCluster();
    }
  }, [isExpanded]);

  const loadNamespacesForCluster = async () => {
    setLoadingNamespaces(true);
    try {
      await onLoadNamespaces();
    } finally {
      setLoadingNamespaces(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">{cluster.name}</span>
          {configuredNamespaces.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {configuredNamespaces.length} namespace{configuredNamespaces.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Namespaces
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAddNamespace(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={loadingNamespaces}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Add namespace --</option>
              {availableNamespaces.length === 0 && !loadingNamespaces && (
                <option disabled>Click to load namespaces</option>
              )}
              {availableNamespaces
                .filter((ns) => !configuredNamespaces.includes(ns))
                .map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
            </select>
            {loadingNamespaces && (
              <p className="text-xs text-gray-500 mt-1">Loading namespaces...</p>
            )}
          </div>

          {configuredNamespaces.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {configuredNamespaces.map((ns) => (
                  <span
                    key={ns}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {ns}
                    <button
                      onClick={() => onRemoveNamespace(ns)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="space-y-4">
                {configuredNamespaces.map((namespace) => {
                  const serviceKey = `${cluster.context}:${namespace}`;
                  const serviceList = services[serviceKey] || [];

                  return (
                    <div key={namespace} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-700">{namespace}</h4>
                        <button
                          onClick={() => onRefreshServices(namespace)}
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
          )}
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
  return (
    <div className="border border-gray-200 rounded p-3 bg-white">
      <div className="mb-2">
        <span className="font-medium text-gray-900">{service.name}</span>
      </div>
      <div className="space-y-2">
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
  const { activeForwards, portOverrides, setPortOverride, getPortOverride } = usePortForwardStore();
  const portOverrideKey = `${cluster}:${namespace}:${service}:${port.port}`;
  const savedPort = getPortOverride(portOverrideKey);
  const [localPort, setLocalPort] = useState(
    savedPort ? savedPort.toString() : port.port.toString()
  );
  const [starting, setStarting] = useState(false);

  const handlePortChange = (newPort: string) => {
    setLocalPort(newPort);
    const portNum = parseInt(newPort, 10);
    if (!isNaN(portNum) && portNum > 0) {
      setPortOverride(portOverrideKey, portNum);
    }
  };

  const forwardId = `${cluster}-${namespace}-${service}-${port.port}-${parseInt(localPort, 10)}`;
  const activeForward = activeForwards.find((f) => f.id === forwardId);
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
            onChange={(e) => handlePortChange(e.target.value)}
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
