import { useState, useEffect, useRef } from "react";
import { NamespaceChip } from "./NamespaceChip";

export function ClusterPane({
  cluster,
  isExpanded,
  onToggle,
  availableNamespaces,
  onLoadNamespaces,
  onLoadServices,
  hasError,
}: {
  cluster: { name: string; context: string };
  isExpanded: boolean;
  onToggle: () => void;
  availableNamespaces: string[];
  onLoadNamespaces: () => Promise<void>;
  onLoadServices: (cluster: string, namespace: string) => Promise<void>;
  hasError?: boolean;
}) {
  const [loadingNamespaces, setLoadingNamespaces] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const onLoadNamespacesRef = useRef(onLoadNamespaces);

  useEffect(() => {
    onLoadNamespacesRef.current = onLoadNamespaces;
  }, [onLoadNamespaces]);

  useEffect(() => {
    if (
      isExpanded &&
      availableNamespaces.length === 0 &&
      !hasAttemptedLoad &&
      !hasError
    ) {
      const loadNamespacesForCluster = async () => {
        setLoadingNamespaces(true);
        setHasAttemptedLoad(true);
        try {
          await onLoadNamespacesRef.current();
        } finally {
          setLoadingNamespaces(false);
        }
      };
      loadNamespacesForCluster();
    }
  }, [isExpanded, availableNamespaces.length, hasAttemptedLoad, hasError]);

  useEffect(() => {
    if (!isExpanded) {
      setHasAttemptedLoad(false);
    }
  }, [isExpanded]);

  return (
    <div
      className={`skeuo-card overflow-hidden transition-all duration-300 ${
        isExpanded ? "p-1" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 flex items-center justify-between transition-all duration-200 outline-none ${
          isExpanded
            ? "skeuo-btn mb-3 rounded-xl"
            : "hover:bg-skeuo-light/30 rounded-2xl"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full shadow-skeuo-sm ${
              isExpanded ? "bg-skeuo-accent" : "bg-gray-500"
            }`}
          />
          <span className="font-bold text-base text-gray-200 tracking-wide">
            {cluster.name}
          </span>
          {availableNamespaces.length > 0 && (
            <span className="text-[10px] font-bold text-gray-400 skeuo-badge px-2 py-0.5">
              {availableNamespaces.length} NS
            </span>
          )}
        </div>
        <div
          className={`p-1.5 rounded-full transition-all duration-300 ${
            isExpanded
              ? "shadow-skeuo-active text-skeuo-accent"
              : "shadow-skeuo text-gray-400"
          }`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="rounded-2xl shadow-skeuo-inset bg-skeuo-dark p-3">
          {loadingNamespaces ? (
            <div className="px-3 py-4 text-center">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-skeuo-light"></div>
                <p className="text-xs text-gray-400 font-medium">
                  Loading namespaces...
                </p>
              </div>
            </div>
          ) : hasError ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-red-400">Failed to load namespaces</p>
            </div>
          ) : availableNamespaces.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-gray-400">No namespaces found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {availableNamespaces.map((namespace) => (
                <NamespaceChip
                  key={namespace}
                  cluster={cluster.context}
                  namespace={namespace}
                  onLoadServices={onLoadServices}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
