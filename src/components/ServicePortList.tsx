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
    <div className="pb-4">
      <div className="text-lg font-bold text-gray-100 mb-2 px-2">
        {service.name}
      </div>
      <div className="pl-3 border-l-2 border-gray-800 ml-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
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
    </div>
  );
}
