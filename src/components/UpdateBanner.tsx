import { useState, useEffect } from "react";
import { UpdateInfo } from "../types/electron";

const DISMISSED_VERSIONS_KEY = "porter.dismissedUpdateVersions";

function getDismissedVersions(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_VERSIONS_KEY);
    if (stored) {
      const versions = JSON.parse(stored) as string[];
      return new Set(versions);
    }
  } catch (error) {
    console.error("Error reading dismissed versions:", error);
  }
  return new Set<string>();
}

function saveDismissedVersion(version: string): void {
  try {
    const dismissedVersions = getDismissedVersions();
    dismissedVersions.add(version);
    localStorage.setItem(
      DISMISSED_VERSIONS_KEY,
      JSON.stringify(Array.from(dismissedVersions))
    );
  } catch (error) {
    console.error("Error saving dismissed version:", error);
  }
}

function isVersionDismissed(version: string | null): boolean {
  if (!version) {
    return false;
  }
  const dismissedVersions = getDismissedVersions();
  return dismissedVersions.has(version);
}

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    const electronAPI = window.electronAPI;

    const checkUpdates = async () => {
      try {
        const info = await electronAPI.checkForUpdates();
        if (info.updateAvailable) {
          if (info.latestVersion && isVersionDismissed(info.latestVersion)) {
            setIsDismissed(true);
          } else {
            setIsDismissed(false);
          }
          setUpdateInfo(info);
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    };

    checkUpdates();

    const handleUpdateStatus = (info: UpdateInfo) => {
      if (info.updateAvailable) {
        if (info.latestVersion && isVersionDismissed(info.latestVersion)) {
          setIsDismissed(true);
        } else {
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
      saveDismissedVersion(updateInfo.latestVersion);
      setIsDismissed(true);
    }
  };

  if (!updateInfo || isDismissed || !updateInfo.updateAvailable) {
    return null;
  }

  return (
    <div className="mb-3 p-3 rounded-2xl shadow-skeuo-inset-sm bg-blue-500/10 border border-blue-500/20 flex items-start gap-2 animate-fade-in">
      <div className="mt-0.5 text-blue-400 flex-shrink-0">
        <svg
          className="w-4 h-4"
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
        <p className="font-medium text-blue-300 mb-0.5 text-xs">
          Porter v{updateInfo.latestVersion} available
        </p>
        <p className="text-[10px] text-blue-400/80 mb-0.5">
          You're currently on v{updateInfo.currentVersion}
        </p>
        <p className="text-[10px] text-blue-400/80 mb-2">
          After installation on macOS, run{" "}
          <code className="font-mono text-[9px]">
            xattr -cr /Applications/Porter.app
          </code>
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-skeuo-sm hover:shadow-skeuo-active"
          >
            Download Update
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-[10px] font-medium text-blue-300 hover:text-blue-200 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
