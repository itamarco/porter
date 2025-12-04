import { useEffect, useState } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ServicePortInfo, PortForwardState, PortForwardStatus, ClusterInfo } from '../types/electron';

export function ServiceList() {
  const { clusters, services, selectedServices } = usePortForwardStore();
  const { refreshActiveForwards } = useK8s();
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    refreshActiveForwards();
    const interval = setInterval(refreshActiveForwards, 2000);
    return () => clearInterval(interval);
  }, []);

  const clustersWithSelectedServices = clusters.filter((cluster: ClusterInfo) => {
    const clusterKeys = Object.keys(selectedServices).filter((key) => key.startsWith(`${cluster.context}:`));
    return clusterKeys.some((key) => (selectedServices[key] || []).length > 0);
  });

  const getSelectedServicePorts = (cluster: ClusterInfo) => {
    const clusterKeys = Object.keys(selectedServices).filter((key) => key.startsWith(`${cluster.context}:`));
    const result: Array<{ namespace: string; service: string; port: ServicePortInfo; key: string }> = [];
    
    clusterKeys.forEach((key) => {
      const [, namespace] = key.split(':');
      const serviceList = services[key] || [];
      const selectedServicePorts = selectedServices[key] || [];
      
      serviceList.forEach((service) => {
        service.ports.forEach((port) => {
          const servicePortKey = `${service.name}:${port.port}`;
          if (selectedServicePorts.includes(servicePortKey)) {
            result.push({ namespace, service: service.name, port, key: cluster.context });
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
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">Services</h2>
        <p className="text-gray-300 text-base">Select services from namespace chips below to see them here</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-100 mb-4">Services</h2>
      <div className="space-y-3">
        {clustersWithSelectedServices.map((cluster: ClusterInfo) => {
          const selectedServicePorts = getSelectedServicePorts(cluster);
          const isExpanded = expandedClusters[cluster.context] || false;

          return (
            <div key={cluster.context} className="glass-card rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCluster(cluster.context)}
                className="w-full px-5 py-4 flex items-center justify-between glass-button rounded-t-xl"
              >
                <span className="font-semibold text-gray-100">{cluster.name}</span>
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
                <div className="px-5 py-4 border-t border-white/10 bg-black/20">
                  <div className="space-y-2">
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
  const { activeForwards, setPortOverride, getPortOverride } = usePortForwardStore();
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
  const activeForward = activeForwards.find((f: PortForwardStatus) => f.id === forwardId);
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
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg glass ${isActive ? 'border-green-300/40' : 'border-white/10'}`} style={isActive ? {
      background: 'rgba(34, 197, 94, 0.2)',
      backdropFilter: 'blur(12px)',
      borderColor: 'rgba(34, 197, 94, 0.35)'
    } : {}}>
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-gray-100 truncate">{service}</span>
        <span className="text-xs text-gray-300 whitespace-nowrap">
          {port.name} ({port.port}/{port.protocol})
        </span>
        <span className="text-xs text-gray-400">→</span>
        <input
          type="number"
          value={localPort}
          onChange={(e) => handlePortChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs glass-input rounded text-gray-100 placeholder-gray-400"
          placeholder="Local"
          min="1"
          max="65535"
          disabled={starting || isActive}
        />
        {isActive && (
          <span className="text-xs text-green-400 font-semibold whitespace-nowrap">● Active</span>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {isActive ? (
          <>
            <button
              onClick={handleOpenBrowser}
              className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg whitespace-nowrap text-gray-100"
              style={{
                background: 'rgba(34, 197, 94, 0.25)',
                borderColor: 'rgba(34, 197, 94, 0.4)'
              }}
            >
              Open
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg whitespace-nowrap text-gray-100"
              style={{
                background: 'rgba(220, 38, 38, 0.25)',
                borderColor: 'rgba(220, 38, 38, 0.4)'
              }}
            >
              Stop
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting || !localPort}
            className="px-3 py-1.5 text-xs font-semibold glass-button rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-gray-100"
            style={{
              background: starting || !localPort ? 'rgba(156, 163, 175, 0.25)' : 'rgba(59, 130, 246, 0.25)',
              borderColor: starting || !localPort ? 'rgba(156, 163, 175, 0.4)' : 'rgba(59, 130, 246, 0.4)'
            }}
          >
            {starting ? 'Starting...' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
}

