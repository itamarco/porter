import { useEffect } from 'react';
import { usePortForwardStore } from '../stores/portforwards';
import { PortForwardStatus } from '../types/electron';

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
      const { configuredNamespaces, clusters } = state;
      
      for (const cluster of clusters) {
        const namespaces = configuredNamespaces[cluster.context] || [];
        for (const namespace of namespaces) {
          await loadServices(cluster.context, namespace);
        }
      }
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
      setError('Electron API not available. Make sure you are running in Electron.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const clusterList = await window.electronAPI.getClusters();
      setClusters(clusterList);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load clusters');
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
      setError(error instanceof Error ? error.message : 'Failed to load namespaces');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (cluster: string, namespace: string) => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const serviceList = await window.electronAPI.getServices(cluster, namespace);
      setServices(cluster, namespace, serviceList);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load services');
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
      setError(error instanceof Error ? error.message : 'Failed to load active forwards');
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

