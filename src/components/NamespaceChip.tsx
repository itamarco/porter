import { useState } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { ServicePortList } from "./ServicePortList";

export function NamespaceChip({
  cluster,
  namespace,
  onLoadServices,
}: {
  cluster: string;
  namespace: string;
  onLoadServices: (cluster: string, namespace: string) => Promise<void>;
}) {
  const { services, selectedServices, toggleServicePortSelection } =
    usePortForwardStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const serviceKey = `${cluster}:${namespace}`;
  const serviceList = services[serviceKey] || [];
  const selectedServicePorts = selectedServices[serviceKey] || [];
  const selectedCount = selectedServicePorts.length;

  const handleToggle = async () => {
    if (!isExpanded && serviceList.length === 0) {
      setLoadingServices(true);
      try {
        await onLoadServices(cluster, namespace);
      } finally {
        setLoadingServices(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleServicePortToggle = (serviceName: string, port: number) => {
    toggleServicePortSelection(cluster, namespace, serviceName, port);
  };

  return (
    <div className="skeuo-card overflow-hidden">
      <button
        onClick={handleToggle}
        disabled={loadingServices}
        className={`w-full px-4 py-3 flex items-center justify-between outline-none transition-all ${
          loadingServices
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-skeuo-light/20"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              selectedCount > 0
                ? "bg-skeuo-accent shadow-[0_0_8px_rgba(109,93,252,0.6)]"
                : "bg-gray-600"
            }`}
          />
          <span className="text-sm font-semibold text-gray-200">
            {namespace}
          </span>
          {selectedCount > 0 && (
            <span className="skeuo-badge px-2 py-0.5 text-[10px] font-bold text-skeuo-accent shadow-skeuo-inset-sm">
              {selectedCount}
            </span>
          )}
          {loadingServices && (
            <svg
              className="animate-spin h-3.5 w-3.5 text-skeuo-accent ml-1.5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${
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
      </button>

      {isExpanded && (
        <div className="px-4 py-3 bg-skeuo-dark shadow-skeuo-inset border-t border-white/5">
          {serviceList.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No services found</p>
          ) : (
            <div className="space-y-3">
              {serviceList.map((service) => (
                <ServicePortList
                  key={service.name}
                  service={service}
                  selectedServicePorts={selectedServicePorts}
                  onPortToggle={handleServicePortToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
