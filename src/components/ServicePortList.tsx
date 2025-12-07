import { ServicePortCheckbox } from "./ServicePortCheckbox";

export function ServicePortList({
  service,
  selectedServicePorts,
  onPortToggle,
}: {
  service: {
    name: string;
    ports: Array<{ name: string; port: number; protocol: string }>;
  };
  selectedServicePorts: string[];
  onPortToggle: (serviceName: string, port: number) => void;
}) {
  return (
    <div className="pb-2">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
        {service.name}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {service.ports.map((port) => {
          const servicePortKey = `${service.name}:${port.port}`;
          const isSelected = selectedServicePorts.includes(servicePortKey);
          return (
            <ServicePortCheckbox
              key={`${service.name}-${port.port}`}
              port={port}
              isSelected={isSelected}
              onToggle={() => onPortToggle(service.name, port.port)}
            />
          );
        })}
      </div>
    </div>
  );
}
