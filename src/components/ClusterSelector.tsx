import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ClusterInfo } from '../types/electron';

export function ClusterSelector() {
  const { clusters, selectedCluster } = usePortForwardStore();
  const { setSelectedCluster } = useK8s();

  return (
    <div className="mb-8">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        Select Cluster
      </label>
      <select
        value={selectedCluster || ''}
        onChange={(e) => setSelectedCluster(e.target.value || null)}
        className="w-full px-4 py-3 glass-select rounded-xl text-gray-800 font-medium"
      >
        <option value="">-- Select a cluster --</option>
        {clusters.map((cluster: ClusterInfo) => (
          <option key={cluster.context} value={cluster.context}>
            {cluster.name}
          </option>
        ))}
      </select>
    </div>
  );
}

