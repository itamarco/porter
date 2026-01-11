import { useEffect, useState } from "react";
import { ClusterPanel } from "./components/ClusterPanel";
import { ServiceList } from "./components/ServiceList";
import { Groups } from "./components/Groups";
import { ConfigMenu } from "./components/ConfigMenu";
import { UpdateBanner } from "./components/UpdateBanner";
import { ToastContainer, showToast } from "./components/Toast";
import { PortOccupiedDialog } from "./components/PortOccupiedDialog";
import { useK8s } from "./hooks/useK8s";
import { usePortForwardStore } from "./stores/portforwards";
import { ProcessInfo } from "./types/electron";

function App() {
  useK8s();
  const { error } = usePortForwardStore();
  const [portOccupiedInfo, setPortOccupiedInfo] = useState<ProcessInfo | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handlePortOccupied = (data: ProcessInfo) => {
      setPortOccupiedInfo(data);
    };

    window.electronAPI.onPortOccupied(handlePortOccupied);

    return () => {
      window.electronAPI.removePortOccupiedListener();
    };
  }, []);

  const handleKillProcess = async () => {
    if (!portOccupiedInfo || !window.electronAPI) return;

    try {
      await window.electronAPI.respondPortOccupied(
        portOccupiedInfo.forwardId || "",
        true
      );
      setPortOccupiedInfo(null);
    } catch (error) {
      showToast(
        `Failed to kill process: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const handleCancelKill = async () => {
    if (!portOccupiedInfo || !window.electronAPI) return;

    try {
      await window.electronAPI.respondPortOccupied(
        portOccupiedInfo.forwardId || "",
        false
      );
      setPortOccupiedInfo(null);
    } catch (error) {
      showToast(
        `Failed to cancel: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-skeuo-bg text-gray-200 font-sans">
      <div className="electron-drag fixed top-0 left-0 right-0 h-20 z-50" />
      <div className="p-6 max-w-6xl mx-auto pt-6">
        <div className="mb-6 skeuo-card p-6 flex items-center justify-between">
          <div className="electron-drag flex-1">
            <h1 className="text-3xl font-bold text-gray-100 mb-1 tracking-tight">
              Porter
            </h1>
            <p className="text-gray-400 text-base font-medium">
              K8s Port Forward Manager
            </p>
          </div>
          <div className="electron-no-drag">
            <ConfigMenu />
          </div>
        </div>

        <UpdateBanner />

        {error && (
          <div className="mb-4 p-3 rounded-2xl shadow-skeuo-inset-sm bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <div className="mt-0.5 text-red-400">
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
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="font-medium text-red-300">{error}</p>
          </div>
        )}

        <Groups />
        <ServiceList />
        <ClusterPanel />
      </div>
      <ToastContainer />
      {portOccupiedInfo && (
        <PortOccupiedDialog
          processInfo={portOccupiedInfo}
          onKill={handleKillProcess}
          onCancel={handleCancelKill}
        />
      )}
    </div>
  );
}

export default App;
