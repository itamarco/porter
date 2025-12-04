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
      <h2 className="text-2xl font-bold text-gray-200 mb-6 tracking-wide">Namespaces</h2>
      {clusters.length === 0 ? (
        <div className="skeuo-card p-6 text-center">
          <p className="text-gray-400 text-lg">No clusters found</p>
        </div>
      ) : (
        <div className="space-y-6">
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
    <div className={`skeuo-card overflow-hidden transition-all duration-300 ${isExpanded ? 'p-1' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-full px-6 py-5 flex items-center justify-between transition-all duration-200 outline-none ${isExpanded ? 'skeuo-btn mb-4 rounded-xl' : 'hover:bg-skeuo-light/30 rounded-2xl'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full shadow-skeuo-sm ${isExpanded ? 'bg-skeuo-accent' : 'bg-gray-500'}`} />
          <span className="font-bold text-lg text-gray-200 tracking-wide">{cluster.name}</span>
          {availableNamespaces.length > 0 && (
            <span className="text-xs font-bold text-gray-400 skeuo-badge px-3 py-1">
              {availableNamespaces.length} NS
            </span>
          )}
        </div>
        <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'shadow-skeuo-active text-skeuo-accent' : 'shadow-skeuo text-gray-400'}`}>
        <svg
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="rounded-2xl shadow-skeuo-inset bg-skeuo-dark p-4">
          {loadingNamespaces ? (
            <div className="px-4 py-6 text-center">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-skeuo-light"></div>
                <p className="text-sm text-gray-400 font-medium">Loading namespaces...</p>
              </div>
            </div>
          ) : availableNamespaces.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-400">No namespaces found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
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
    <div className="skeuo-card overflow-hidden">
      <button
        onClick={handleToggle}
        disabled={loadingServices}
        className={`w-full px-5 py-4 flex items-center justify-between outline-none transition-all ${
          loadingServices ? 'opacity-60 cursor-not-allowed' : 'hover:bg-skeuo-light/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${selectedCount > 0 ? 'bg-skeuo-accent shadow-[0_0_8px_rgba(109,93,252,0.6)]' : 'bg-gray-600'}`} />
          <span className="text-base font-semibold text-gray-200">{namespace}</span>
          {selectedCount > 0 && (
            <span className="skeuo-badge px-2.5 py-0.5 text-xs font-bold text-skeuo-accent shadow-skeuo-inset-sm">
              {selectedCount}
            </span>
          )}
          {loadingServices && (
            <svg className="animate-spin h-4 w-4 text-skeuo-accent ml-2" fill="none" viewBox="0 0 24 24">
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
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-5 py-4 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5">
          {serviceList.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No services found</p>
          ) : (
            <div className="space-y-4">
              {serviceList.map((service) => (
                <div key={service.name} className="pb-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">{service.name}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {service.ports.map((port) => {
                      const servicePortKey = `${service.name}:${port.port}`;
                      const isSelected = selectedServicePorts.includes(servicePortKey);
                      return (
                        <label
                          key={`${service.name}-${port.port}`}
                          className={`
                            flex items-center px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                            ${isSelected 
                              ? 'bg-skeuo-bg shadow-skeuo-active border border-skeuo-accent/20' 
                              : 'bg-skeuo-bg shadow-skeuo hover:translate-y-[-2px] border border-transparent'}
                          `}
                        >
                          <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleServicePortToggle(service.name, port.port)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-skeuo-accent bg-skeuo-accent text-white' 
                                : 'border-gray-500 bg-transparent'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.72 8.68L1.2 6.16L0.28 7.08L3.72 10.52L11.08 3.16L10.16 2.24L3.72 8.68Z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className={`ml-3 text-sm font-medium transition-colors ${isSelected ? 'text-skeuo-accent' : 'text-gray-300'}`}>
                            {port.name} <span className="text-xs opacity-70">({port.port}/{port.protocol})</span>
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
