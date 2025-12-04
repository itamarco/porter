import { useState, useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { Group, ClusterInfo, ServiceInfo } from '../types/electron';

interface GroupFormProps {
  group: Group | null;
  onClose: () => void;
}

export function GroupForm({ group, onClose }: GroupFormProps) {
  const { clusters, services, createGroup, updateGroup } = usePortForwardStore();
  const [name, setName] = useState(group?.name || '');
  const [selectedServicePorts, setSelectedServicePorts] = useState<Set<string>>(
    new Set(group?.servicePorts || [])
  );
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [expandedNamespaces, setExpandedNamespaces] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedServicePorts(new Set(group.servicePorts));
    }
  }, [group]);

  const toggleCluster = (cluster: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [cluster]: !prev[cluster],
    }));
  };

  const toggleNamespace = (cluster: string, namespace: string) => {
    const key = `${cluster}:${namespace}`;
    setExpandedNamespaces((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleServicePort = (cluster: string, namespace: string, service: string, port: number) => {
    const key = `${cluster}:${namespace}:${service}:${port}`;
    setSelectedServicePorts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }
    if (selectedServicePorts.size === 0) {
      alert('Please select at least one service port');
      return;
    }

    if (group) {
      updateGroup(group.id, name.trim(), Array.from(selectedServicePorts));
    } else {
      createGroup(name.trim(), Array.from(selectedServicePorts));
    }
    onClose();
  };

  const getAvailableServices = () => {
    const result: Array<{
      cluster: ClusterInfo;
      namespace: string;
      service: ServiceInfo;
      port: { name: string; port: number; protocol: string };
    }> = [];

    clusters.forEach((cluster) => {
      Object.keys(services).forEach((key) => {
        if (key.startsWith(`${cluster.context}:`)) {
          const [, namespace] = key.split(':');
          const serviceList = services[key] || [];
          serviceList.forEach((service) => {
            service.ports.forEach((port) => {
              result.push({
                cluster,
                namespace,
                service,
                port: {
                  name: port.name,
                  port: port.port,
                  protocol: port.protocol,
                },
              });
            });
          });
        }
      });
    });

    return result;
  };

  const availableServices = getAvailableServices();
  const servicesByCluster = availableServices.reduce((acc, item) => {
    if (!acc[item.cluster.context]) {
      acc[item.cluster.context] = {};
    }
    if (!acc[item.cluster.context][item.namespace]) {
      acc[item.cluster.context][item.namespace] = [];
    }
    acc[item.cluster.context][item.namespace].push(item);
    return acc;
  }, {} as Record<string, Record<string, typeof availableServices>>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-100">
            {group ? 'Edit Group' : 'Create Group'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 glass-button rounded-lg p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-100 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 glass-input rounded-lg text-gray-100 placeholder-gray-400"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-100 mb-3">
              Select Services ({selectedServicePorts.size} selected)
            </label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {clusters.length === 0 ? (
                <p className="text-sm text-gray-300">No clusters available</p>
              ) : (
                clusters.map((cluster) => {
                  const clusterServices = servicesByCluster[cluster.context] || {};
                  const namespaceKeys = Object.keys(clusterServices);
                  const isClusterExpanded = expandedClusters[cluster.context] || false;

                  if (namespaceKeys.length === 0) {
                    return null;
                  }

                  return (
                    <div key={cluster.context} className="glass-card rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleCluster(cluster.context)}
                        className="w-full px-4 py-3 flex items-center justify-between glass-button rounded-t-lg"
                      >
                        <span className="font-semibold text-gray-100">{cluster.name}</span>
                        <svg
                          className={`w-5 h-5 text-gray-300 transition-transform ${isClusterExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isClusterExpanded && (
                        <div className="px-4 py-3 border-t border-white/10 bg-black/20 space-y-2">
                          {namespaceKeys.map((namespace) => {
                            const namespaceServices = clusterServices[namespace] || [];
                            const namespaceKey = `${cluster.context}:${namespace}`;
                            const isNamespaceExpanded = expandedNamespaces[namespaceKey] || false;

                            return (
                              <div key={namespaceKey} className="glass-card rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => toggleNamespace(cluster.context, namespace)}
                                  className="w-full px-3 py-2 flex items-center justify-between glass-button rounded-t-lg"
                                >
                                  <span className="text-sm font-medium text-gray-100">{namespace}</span>
                                  <svg
                                    className={`w-4 h-4 text-gray-300 transition-transform ${isNamespaceExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {isNamespaceExpanded && (
                                  <div className="px-3 py-2 border-t border-white/10 bg-black/20 space-y-2">
                                    {namespaceServices.map((item, index) => {
                                      const servicePortKey = `${cluster.context}:${namespace}:${item.service.name}:${item.port.port}`;
                                      const isSelected = selectedServicePorts.has(servicePortKey);

                                      return (
                                        <label
                                          key={`${servicePortKey}-${index}`}
                                          className={`flex items-center px-3 py-2 rounded-lg cursor-pointer glass ${isSelected ? 'border-blue-300/40' : 'border-white/10'}`}
                                          style={isSelected ? {
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            borderColor: 'rgba(59, 130, 246, 0.35)'
                                          } : {}}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleServicePort(cluster.context, namespace, item.service.name, item.port.port)}
                                            className="w-4 h-4 rounded border-white/30 bg-black/50 text-blue-600 focus:ring-blue-400 focus:ring-2"
                                            style={{ accentColor: '#3b82f6' }}
                                          />
                                          <span className="ml-3 text-sm text-gray-100">
                                            <span className="font-semibold">{item.service.name}</span>
                                            {' '}
                                            <span className="text-gray-400">
                                              - {item.port.name} ({item.port.port}/{item.port.protocol})
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-100"
            style={{
              background: 'rgba(59, 130, 246, 0.25)',
              borderColor: 'rgba(59, 130, 246, 0.4)'
            }}
          >
            {group ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

