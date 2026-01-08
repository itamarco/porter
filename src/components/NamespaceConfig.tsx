import { usePortForwardStore } from "../stores/portforwards";

export function NamespaceConfig() {
  const {
    selectedCluster,
    namespaces,
    configuredNamespaces,
    addNamespace,
    removeNamespace,
  } = usePortForwardStore();

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
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-200 mb-1.5 tracking-wide">
        Configured Namespaces
      </label>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddNamespace(e.target.value);
                e.target.value = "";
              }
            }}
            className="w-full px-3 py-2 bg-skeuo-bg rounded-xl text-xs text-gray-200 font-medium appearance-none shadow-skeuo cursor-pointer focus:outline-none focus:shadow-skeuo-active transition-all"
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
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
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-2 skeuo-card shadow-skeuo-inset min-h-[60px]">
        {configured.length === 0 ? (
          <span className="text-gray-500 italic text-[10px]">
            No namespaces configured
          </span>
        ) : (
          configured.map((ns: string) => (
            <div
              key={ns}
              className="inline-flex items-center pl-2.5 pr-1 py-1 rounded-full font-semibold text-[10px] bg-skeuo-bg shadow-skeuo text-gray-200 border border-transparent hover:border-skeuo-accent/30 transition-all group"
            >
              {ns}
              <button
                onClick={() => removeNamespace(selectedCluster, ns)}
                className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
