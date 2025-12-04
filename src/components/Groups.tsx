import { useState } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { Group, PortForwardState, PortForwardStatus, ClusterInfo } from '../types/electron';
import { GroupForm } from './GroupForm';

export function Groups() {
  const { groups, clusters, services, activeForwards, deleteGroup } = usePortForwardStore();
  const { refreshActiveForwards } = useK8s();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [startingAll, setStartingAll] = useState<Record<string, boolean>>({});
  const [stoppingAll, setStoppingAll] = useState<Record<string, boolean>>({});

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
    const parts = key.split(':');
    if (parts.length === 4) {
      return { cluster: parts[0], namespace: parts[1], service: parts[2], port: parseInt(parts[3], 10) };
    }
    return null;
  };

  const getGroupServicePorts = (group: Group) => {
    return group.servicePorts.map((key) => {
      const parsed = parseServicePortKey(key);
      if (!parsed) return null;
      
      const serviceKey = `${parsed.cluster}:${parsed.namespace}`;
      const serviceList = services[serviceKey] || [];
      const service = serviceList.find((s) => s.name === parsed.service);
      const port = service?.ports.find((p) => p.port === parsed.port);
      
      return parsed && service && port
        ? { ...parsed, portInfo: port, serviceInfo: service }
        : null;
    }).filter((item) => item !== null);
  };

  const getGroupActiveForwards = (group: Group) => {
    const groupServicePorts = getGroupServicePorts(group);
    return activeForwards.filter((forward) => {
      return groupServicePorts.some((gsp) => {
        if (!gsp) return false;
        const forwardId = `${gsp.cluster}-${gsp.namespace}-${gsp.service}-${gsp.port}-${forward.localPort}`;
        return forward.id === forwardId || (
          forward.cluster === gsp.cluster &&
          forward.namespace === gsp.namespace &&
          forward.service === gsp.service &&
          forward.servicePort === gsp.port
        );
      });
    });
  };

  const handleStartAll = async (group: Group) => {
    if (!window.electronAPI) {
      alert('Electron API not available');
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
          console.error(`Failed to start port forward for ${gsp.service}:${gsp.port}`, error);
        }
      }
      
      await refreshActiveForwards();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start all port forwards');
    } finally {
      setStartingAll((prev) => ({ ...prev, [group.id]: false }));
    }
  };

  const handleStopAll = async (group: Group) => {
    if (!window.electronAPI) {
      alert('Electron API not available');
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
      alert(error instanceof Error ? error.message : 'Failed to stop all port forwards');
    } finally {
      setStoppingAll((prev) => ({ ...prev, [group.id]: false }));
    }
  };

  if (groups.length === 0 && !showForm) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Groups</h2>
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-800"
            style={{
              background: 'rgba(59, 130, 246, 0.25)',
              borderColor: 'rgba(59, 130, 246, 0.4)'
            }}
          >
            Create Group
          </button>
        </div>
        <p className="text-gray-700 text-base">No groups created yet. Create a group to manage multiple services together.</p>
        {showForm && (
          <GroupForm
            group={editingGroup}
            onClose={handleFormClose}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Groups</h2>
        <button
          onClick={handleCreateGroup}
          className="px-4 py-2 text-sm font-semibold glass-button rounded-lg text-gray-800"
          style={{
            background: 'rgba(59, 130, 246, 0.25)',
            borderColor: 'rgba(59, 130, 246, 0.4)'
          }}
        >
          Create Group
        </button>
      </div>

      {showForm && (
        <GroupForm
          group={editingGroup}
          onClose={handleFormClose}
        />
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const groupServicePorts = getGroupServicePorts(group);
          const activeForwardsForGroup = getGroupActiveForwards(group);
          const allActive = groupServicePorts.length > 0 && 
            activeForwardsForGroup.length === groupServicePorts.length &&
            activeForwardsForGroup.every((f) => f.state === PortForwardState.ACTIVE);
          const isExpanded = expandedGroups[group.id] || false;
          const isStarting = startingAll[group.id] || false;
          const isStopping = stoppingAll[group.id] || false;

          return (
            <div key={group.id} className="glass-card rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex-1 flex items-center justify-between glass-button rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">{group.name}</span>
                    <span className="text-xs text-gray-600">
                      {groupServicePorts.length} service{groupServicePorts.length !== 1 ? 's' : ''}
                    </span>
                    {allActive && (
                      <span className="text-xs text-green-700 font-semibold">● All Active</span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleStartAll(group)}
                    disabled={isStarting || isStopping || allActive}
                    className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-gray-800"
                    style={{
                      background: isStarting || allActive ? 'rgba(156, 163, 175, 0.25)' : 'rgba(34, 197, 94, 0.25)',
                      borderColor: isStarting || allActive ? 'rgba(156, 163, 175, 0.4)' : 'rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    {isStarting ? 'Starting...' : 'Start All'}
                  </button>
                  <button
                    onClick={() => handleStopAll(group)}
                    disabled={isStopping || activeForwardsForGroup.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-gray-800"
                    style={{
                      background: isStopping || activeForwardsForGroup.length === 0 ? 'rgba(156, 163, 175, 0.25)' : 'rgba(220, 38, 38, 0.25)',
                      borderColor: isStopping || activeForwardsForGroup.length === 0 ? 'rgba(156, 163, 175, 0.4)' : 'rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    {isStopping ? 'Stopping...' : 'Stop All'}
                  </button>
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg whitespace-nowrap text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete group "${group.name}"?`)) {
                        deleteGroup(group.id);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg whitespace-nowrap text-gray-800"
                    style={{
                      background: 'rgba(220, 38, 38, 0.25)',
                      borderColor: 'rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 py-4 border-t border-gray-200/50 bg-white/20">
                  <div className="space-y-2">
                    {groupServicePorts.length === 0 ? (
                      <p className="text-sm text-gray-700">No services in this group</p>
                    ) : (
                      groupServicePorts.map((gsp, index) => {
                        if (!gsp) return null;
                        const forward = activeForwardsForGroup.find((f) =>
                          f.cluster === gsp.cluster &&
                          f.namespace === gsp.namespace &&
                          f.service === gsp.service &&
                          f.servicePort === gsp.port
                        );
                        const isActive = forward && forward.state === PortForwardState.ACTIVE;
                        const cluster = clusters.find((c) => c.context === gsp.cluster);
                        
                        return (
                          <div
                            key={`${gsp.cluster}-${gsp.namespace}-${gsp.service}-${gsp.port}-${index}`}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg glass ${isActive ? 'border-green-300/40' : 'border-gray-200/50'}`}
                            style={isActive ? {
                              background: 'rgba(34, 197, 94, 0.2)',
                              backdropFilter: 'blur(12px)',
                              borderColor: 'rgba(34, 197, 94, 0.35)'
                            } : {}}
                          >
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <span className="text-xs text-gray-600">{cluster?.name || gsp.cluster}</span>
                              <span className="text-xs text-gray-600">/</span>
                              <span className="text-xs text-gray-600">{gsp.namespace}</span>
                              <span className="text-xs text-gray-600">/</span>
                              <span className="text-sm font-semibold text-gray-800 truncate">{gsp.service}</span>
                              <span className="text-xs text-gray-700 whitespace-nowrap">
                                {gsp.portInfo.name} ({gsp.port}/{gsp.portInfo.protocol})
                              </span>
                              {isActive && (
                                <span className="text-xs text-green-700 font-semibold whitespace-nowrap">● Active</span>
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

