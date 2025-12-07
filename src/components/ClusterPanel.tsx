import { useState, useEffect, useCallback } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import { ClusterInfo } from "../types/electron";
import { ClusterPane } from "./ClusterPane";

export function ClusterPanel() {
  const { clusters } = usePortForwardStore();
  const { loadServices, loadNamespaces, refreshActiveForwards } = useK8s();
  const [expandedClusters, setExpandedClusters] = useState<
    Record<string, boolean>
  >({});
  const [clusterNamespaces, setClusterNamespaces] = useState<
    Record<string, string[]>
  >({});
  const [failedClusters, setFailedClusters] = useState<Record<string, boolean>>(
    {}
  );

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

  const handleLoadNamespaces = useCallback(
    async (clusterContext: string) => {
      try {
        const namespaces = await loadNamespaces(clusterContext);
        setClusterNamespaces((prev) => ({
          ...prev,
          [clusterContext]: namespaces,
        }));
        setFailedClusters((prev) => {
          const updated = { ...prev };
          delete updated[clusterContext];
          return updated;
        });
      } catch (error) {
        setFailedClusters((prev) => ({
          ...prev,
          [clusterContext]: true,
        }));
        setClusterNamespaces((prev) => ({
          ...prev,
          [clusterContext]: [],
        }));
      }
    },
    [loadNamespaces]
  );

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-200 mb-6 tracking-wide">
        Namespaces
      </h2>
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
              onLoadNamespaces={() => handleLoadNamespaces(cluster.context)}
              onLoadServices={loadServices}
              hasError={failedClusters[cluster.context] || false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
