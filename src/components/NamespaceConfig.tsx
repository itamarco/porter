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
    <div className="mb-8">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        Configured Namespaces
      </label>
      <div className="flex gap-3 mb-3">
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleAddNamespace(e.target.value);
              e.target.value = '';
            }
          }}
          className="flex-1 px-4 py-3 glass-select rounded-xl text-gray-800 font-medium"
        >
          <option value="">-- Add namespace --</option>
          {namespaces
            .filter((ns: string) => !configured.includes(ns))
            .map((ns: string) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        {configured.map((ns: string) => (
          <span
            key={ns}
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold glass-chip text-gray-800"
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 0.35)'
            }}
          >
            {ns}
            <button
              onClick={() => removeNamespace(selectedCluster, ns)}
              className="ml-3 text-gray-600 hover:text-gray-800 transition-colors font-bold text-lg"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

