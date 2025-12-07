import { useEffect } from "react";
import { usePortForwardStore } from "../stores/portforwards";
import { PortForwardStatus } from "../types/electron";

export function useK8s() {
  const {
    clusters,
    selectedCluster,
    configuredNamespaces,
    services,
    activeForwards,
    setClusters,
    setSelectedCluster,
    setNamespaces,
    setServices,
    setActiveForwards,
    updateForward,
    setLoading,
    setError,
    loadConfig,
  } = usePortForwardStore();

  useEffect(() => {
    const initialize = async () => {
      setupPortForwardListener();
      await loadConfig();
      await loadClusters();

      const state = usePortForwardStore.getState();
      const { configuredNamespaces, clusters, selectedServices, groups } =
        state;

      const namespacesToLoad: Record<string, Set<string>> = {};

      Object.keys(configuredNamespaces).forEach((clusterContext) => {
        if (!namespacesToLoad[clusterContext]) {
          namespacesToLoad[clusterContext] = new Set<string>();
        }
        const configuredNs = configuredNamespaces[clusterContext] || [];
        configuredNs.forEach((ns) => namespacesToLoad[clusterContext].add(ns));
      });

      Object.keys(selectedServices).forEach((key) => {
        const [clusterContext, namespace] = key.split(":");
        if (clusterContext && namespace) {
          if (!namespacesToLoad[clusterContext]) {
            namespacesToLoad[clusterContext] = new Set<string>();
          }
          namespacesToLoad[clusterContext].add(namespace);
        }
      });

      (groups || []).forEach((group) => {
        group.servicePorts.forEach((servicePortKey) => {
          const parts = servicePortKey.split(":");
          if (parts.length === 4) {
            const clusterContext = parts[0];
            const namespace = parts[1];
            if (clusterContext && namespace) {
              if (!namespacesToLoad[clusterContext]) {
                namespacesToLoad[clusterContext] = new Set<string>();
              }
              namespacesToLoad[clusterContext].add(namespace);
            }
          }
        });
      });

      const clusterContexts = new Set([
        ...clusters.map((c) => c.context),
        ...Object.keys(namespacesToLoad),
      ]);

      for (const clusterContext of clusterContexts) {
        const namespaces = Array.from(namespacesToLoad[clusterContext] || []);
        if (namespaces.length > 0) {
          for (const namespace of namespaces) {
            try {
              await loadServices(clusterContext, namespace);
            } catch (error) {
              console.error(
                `Failed to load services for ${clusterContext}:${namespace}:`,
                error
              );
            }
          }
        }
      }

      await refreshActiveForwards();
    };

    initialize();

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removePortForwardListener();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCluster) {
      loadNamespaces(selectedCluster);
      loadServicesForConfiguredNamespaces(selectedCluster);
    }
  }, [selectedCluster, configuredNamespaces]);

  const setupPortForwardListener = () => {
    if (window.electronAPI) {
      window.electronAPI.onPortForwardUpdate((status: PortForwardStatus) => {
        updateForward(status);
      });
    }
  };

  const loadClusters = async () => {
    if (!window.electronAPI) {
      setError(
        "Electron API not available. Make sure you are running in Electron."
      );
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const clusterList = await window.electronAPI.getClusters();
      setClusters(clusterList);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load clusters"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadNamespaces = async (cluster: string): Promise<string[]> => {
    if (!window.electronAPI) return [];
    try {
      setLoading(true);
      const namespaceList = await window.electronAPI.getNamespaces(cluster);
      setNamespaces(namespaceList);
      return namespaceList;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load namespaces"
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (cluster: string, namespace: string) => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const serviceList = await window.electronAPI.getServices(
        cluster,
        namespace
      );
      setServices(cluster, namespace, serviceList);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load services"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadServicesForConfiguredNamespaces = async (cluster: string) => {
    const namespaces = configuredNamespaces[cluster] || [];
    for (const namespace of namespaces) {
      await loadServices(cluster, namespace);
    }
  };

  const refreshActiveForwards = async () => {
    if (!window.electronAPI) return;
    try {
      const forwards = await window.electronAPI.getActiveForwards();
      setActiveForwards(forwards);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load active forwards"
      );
    }
  };

  return {
    clusters,
    selectedCluster,
    configuredNamespaces,
    services,
    activeForwards,
    setSelectedCluster,
    loadNamespaces,
    loadServices,
    refreshActiveForwards,
  };
}
