import { useState, useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ClusterInfo } from '../types/electron';

export function ClusterPanel() {
  const { clusters } = usePortForwardStore();
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

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-100 mb-4">Namespaces</h2>
      {clusters.length === 0 ? (
        <p className="text-gray-300 text-base">No clusters found</p>
      ) : (
        <div className="space-y-3">
          {clusters.map((cluster: ClusterInfo) => (
            <ClusterPane
              key={cluster.context}
              cluster={cluster}
              isExpanded={expandedClusters[cluster.context] || false}
              onToggle={() => toggleCluster(cluster.context)}
              availableNamespaces={clusterNamespaces[cluster.context] || []}
              onLoadNamespaces={async () => {
                const namespaces = await loadNamespaces(cluster.context);
                setClusterNamespaces((prev) => ({
                  ...prev,
                  [cluster.context]: namespaces,
                }));
              }}
              onLoadServices={loadServices}
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
  availableNamespaces,
  onLoadNamespaces,
  onLoadServices,
}: {
  cluster: { name: string; context: string };
  isExpanded: boolean;
  onToggle: () => void;
  availableNamespaces: string[];
  onLoadNamespaces: () => Promise<void>;
  onLoadServices: (cluster: string, namespace: string) => Promise<void>;
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
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between glass-button rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-100">{cluster.name}</span>
          {availableNamespaces.length > 0 && (
            <span className="text-xs font-medium text-gray-300 glass-badge px-3 py-1 rounded-full">
              {availableNamespaces.length} namespace{availableNamespaces.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 bg-black/20">
          {loadingNamespaces ? (
            <div className="px-5 py-4">
              <p className="text-sm text-gray-300">Loading namespaces...</p>
            </div>
          ) : availableNamespaces.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-sm text-gray-300">No namespaces found</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {availableNamespaces.map((namespace) => (
                <NamespaceChip
                  key={namespace}
                  cluster={cluster.context}
                  namespace={namespace}
                  onLoadServices={onLoadServices}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NamespaceChip({
  cluster,
  namespace,
  onLoadServices,
}: {
  cluster: string;
  namespace: string;
  onLoadServices: (cluster: string, namespace: string) => Promise<void>;
}) {
  const { services, selectedServices, toggleServicePortSelection } = usePortForwardStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const serviceKey = `${cluster}:${namespace}`;
  const serviceList = services[serviceKey] || [];
  const selectedServicePorts = selectedServices[serviceKey] || [];
  const selectedCount = selectedServicePorts.length;

  const handleToggle = async () => {
    if (!isExpanded && serviceList.length === 0) {
      setLoadingServices(true);
      try {
        await onLoadServices(cluster, namespace);
      } finally {
        setLoadingServices(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleServicePortToggle = (serviceName: string, port: number) => {
    toggleServicePortSelection(cluster, namespace, serviceName, port);
  };

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <button
        onClick={handleToggle}
        disabled={loadingServices}
        className={`w-full px-4 py-3 flex items-center justify-between glass-button rounded-t-lg ${
          loadingServices ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-100">{namespace}</span>
          {selectedCount > 0 && (
            <span className="glass-badge px-2 py-0.5 text-xs font-bold text-gray-100 rounded-full">
              {selectedCount}
            </span>
          )}
          {loadingServices && (
            <svg className="animate-spin h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          {serviceList.length === 0 ? (
            <p className="text-sm text-gray-300">No services found</p>
          ) : (
            <div className="space-y-3">
              {serviceList.map((service) => (
                <div key={service.name} className="border-b border-white/5 last:border-b-0 pb-3 last:pb-0">
                  <div className="text-xs font-semibold text-gray-100 mb-2 px-2">{service.name}</div>
                  <div className="space-y-2">
                    {service.ports.map((port) => {
                      const servicePortKey = `${service.name}:${port.port}`;
                      const isSelected = selectedServicePorts.includes(servicePortKey);
                      return (
                        <label
                          key={`${service.name}-${port.port}`}
                          className={`flex items-center px-3 py-2 rounded-lg cursor-pointer glass ${isSelected ? 'border-blue-300/40' : 'border-white/10'}`}
                          style={isSelected ? {
                            background: 'rgba(59, 130, 246, 0.15)',
                            borderColor: 'rgba(59, 130, 246, 0.35)'
                          } : {}}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleServicePortToggle(service.name, port.port)}
                            className="w-4 h-4 rounded border-gray-300 bg-black/50 text-blue-600 focus:ring-blue-400 focus:ring-2"
                            style={{ accentColor: '#3b82f6' }}
                          />
                          <span className="ml-3 text-sm text-gray-100">
                            {port.name} ({port.port}/{port.protocol})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
