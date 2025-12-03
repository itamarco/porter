import { usePortForwardStore } from '../stores/portforwards';

export function NamespaceConfig() {
  const { selectedCluster, namespaces, configuredNamespaces, addNamespace, removeNamespace } =
    usePortForwardStore();

  if (!selectedCluster) {
    return null;
  }

  const configured = configuredNamespaces[selectedCluster] || [];

  const handleAddNamespace = (namespace: string) => {
    if (namespace && !configured.includes(namespace)) {
      addNamespace(selectedCluster, namespace);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Configured Namespaces
      </label>
      <div className="flex gap-2 mb-2">
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleAddNamespace(e.target.value);
              e.target.value = '';
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Add namespace --</option>
          {namespaces
            .filter((ns) => !configured.includes(ns))
            .map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {configured.map((ns) => (
          <span
            key={ns}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
          >
            {ns}
            <button
              onClick={() => removeNamespace(selectedCluster, ns)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

