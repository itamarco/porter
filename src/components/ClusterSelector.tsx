import { usePortForwardStore } from "../stores/portforwards";
import { useK8s } from "../hooks/useK8s";
import { ClusterInfo } from "../types/electron";

export function ClusterSelector() {
  const { clusters, selectedCluster } = usePortForwardStore();
  const { setSelectedCluster } = useK8s();

  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-200 mb-2.5 tracking-wide">
        Select Cluster
      </label>
      <div className="relative">
        <select
          value={selectedCluster || ""}
          onChange={(e) => setSelectedCluster(e.target.value || null)}
          className="w-full px-5 py-3 bg-skeuo-bg rounded-xl text-sm text-gray-200 font-medium appearance-none shadow-skeuo cursor-pointer focus:outline-none focus:shadow-skeuo-active transition-all"
        >
          <option value="">-- Select a cluster --</option>
          {clusters.map((cluster: ClusterInfo) => (
            <option key={cluster.context} value={cluster.context}>
              {cluster.name}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
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
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
