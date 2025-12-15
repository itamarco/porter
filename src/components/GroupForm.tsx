import { useState, useEffect, useMemo } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { ClusterInfo, ServiceInfo } from "../types/electron";

interface GroupFormProps {
  group: any | null;
  onClose: () => void;
}

export function GroupForm({ group, onClose }: GroupFormProps) {
  const { clusters, services, selectedServices, createGroup, updateGroup } =
    usePortForwardStore();
  const [name, setName] = useState(group?.name || "");
  const [selectedServicePorts, setSelectedServicePorts] = useState<Set<string>>(
    () => {
      if (group?.servicePorts?.length) {
        return new Set(group.servicePorts);
      }
      const initial = new Set<string>();
      Object.keys(selectedServices || {}).forEach((key) => {
        const [clusterContext, namespace] = key.split(":");
        const ports = selectedServices[key] || [];
        ports.forEach((servicePortKey) => {
          const [serviceName, portStr] = servicePortKey.split(":");
          if (!clusterContext || !namespace || !serviceName || !portStr) return;
          initial.add(
            `${clusterContext}:${namespace}:${serviceName}:${portStr}`
          );
        });
      });
      return initial;
    }
  );
  const [expandedClusters, setExpandedClusters] = useState<
    Record<string, boolean>
  >({});
  const [expandedNamespaces, setExpandedNamespaces] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSelectedServicePorts(new Set(group.servicePorts));
    }
  }, [group]);

  const parseGroupServicePortKey = (key: string) => {
    const parts = key.split(":");
    if (parts.length !== 4) return null;
    const [clusterContext, namespace, service, portStr] = parts;
    const port = parseInt(portStr, 10);
    if (!clusterContext || !namespace || !service || Number.isNaN(port))
      return null;
    return { clusterContext, namespace, service, port };
  };

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

  const toggleServicePort = (
    cluster: string,
    namespace: string,
    service: string,
    port: number
  ) => {
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
      alert("Please enter a group name");
      return;
    }
    if (selectedServicePorts.size === 0) {
      alert("Please select at least one service port");
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

    const candidatePorts = new Set<string>();

    // Creating a group should only allow choosing from currently selected service ports.
    Object.keys(selectedServices || {}).forEach((key) => {
      const [clusterContext, namespace] = key.split(":");
      const ports = selectedServices[key] || [];
      ports.forEach((servicePortKey) => {
        const [serviceName, portStr] = servicePortKey.split(":");
        if (!clusterContext || !namespace || !serviceName || !portStr) return;
        candidatePorts.add(
          `${clusterContext}:${namespace}:${serviceName}:${portStr}`
        );
      });
    });

    // When editing, also include ports already in the group even if not currently selected.
    (group?.servicePorts || []).forEach((key: string) =>
      candidatePorts.add(key)
    );

    candidatePorts.forEach((fullKey) => {
      const parsed = parseGroupServicePortKey(fullKey);
      if (!parsed) return;

      const { clusterContext, namespace, service: serviceName, port } = parsed;
      const cluster =
        clusters.find((c) => c.context === clusterContext) ||
        ({
          context: clusterContext,
          name: clusterContext,
          server: "",
        } as ClusterInfo);

      const serviceList = services[`${clusterContext}:${namespace}`] || [];
      const service =
        serviceList.find((s) => s.name === serviceName) ||
        ({
          name: serviceName,
          namespace,
          ports: [],
        } as ServiceInfo);

      const portInfo = serviceList
        .find((s) => s.name === serviceName)
        ?.ports.find((p) => p.port === port);

      result.push({
        cluster,
        namespace,
        service,
        port: {
          name: portInfo?.name || `${port}`,
          port,
          protocol: portInfo?.protocol || "TCP",
        },
      });
    });

    return result;
  };

  const availableServices = useMemo(
    () => getAvailableServices(),
    [clusters, services, selectedServices, group]
  );
  const servicesByCluster = useMemo(() => {
    return availableServices.reduce((acc, item) => {
      if (!acc[item.cluster.context]) {
        acc[item.cluster.context] = {};
      }
      if (!acc[item.cluster.context][item.namespace]) {
        acc[item.cluster.context][item.namespace] = [];
      }
      acc[item.cluster.context][item.namespace].push(item);
      return acc;
    }, {} as Record<string, Record<string, typeof availableServices>>);
  }, [availableServices]);

  const clustersToRender = useMemo(() => {
    const contexts = Object.keys(servicesByCluster);
    return contexts
      .map((context) => {
        return (
          clusters.find((c) => c.context === context) ||
          ({
            context,
            name: context,
            server: "",
          } as ClusterInfo)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clusters, servicesByCluster]);

  return (
    <div className="fixed inset-0 bg-skeuo-dark/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="skeuo-card rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <h3 className="text-xl font-bold text-gray-200 tracking-wide">
            {group ? "Edit Group" : "Create Group"}
          </h3>
          <button
            onClick={onClose}
            className="skeuo-btn p-2 rounded-xl text-gray-500 hover:text-gray-200 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="skeuo-input w-full px-5 py-3 text-sm text-gray-200 placeholder-gray-500"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Select Services{" "}
              <span className="text-skeuo-accent font-bold">
                ({selectedServicePorts.size} selected)
              </span>
            </label>
            <div className="space-y-3">
              {clustersToRender.length === 0 ? (
                <div className="text-center p-6 skeuo-card shadow-skeuo-inset">
                  <p className="text-gray-400 font-medium text-sm">
                    No services selected
                  </p>
                </div>
              ) : (
                clustersToRender.map((cluster: ClusterInfo) => {
                  const clusterServices =
                    servicesByCluster[cluster.context] || {};
                  const namespaceKeys = Object.keys(clusterServices);
                  const isClusterExpanded =
                    expandedClusters[cluster.context] || false;

                  if (namespaceKeys.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={cluster.context}
                      className="skeuo-card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCluster(cluster.context)}
                        className={`w-full px-5 py-3 flex items-center justify-between transition-all ${
                          isClusterExpanded
                            ? "bg-skeuo-light/10"
                            : "hover:bg-skeuo-light/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              isClusterExpanded
                                ? "bg-skeuo-accent shadow-[0_0_8px_rgba(109,93,252,0.6)]"
                                : "bg-gray-600"
                            }`}
                          />
                          <span className="font-bold text-base text-gray-200">
                            {cluster.name}
                          </span>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                            isClusterExpanded
                              ? "shadow-skeuo-active text-skeuo-accent"
                              : "shadow-skeuo text-gray-500"
                          }`}
                        >
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${
                              isClusterExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>
                      {isClusterExpanded && (
                        <div className="px-5 py-3 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5 space-y-3">
                          {namespaceKeys.map((namespace) => {
                            const namespaceServices =
                              clusterServices[namespace] || [];
                            const namespaceKey = `${cluster.context}:${namespace}`;
                            const isNamespaceExpanded =
                              expandedNamespaces[namespaceKey] || false;

                            return (
                              <div
                                key={namespaceKey}
                                className="skeuo-card overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleNamespace(cluster.context, namespace)
                                  }
                                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-skeuo-light/10 transition-colors"
                                >
                                  <span className="text-xs font-bold text-gray-300">
                                    {namespace}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                      isNamespaceExpanded
                                        ? "shadow-skeuo-active text-skeuo-accent"
                                        : "shadow-skeuo text-gray-500"
                                    }`}
                                  >
                                    <svg
                                      className={`w-2.5 h-2.5 transition-transform duration-300 ${
                                        isNamespaceExpanded ? "rotate-180" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </div>
                                </button>
                                {isNamespaceExpanded && (
                                  <div className="px-4 py-3 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5 space-y-2">
                                    {namespaceServices.map((item, index) => {
                                      const servicePortKey = `${cluster.context}:${namespace}:${item.service.name}:${item.port.port}`;
                                      const isSelected =
                                        selectedServicePorts.has(
                                          servicePortKey
                                        );

                                      return (
                                        <label
                                          key={`${servicePortKey}-${index}`}
                                          className={`
                                            flex items-center px-3 py-2 rounded-xl cursor-pointer transition-all
                                            ${
                                              isSelected
                                                ? "bg-skeuo-bg shadow-skeuo-active border border-skeuo-accent/20"
                                                : "bg-skeuo-bg shadow-skeuo hover:translate-y-[-2px] border border-transparent"
                                            }
                                          `}
                                        >
                                          <div className="relative flex items-center">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() =>
                                                toggleServicePort(
                                                  cluster.context,
                                                  namespace,
                                                  item.service.name,
                                                  item.port.port
                                                )
                                              }
                                              className="sr-only"
                                            />
                                            <div
                                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                                isSelected
                                                  ? "border-skeuo-accent bg-skeuo-accent text-white"
                                                  : "border-gray-500 bg-transparent"
                                              }`}
                                            >
                                              {isSelected && (
                                                <svg
                                                  className="w-2.5 h-2.5"
                                                  fill="currentColor"
                                                  viewBox="0 0 12 12"
                                                >
                                                  <path d="M3.72 8.68L1.2 6.16L0.28 7.08L3.72 10.52L11.08 3.16L10.16 2.24L3.72 8.68Z" />
                                                </svg>
                                              )}
                                            </div>
                                          </div>
                                          <span className="ml-2.5 text-xs text-gray-200">
                                            <span className="font-bold">
                                              {item.service.name}
                                            </span>
                                            <span className="mx-1.5 text-gray-600">
                                              •
                                            </span>
                                            <span className="text-gray-400">
                                              {item.port.name} ({item.port.port}
                                              /{item.port.protocol})
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

        <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="skeuo-btn px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="skeuo-btn px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-skeuo-accent hover:brightness-110"
          >
            {group ? "Update Group" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
