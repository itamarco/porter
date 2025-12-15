import { useState, useEffect, useRef } from "react";
import { UpdateInfo } from "../types/electron";

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const dismissedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    const electronAPI = window.electronAPI;

    const checkUpdates = async () => {
      try {
        const info = await electronAPI.checkForUpdates();
        if (info.updateAvailable) {
          setUpdateInfo(info);
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    };

    checkUpdates();

    const handleUpdateStatus = (info: UpdateInfo) => {
      if (info.updateAvailable) {
        if (
          info.latestVersion &&
          dismissedVersionRef.current !== info.latestVersion
        ) {
          setIsDismissed(false);
        }
        setUpdateInfo(info);
      }
    };

    electronAPI.onUpdateStatus(handleUpdateStatus);

    return () => {
      electronAPI.removeUpdateStatusListener();
    };
  }, []);

  const handleDownload = async () => {
    if (!updateInfo || !window.electronAPI) {
      return;
    }

    const url = updateInfo.assetUrl || updateInfo.releaseUrl;
    if (url) {
      await window.electronAPI.openInBrowser(url);
    }
  };

  const handleDismiss = () => {
    if (updateInfo?.latestVersion) {
      dismissedVersionRef.current = updateInfo.latestVersion;
    }
    setIsDismissed(true);
  };

  if (!updateInfo || isDismissed || !updateInfo.updateAvailable) {
    return null;
  }

  return (
    <div className="mb-4 p-4 rounded-2xl shadow-skeuo-inset-sm bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 animate-fade-in">
      <div className="mt-0.5 text-blue-400 flex-shrink-0">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-blue-300 mb-1">
          Porter v{updateInfo.latestVersion} available
        </p>
        <p className="text-sm text-blue-400/80 mb-3">
          You're currently on v{updateInfo.currentVersion}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-skeuo-sm hover:shadow-skeuo-active"
          >
            Download Update
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm font-medium text-blue-300 hover:text-blue-200 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
