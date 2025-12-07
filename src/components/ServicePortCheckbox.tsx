export function ServicePortCheckbox({
  port,
  isSelected,
  onToggle,
}: {
  port: { name: string; port: number; protocol: string };
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`
        flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
        ${
          isSelected
            ? "bg-skeuo-bg shadow-skeuo-active border border-skeuo-accent/20"
            : "bg-skeuo-bg shadow-skeuo hover:translate-y-[-2px] border border-transparent"
        }
      `}
    >
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? "border-skeuo-accent bg-skeuo-accent text-white"
              : "border-gray-500 bg-transparent"
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
              <path d="M3.72 8.68L1.2 6.16L0.28 7.08L3.72 10.52L11.08 3.16L10.16 2.24L3.72 8.68Z" />
            </svg>
          )}
        </div>
      </div>
      <span
        className={`ml-3 text-sm font-medium transition-colors ${
          isSelected ? "text-skeuo-accent" : "text-gray-300"
        }`}
      >
        {port.name}{" "}
        <span className="text-xs opacity-70">
          ({port.port}/{port.protocol})
        </span>
      </span>
    </label>
  );
}
