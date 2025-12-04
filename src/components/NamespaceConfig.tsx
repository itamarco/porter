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
      <label className="block text-base font-bold text-gray-200 mb-3 tracking-wide">
        Configured Namespaces
      </label>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleAddNamespace(e.target.value);
              e.target.value = '';
            }
          }}
            className="w-full px-6 py-4 bg-skeuo-bg rounded-xl text-gray-200 font-medium appearance-none shadow-skeuo cursor-pointer focus:outline-none focus:shadow-skeuo-active transition-all"
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 p-4 skeuo-card shadow-skeuo-inset min-h-[100px]">
        {configured.length === 0 ? (
          <span className="text-gray-500 italic text-sm">No namespaces configured</span>
        ) : (
          configured.map((ns: string) => (
            <div
            key={ns}
              className="inline-flex items-center pl-4 pr-2 py-2 rounded-full font-semibold text-sm bg-skeuo-bg shadow-skeuo text-gray-200 border border-transparent hover:border-skeuo-accent/30 transition-all group"
          >
            {ns}
            <button
              onClick={() => removeNamespace(selectedCluster, ns)}
                className="ml-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
