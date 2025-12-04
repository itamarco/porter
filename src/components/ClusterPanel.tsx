import { useState, useEffect, useRef } from 'react';
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
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Namespaces</h2>
      {clusters.length === 0 ? (
        <p className="text-gray-500 text-sm">No clusters found</p>
      ) : (
        <div className="space-y-2">
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
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">{cluster.name}</span>
          {availableNamespaces.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {availableNamespaces.length} namespace{availableNamespaces.length !== 1 ? 's' : ''}
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
          {loadingNamespaces ? (
            <p className="text-xs text-gray-500">Loading namespaces...</p>
          ) : availableNamespaces.length === 0 ? (
            <p className="text-xs text-gray-500">No namespaces found</p>
          ) : (
            <div className="flex flex-wrap gap-2">
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const serviceKey = `${cluster}:${namespace}`;
  const serviceList = services[serviceKey] || [];
  const selectedServicePorts = selectedServices[serviceKey] || [];
  const selectedCount = selectedServicePorts.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleChipClick = async () => {
    if (!isDropdownOpen && serviceList.length === 0) {
      setLoadingServices(true);
      try {
        await onLoadServices(cluster, namespace);
      } finally {
        setLoadingServices(false);
      }
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleServicePortToggle = (serviceName: string, port: number) => {
    toggleServicePortSelection(cluster, namespace, serviceName, port);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleChipClick}
        disabled={loadingServices}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          selectedCount > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        } ${loadingServices ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {namespace}
        {selectedCount > 0 && (
          <span className="ml-2 bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-semibold">
            {selectedCount}
          </span>
        )}
        {loadingServices && (
          <span className="ml-2">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">{namespace}</h4>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-2">
            {serviceList.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">No services found</p>
            ) : (
              <div className="space-y-2">
                {serviceList.map((service) => (
                  <div key={service.name} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                    <div className="text-xs font-semibold text-gray-600 mb-1 px-2">{service.name}</div>
                    <div className="space-y-1">
                      {service.ports.map((port) => {
                        const servicePortKey = `${service.name}:${port.port}`;
                        const isSelected = selectedServicePorts.includes(servicePortKey);
                        return (
                          <label
                            key={`${service.name}-${port.port}`}
                            className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleServicePortToggle(service.name, port.port)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
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
        </div>
      )}
    </div>
  );
}
