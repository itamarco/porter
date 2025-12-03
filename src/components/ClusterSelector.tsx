import { usePortForwardStore } from '../stores/portforwards';
import { useK8s } from '../hooks/useK8s';
import { ClusterInfo } from '../types/electron';

export function ClusterSelector() {
  const { clusters, selectedCluster } = usePortForwardStore();
  const { setSelectedCluster } = useK8s();

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Cluster
      </label>
      <select
        value={selectedCluster || ''}
        onChange={(e) => setSelectedCluster(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

