import { useState, useRef, useEffect } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { UpdateInfo } from "../types/electron";

export function ConfigMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { loadConfig, resetState } = usePortForwardStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleReset = async () => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to reset all state? This will delete all your configured namespaces, port overrides, selected services, and groups. This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await resetState();
      alert("State has been reset successfully.");
    } catch (error) {
      alert("Failed to reset state.");
      console.error("Error resetting config:", error);
    }
    setIsOpen(false);
  };

  const handleExport = async () => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    try {
      const result = await window.electronAPI.exportConfigToFile();
      if (!result.canceled) {
        alert("State has been exported successfully.");
      }
    } catch (error) {
      alert("Failed to export state.");
      console.error("Error exporting config:", error);
    }
    setIsOpen(false);
  };

  const handleImport = async () => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    try {
      const result = await window.electronAPI.importConfigFromFile();
      if (!result.canceled) {
        await loadConfig();
        alert(
          "State has been imported successfully. Please reload the application to see the changes."
        );
      }
    } catch (error) {
      alert("Failed to import state. Please ensure the file is valid JSON.");
      console.error("Error importing config:", error);
    }
    setIsOpen(false);
  };

  const handleCheckUpdates = async () => {
    if (!window.electronAPI) {
      alert("Electron API not available");
      return;
    }

    setCheckingUpdates(true);
    try {
      const updateInfo: UpdateInfo = await window.electronAPI.checkForUpdates();
      setIsOpen(false);

      if (updateInfo.updateAvailable) {
        const downloadUrl = updateInfo.assetUrl || updateInfo.releaseUrl;
        if (downloadUrl) {
          const shouldDownload = confirm(
            `Porter v${updateInfo.latestVersion} is available!\n\n` +
              `You're currently on v${updateInfo.currentVersion}.\n\n` +
              `Would you like to download the update?`
          );
          if (shouldDownload) {
            await window.electronAPI.openInBrowser(downloadUrl);
          }
        }
      } else {
        alert(
          `You're already on the latest version (v${updateInfo.currentVersion}).`
        );
      }
    } catch (error) {
      alert("Failed to check for updates. Please try again later.");
      console.error("Error checking for updates:", error);
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-2 rounded-xl text-gray-300 transition-all duration-200
          ${
            isOpen
              ? "shadow-skeuo-active text-skeuo-accent"
              : "skeuo-btn hover:text-white"
          }
        `}
        aria-label="Config menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-48 skeuo-card p-1.5 z-50 overflow-hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            <button
              onClick={handleCheckUpdates}
              disabled={checkingUpdates}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-skeuo-bg/50 rounded-lg transition-colors flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-1 rounded-md shadow-skeuo-sm bg-skeuo-bg group-hover:shadow-skeuo-active transition-all">
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              {checkingUpdates ? "Checking..." : "Check for Updates"}
            </button>
            <div className="border-t border-gray-700/50 my-0.5" />
            <button
              onClick={handleReset}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-300 hover:text-red-400 hover:bg-skeuo-bg/50 rounded-lg transition-colors flex items-center gap-2 group"
            >
              <div className="p-1 rounded-md shadow-skeuo-sm bg-skeuo-bg group-hover:shadow-skeuo-active transition-all">
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              Reset State
            </button>
            <button
              onClick={handleExport}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-skeuo-bg/50 rounded-lg transition-colors flex items-center gap-2 group"
            >
              <div className="p-1 rounded-md shadow-skeuo-sm bg-skeuo-bg group-hover:shadow-skeuo-active transition-all">
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              Export State
            </button>
            <button
              onClick={handleImport}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-skeuo-bg/50 rounded-lg transition-colors flex items-center gap-2 group"
            >
              <div className="p-1 rounded-md shadow-skeuo-sm bg-skeuo-bg group-hover:shadow-skeuo-active transition-all">
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              Import State
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
