import { useEffect, useState } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import {
  ServicePortInfo,
  PortForwardState,
  ClusterInfo,
} from "../types/electron";
import { showToast } from "./Toast";

export function ServiceList() {
  const {
    clusters,
    services,
    selectedServices,
    activeForwards,
    getPortOverride,
  } = usePortForwardStore();
  const { refreshActiveForwards } = useK8s();
  const [expandedClusters, setExpandedClusters] = useState<
    Record<string, boolean>
  >({});
  const [startingAll, setStartingAll] = useState<Record<string, boolean>>({});
  const [stoppingAll, setStoppingAll] = useState<Record<string, boolean>>({});

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

  const getClusterActiveForwards = (
    cluster: ClusterInfo | { context: string; name: string }
  ) => {
    const selectedServicePorts = getSelectedServicePorts(cluster);
    return activeForwards.filter((forward) => {
      return selectedServicePorts.some((ssp) => {
        const forwardId = `${ssp.key}-${ssp.namespace}-${ssp.service}-${ssp.port.port}-${forward.localPort}`;
        return (
          forward.id === forwardId ||
          (forward.cluster === ssp.key &&
            forward.namespace === ssp.namespace &&
            forward.service === ssp.service &&
            forward.servicePort === ssp.port.port)
        );
      });
    });
  };

  const handleStartAll = async (
    cluster: ClusterInfo | { context: string; name: string }
  ) => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    setStartingAll((prev) => ({ ...prev, [cluster.context]: true }));
    try {
      const selectedServicePorts = getSelectedServicePorts(cluster);

      for (const ssp of selectedServicePorts) {
        const portOverrideKey = `${ssp.key}:${ssp.namespace}:${ssp.service}:${ssp.port.port}`;
        const localPort = getPortOverride(portOverrideKey) || ssp.port.port;

        try {
          await window.electronAPI.startPortForward({
            cluster: ssp.key,
            namespace: ssp.namespace,
            service: ssp.service,
            servicePort: ssp.port.port,
            localPort,
          });
        } catch (error) {
          console.error(
            `Failed to start port forward for ${ssp.service}:${ssp.port.port}`,
            error
          );
        }
      }

      await refreshActiveForwards();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start all port forwards"
      );
    } finally {
      setStartingAll((prev) => ({ ...prev, [cluster.context]: false }));
    }
  };

  const handleStopAll = async (
    cluster: ClusterInfo | { context: string; name: string }
  ) => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    setStoppingAll((prev) => ({ ...prev, [cluster.context]: true }));
    try {
      const activeForwardsForCluster = getClusterActiveForwards(cluster);

      for (const forward of activeForwardsForCluster) {
        try {
          await window.electronAPI.stopPortForward(forward.id);
        } catch (error) {
          console.error(`Failed to stop port forward ${forward.id}`, error);
        }
      }

      await refreshActiveForwards();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to stop all port forwards"
      );
    } finally {
      setStoppingAll((prev) => ({ ...prev, [cluster.context]: false }));
    }
  };

  if (clustersWithSelectedServices.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-200 mb-4 tracking-wide">
          Selected Services
        </h2>
        <div className="skeuo-card p-6 text-center shadow-skeuo-inset">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-skeuo-bg shadow-skeuo flex items-center justify-center text-gray-500">
            <svg
              className="w-6 h-6"
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
          <p className="text-gray-300 font-medium text-sm">
            No services selected
          </p>
          <p className="text-xs text-gray-500 mt-1.5">
            Select services from namespaces below to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-200 mb-4 tracking-wide">
        Selected Services
      </h2>
      <div className="space-y-4">
        {clustersWithSelectedServices.map((cluster) => {
          const selectedServicePorts = getSelectedServicePorts(cluster);
          const isExpanded = expandedClusters[cluster.context] || false;
          const activeForwardsForCluster = getClusterActiveForwards(cluster);
          const allActive =
            selectedServicePorts.length > 0 &&
            activeForwardsForCluster.length === selectedServicePorts.length &&
            activeForwardsForCluster.every(
              (f) => f.state === PortForwardState.ACTIVE
            );
          const isStarting = startingAll[cluster.context] || false;
          const isStopping = stoppingAll[cluster.context] || false;

          return (
            <div key={cluster.context} className="skeuo-card overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between">
                <button
                  onClick={() => toggleCluster(cluster.context)}
                  className={`flex-1 flex items-center justify-between transition-colors text-left ${
                    isExpanded ? "bg-skeuo-light/10" : "hover:bg-skeuo-light/5"
                  } -mx-5 -my-3 px-5 py-3`}
                >
                  <span className="font-bold text-base text-gray-200 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-400"
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
                    className={`w-7 h-7 rounded-full shadow-skeuo flex items-center justify-center transition-all duration-300 ${
                      isExpanded
                        ? "shadow-skeuo-active text-skeuo-accent"
                        : "text-gray-400"
                    }`}
                  >
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
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

                <div className="flex gap-2 ml-5">
                  <button
                    onClick={() => handleStartAll(cluster)}
                    disabled={isStarting || isStopping || allActive}
                    className={`
                      px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs
                      ${
                        isStarting || allActive
                          ? "text-gray-600 bg-skeuo-bg shadow-none cursor-not-allowed"
                          : "skeuo-btn text-green-400 hover:text-green-300"
                      }
                    `}
                    title="Start All"
                  >
                    {isStarting ? (
                      <>
                        <svg
                          className="animate-spin w-3.5 h-3.5"
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
                        <span>Starting</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Start</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleStopAll(cluster)}
                    disabled={
                      isStopping || activeForwardsForCluster.length === 0
                    }
                    className={`
                      px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs
                      ${
                        isStopping || activeForwardsForCluster.length === 0
                          ? "text-gray-600 bg-skeuo-bg shadow-none cursor-not-allowed"
                          : "skeuo-btn text-red-400 hover:text-red-300"
                      }
                    `}
                    title="Stop All"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    <span>Stop</span>
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 py-4 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5">
                  <div className="grid grid-cols-1 gap-3">
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
      showToast("Electron API not available", "error");
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
      showToast(
        error instanceof Error ? error.message : "Failed to start port forward",
        "error"
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
      flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl transition-all duration-300
      ${
        isActive
          ? "bg-skeuo-bg shadow-skeuo-active border border-green-500/20"
          : "bg-skeuo-bg shadow-skeuo border border-transparent"
      }
    `}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        <div
          className={`w-2.5 h-2.5 rounded-full shadow-inner flex-shrink-0 ${
            isActive
              ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
              : "bg-gray-600"
          }`}
        />
        <div className="flex flex-col overflow-hidden">
          <span
            className={`text-sm font-bold truncate ${
              isActive ? "text-green-400" : "text-gray-200"
            }`}
          >
            {service}
          </span>
          <div className="flex items-center text-[10px] text-gray-400 space-x-1.5">
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

      <div className="flex items-center gap-2 sm:ml-auto">
        <div className="flex items-center bg-skeuo-dark rounded-lg p-1 shadow-skeuo-inset">
          <span className="text-[10px] text-gray-500 px-1.5">→</span>
          <input
            type="number"
            value={localPort}
            onChange={(e) => handlePortChange(e.target.value)}
            className="w-14 bg-transparent text-xs font-mono text-right text-gray-200 focus:outline-none px-1"
            placeholder="Local"
            min="1"
            max="65535"
            disabled={starting || isActive}
          />
        </div>

        {isActive ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleOpenBrowser}
              className="skeuo-btn px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-gray-200 hover:text-white flex items-center gap-1"
              title="Open in Browser"
            >
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button
              onClick={handleStop}
              className="skeuo-btn px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 shadow-none hover:shadow-skeuo active:shadow-skeuo-active"
              title="Stop Forwarding"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              <span>Stop</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting || !localPort}
            className={`
              px-4 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5 transition-all
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
                  className="animate-spin w-2.5 h-2.5"
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
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
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
