import { useEffect, useState } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import {
  ServicePortInfo,
  PortForwardState,
  ClusterInfo,
} from "../types/electron";

export function ServiceList() {
  const { clusters, services, selectedServices } = usePortForwardStore();
  const { refreshActiveForwards } = useK8s();
  const [expandedClusters, setExpandedClusters] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    refreshActiveForwards();
    const interval = setInterval(refreshActiveForwards, 2000);
    return () => clearInterval(interval);
  }, []);

  const getClustersWithSelectedServices = () => {
    const clusterContexts = new Set<string>();

    Object.keys(selectedServices).forEach((key) => {
      const [clusterContext] = key.split(":");
      if (clusterContext && (selectedServices[key] || []).length > 0) {
        clusterContexts.add(clusterContext);
      }
    });

    const result: Array<ClusterInfo | { context: string; name: string }> = [];

    clusterContexts.forEach((context) => {
      const existingCluster = clusters.find((c) => c.context === context);
      if (existingCluster) {
        result.push(existingCluster);
      } else {
        result.push({ context, name: context });
      }
    });

    return result;
  };

  const clustersWithSelectedServices = getClustersWithSelectedServices();

  const getSelectedServicePorts = (
    cluster: ClusterInfo | { context: string; name: string }
  ) => {
    const clusterKeys = Object.keys(selectedServices).filter((key) =>
      key.startsWith(`${cluster.context}:`)
    );
    const result: Array<{
      namespace: string;
      service: string;
      port: ServicePortInfo;
      key: string;
    }> = [];

    clusterKeys.forEach((key) => {
      const [, namespace] = key.split(":");
      const serviceList = services[key] || [];
      const selectedServicePorts = selectedServices[key] || [];

      serviceList.forEach((service) => {
        service.ports.forEach((port) => {
          const servicePortKey = `${service.name}:${port.port}`;
          if (selectedServicePorts.includes(servicePortKey)) {
            result.push({
              namespace,
              service: service.name,
              port,
              key: cluster.context,
            });
          }
        });
      });
    });

    return result;
  };

  const toggleCluster = (cluster: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [cluster]: !prev[cluster],
    }));
  };

  if (clustersWithSelectedServices.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-200 mb-6 tracking-wide">
          Services
        </h2>
        <div className="skeuo-card p-8 text-center shadow-skeuo-inset">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-skeuo-bg shadow-skeuo flex items-center justify-center text-gray-500">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <p className="text-gray-300 font-medium">No services selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Select services from namespaces below to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-200 mb-6 tracking-wide">
        Services
      </h2>
      <div className="space-y-6">
        {clustersWithSelectedServices.map((cluster) => {
          const selectedServicePorts = getSelectedServicePorts(cluster);
          const isExpanded = expandedClusters[cluster.context] || false;

          return (
            <div key={cluster.context} className="skeuo-card overflow-hidden">
              <button
                onClick={() => toggleCluster(cluster.context)}
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                  isExpanded ? "bg-skeuo-light/10" : "hover:bg-skeuo-light/5"
                }`}
              >
                <span className="font-bold text-gray-200 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  {cluster.name}
                </span>
                <div
                  className={`w-8 h-8 rounded-full shadow-skeuo flex items-center justify-center transition-all duration-300 ${
                    isExpanded
                      ? "shadow-skeuo-active text-skeuo-accent"
                      : "text-gray-400"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-6 py-6 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5">
                  <div className="grid grid-cols-1 gap-4">
                    {selectedServicePorts.map((item, index) => (
                      <ServicePortRow
                        key={`${item.service}-${item.port.port}-${index}`}
                        service={item.service}
                        port={item.port}
                        cluster={item.key}
                        namespace={item.namespace}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServicePortRow({
  service,
  port,
  cluster,
  namespace,
}: {
  service: string;
  port: ServicePortInfo;
  cluster: string;
  namespace: string;
}) {
  const { activeForwards, setPortOverride, getPortOverride } =
    usePortForwardStore();
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

  const forwardId = `${cluster}-${namespace}-${service}-${port.port}-${parseInt(
    localPort,
    10
  )}`;
  const activeForward = activeForwards.find(
    (f: { id: string; state: PortForwardState; localPort: number }) =>
      f.id === forwardId
  );
  const isActive =
    activeForward && activeForward.state === PortForwardState.ACTIVE;

  const handleStart = async () => {
    if (!window.electronAPI) {
      alert("Electron API not available");
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
      alert(
        error instanceof Error ? error.message : "Failed to start port forward"
      );
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!window.electronAPI || !activeForward) return;
    try {
      await window.electronAPI.stopPortForward(activeForward.id);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to stop port forward"
      );
    }
  };

  const handleOpenBrowser = () => {
    if (window.electronAPI && activeForward) {
      window.electronAPI.openInBrowser(
        `http://localhost:${activeForward.localPort}`
      );
    }
  };

  return (
    <div
      className={`
      flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl transition-all duration-300
      ${
        isActive
          ? "bg-skeuo-bg shadow-skeuo-active border border-green-500/20"
          : "bg-skeuo-bg shadow-skeuo border border-transparent"
      }
    `}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full shadow-inner flex-shrink-0 ${
            isActive
              ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
              : "bg-gray-600"
          }`}
        />
        <div className="flex flex-col overflow-hidden">
          <span
            className={`text-base font-bold truncate ${
              isActive ? "text-green-400" : "text-gray-200"
            }`}
          >
            {service}
          </span>
          <div className="flex items-center text-xs text-gray-400 space-x-2">
            <span className="font-medium">{port.name}</span>
            <span>•</span>
            <span>
              {port.port}/{port.protocol}
            </span>
            <span>•</span>
            <span>{namespace}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:ml-auto">
        <div className="flex items-center bg-skeuo-dark rounded-lg p-1 shadow-skeuo-inset">
          <span className="text-xs text-gray-500 px-2">→</span>
          <input
            type="number"
            value={localPort}
            onChange={(e) => handlePortChange(e.target.value)}
            className="w-16 bg-transparent text-sm font-mono text-right text-gray-200 focus:outline-none px-1"
            placeholder="Local"
            min="1"
            max="65535"
            disabled={starting || isActive}
          />
        </div>

        {isActive ? (
          <div className="flex gap-2">
            <button
              onClick={handleOpenBrowser}
              className="skeuo-btn px-3 py-2 rounded-lg text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1"
              title="Open in Browser"
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
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button
              onClick={handleStop}
              className="skeuo-btn px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 shadow-none hover:shadow-skeuo active:shadow-skeuo-active"
              title="Stop Forwarding"
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
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting || !localPort}
            className={`
              px-5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-all
              ${
                starting || !localPort
                  ? "bg-gray-600 shadow-none cursor-not-allowed opacity-50"
                  : "bg-skeuo-accent skeuo-btn hover:brightness-110"
              }
            `}
          >
            {starting ? (
              <>
                <svg
                  className="animate-spin w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Starting
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Start
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
