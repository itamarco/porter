import { useState } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import { Group, PortForwardState } from "../types/electron";
import { GroupForm } from "./GroupForm";

export function Groups() {
  const { groups, clusters, services, activeForwards, deleteGroup } =
    usePortForwardStore();
  const { refreshActiveForwards } = useK8s();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [startingAll, setStartingAll] = useState<Record<string, boolean>>({});
  const [stoppingAll, setStoppingAll] = useState<Record<string, boolean>>({});
  const [startingOne, setStartingOne] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingGroup(null);
  };

  const parseServicePortKey = (key: string) => {
    const parts = key.split(":");
    if (parts.length === 4) {
      return {
        cluster: parts[0],
        namespace: parts[1],
        service: parts[2],
        port: parseInt(parts[3], 10),
      };
    }
    return null;
  };

  const getGroupServicePorts = (group: Group) => {
    return group.servicePorts
      .map((key) => {
        const parsed = parseServicePortKey(key);
        if (!parsed) return null;

        const serviceKey = `${parsed.cluster}:${parsed.namespace}`;
        const serviceList = services[serviceKey] || [];
        const service = serviceList.find((s) => s.name === parsed.service);
        const port = service?.ports.find((p) => p.port === parsed.port);

        return parsed && service && port
          ? { ...parsed, portInfo: port, serviceInfo: service }
          : null;
      })
      .filter((item) => item !== null);
  };

  const getGroupActiveForwards = (group: Group) => {
    const groupServicePorts = getGroupServicePorts(group);
    return activeForwards.filter((forward) => {
      return groupServicePorts.some((gsp) => {
        if (!gsp) return false;
        const forwardId = `${gsp.cluster}-${gsp.namespace}-${gsp.service}-${gsp.port}-${forward.localPort}`;
        return (
          forward.id === forwardId ||
          (forward.cluster === gsp.cluster &&
            forward.namespace === gsp.namespace &&
            forward.service === gsp.service &&
            forward.servicePort === gsp.port)
        );
      });
    });
  };

  const handleStartAll = async (group: Group) => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    setStartingAll((prev) => ({ ...prev, [group.id]: true }));
    try {
      const groupServicePorts = getGroupServicePorts(group);
      const { getPortOverride } = usePortForwardStore.getState();

      for (const gsp of groupServicePorts) {
        if (!gsp) continue;

        const portOverrideKey = `${gsp.cluster}:${gsp.namespace}:${gsp.service}:${gsp.port}`;
        const localPort = getPortOverride(portOverrideKey) || gsp.port;

        try {
          await window.electronAPI.startPortForward({
            cluster: gsp.cluster,
            namespace: gsp.namespace,
            service: gsp.service,
            servicePort: gsp.port,
            localPort,
          });
        } catch (error) {
          console.error(
            `Failed to start port forward for ${gsp.service}:${gsp.port}`,
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
      setStartingAll((prev) => ({ ...prev, [group.id]: false }));
    }
  };

  const handleStopAll = async (group: Group) => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    setStoppingAll((prev) => ({ ...prev, [group.id]: true }));
    try {
      const activeForwardsForGroup = getGroupActiveForwards(group);

      for (const forward of activeForwardsForGroup) {
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
      setStoppingAll((prev) => ({ ...prev, [group.id]: false }));
    }
  };

  const handleStartOne = async (params: {
    groupId: string;
    cluster: string;
    namespace: string;
    service: string;
    servicePort: number;
  }) => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    const startKey = `${params.groupId}:${params.cluster}:${params.namespace}:${params.service}:${params.servicePort}`;
    setStartingOne((prev) => ({ ...prev, [startKey]: true }));
    try {
      const { getPortOverride } = usePortForwardStore.getState();
      
      const portOverrideKey = `${params.cluster}:${params.namespace}:${params.service}:${params.servicePort}`;
      const localPort = getPortOverride(portOverrideKey) || params.servicePort;

      await window.electronAPI.startPortForward({
        cluster: params.cluster,
        namespace: params.namespace,
        service: params.service,
        servicePort: params.servicePort,
        localPort,
      });

      await refreshActiveForwards();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to start port forward"
      );
    } finally {
      setStartingOne((prev) => ({ ...prev, [startKey]: false }));
    }
  };

  if (groups.length === 0 && !showForm) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-200 tracking-wide">
            Groups
          </h2>
          <button
            onClick={handleCreateGroup}
            className="skeuo-btn px-3 py-1.5 text-[10px] font-bold text-skeuo-accent hover:text-white rounded-xl flex items-center gap-1.5"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Group
          </button>
        </div>
        <div className="skeuo-card p-4 text-center shadow-skeuo-inset">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-skeuo-bg shadow-skeuo flex items-center justify-center text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-gray-300 font-medium text-xs">No groups created</p>
          <p className="text-[10px] text-gray-500 mt-1">
            Create a group to manage multiple services together.
          </p>
        </div>
        {showForm && (
          <GroupForm group={editingGroup} onClose={handleFormClose} />
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-200 tracking-wide">
          Groups
        </h2>
        <button
          onClick={handleCreateGroup}
          className="skeuo-btn px-3 py-1.5 text-[10px] font-bold text-skeuo-accent hover:text-white rounded-xl flex items-center gap-1.5"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Group
        </button>
      </div>

      {showForm && <GroupForm group={editingGroup} onClose={handleFormClose} />}

      <div className="space-y-3">
        {groups.map((group) => {
          const groupServicePorts = getGroupServicePorts(group);
          const activeForwardsForGroup = getGroupActiveForwards(group);
          const allActive =
            groupServicePorts.length > 0 &&
            activeForwardsForGroup.length === groupServicePorts.length &&
            activeForwardsForGroup.every(
              (f) => f.state === PortForwardState.ACTIVE
            );
          const isExpanded = expandedGroups[group.id] || false;
          const isStarting = startingAll[group.id] || false;
          const isStopping = stoppingAll[group.id] || false;

          return (
            <div
              key={group.id}
              className="skeuo-card overflow-hidden transition-all duration-300"
            >
              <div className="px-3 py-2.5 flex items-center justify-between">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`flex-1 flex items-center gap-2 text-left outline-none group`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                      allActive
                        ? "bg-skeuo-bg shadow-skeuo-active text-green-400"
                        : "bg-skeuo-bg shadow-skeuo text-gray-500"
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">
                        {group.name}
                      </span>
                      {allActive && (
                        <span className="skeuo-badge px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-bold text-green-400 bg-green-400/10 border border-green-400/20 shadow-none">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-500">
                      {groupServicePorts.length} service
                      {groupServicePorts.length !== 1 ? "s" : ""} configured
                    </span>
                  </div>

                  <svg
                    className={`w-4 h-4 text-gray-400 ml-1.5 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
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
                </button>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleStartAll(group)}
                    disabled={isStarting || isStopping || allActive}
                    className={`
                      px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[10px]
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
                        <span>Starting</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3 h-3"
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
                    onClick={() => handleStopAll(group)}
                    disabled={isStopping || activeForwardsForGroup.length === 0}
                    className={`
                      px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[10px]
                      ${
                        isStopping || activeForwardsForGroup.length === 0
                          ? "text-gray-600 bg-skeuo-bg shadow-none cursor-not-allowed"
                          : "skeuo-btn text-red-400 hover:text-red-300"
                      }
                    `}
                    title="Stop All"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    <span>Stop</span>
                  </button>
                  <div className="w-px h-6 bg-gray-700 mx-0.5 self-center"></div>
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="skeuo-btn p-1.5 rounded-xl text-gray-400 hover:text-white"
                    title="Edit Group"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete group "${group.name}"?`
                        )
                      ) {
                        deleteGroup(group.id);
                      }
                    }}
                    className="skeuo-btn p-1.5 rounded-xl text-gray-400 hover:text-red-400"
                    title="Delete Group"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 py-2.5 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5">
                  <div className="space-y-1.5">
                    {groupServicePorts.length === 0 ? (
                      <p className="text-[10px] text-gray-400 italic">
                        No services in this group
                      </p>
                    ) : (
                      groupServicePorts.map((gsp, index) => {
                        if (!gsp) return null;
                        const forward = activeForwardsForGroup.find(
                          (f) =>
                            f.cluster === gsp.cluster &&
                            f.namespace === gsp.namespace &&
                            f.service === gsp.service &&
                            f.servicePort === gsp.port
                        );
                        const isActive =
                          forward && forward.state === PortForwardState.ACTIVE;
                        const cluster = clusters.find(
                          (c) => c.context === gsp.cluster
                        );
                        const startKey = `${group.id}:${gsp.cluster}:${gsp.namespace}:${gsp.service}:${gsp.port}`;
                        const isStartingOne = startingOne[startKey] || false;

                        const handleOpenBrowser = () => {
                          if (window.electronAPI && forward) {
                            window.electronAPI.openInBrowser(
                              `http://localhost:${forward.localPort}`
                            );
                          }
                        };

                        const handleStart = async () => {
                          await handleStartOne({
                            groupId: group.id,
                            cluster: gsp.cluster,
                            namespace: gsp.namespace,
                            service: gsp.service,
                            servicePort: gsp.port,
                          });
                        };

                        const handleStop = async () => {
                          if (!window.electronAPI || !forward) return;
                          try {
                            await window.electronAPI.stopPortForward(
                              forward.id
                            );
                            await refreshActiveForwards();
                          } catch (error) {
                            alert(
                              error instanceof Error
                                ? error.message
                                : "Failed to stop port forward"
                            );
                          }
                        };

                        return (
                          <div
                            key={`${gsp.cluster}-${gsp.namespace}-${gsp.service}-${gsp.port}-${index}`}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-xl transition-all
                              ${
                                isActive
                                  ? "bg-skeuo-bg shadow-skeuo-active border border-green-500/20"
                                  : "bg-skeuo-bg shadow-skeuo border border-transparent"
                              }
                            `}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive
                                  ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                                  : "bg-gray-600"
                              }`}
                            />
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {cluster?.name || gsp.cluster}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                /
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {gsp.namespace}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                /
                              </span>
                              <span
                                className={`text-xs font-bold truncate ${
                                  isActive ? "text-green-400" : "text-gray-200"
                                }`}
                              >
                                {gsp.service}
                              </span>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap ml-auto">
                                {gsp.portInfo.name} ({gsp.port}/
                                {gsp.portInfo.protocol})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleStart}
                                disabled={
                                  isActive ||
                                  isStartingOne ||
                                  isStarting ||
                                  isStopping
                                }
                                className={`
                                  skeuo-btn p-1.5 rounded-lg
                                  ${
                                    isActive ||
                                    isStartingOne ||
                                    isStarting ||
                                    isStopping
                                      ? "text-gray-600 bg-skeuo-bg shadow-none cursor-not-allowed opacity-50"
                                      : "text-green-400 hover:text-green-300"
                                  }
                                `}
                                title={isActive ? "Already Active" : "Start"}
                              >
                                {isStartingOne ? (
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
                                ) : (
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                              {isActive && (
                                <>
                                  <button
                                    onClick={handleOpenBrowser}
                                    className="skeuo-btn px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-200 hover:text-white flex items-center gap-1"
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
                                    className="skeuo-btn p-1.5 rounded-lg text-red-400 hover:text-red-300"
                                    title="Stop Forwarding"
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M6 6h12v12H6z" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
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
