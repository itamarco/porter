import { create } from 'zustand';
import { PortForwardStatus, ClusterInfo, ServiceInfo, AppConfig } from '../types/electron';

interface PortForwardStore {
  clusters: ClusterInfo[];
  selectedCluster: string | null;
  namespaces: string[];
  configuredNamespaces: Record<string, string[]>;
  portOverrides: Record<string, number>;
  services: Record<string, ServiceInfo[]>;
  activeForwards: PortForwardStatus[];
  loading: boolean;
  error: string | null;
  
  setClusters: (clusters: ClusterInfo[]) => void;
  setSelectedCluster: (cluster: string | null) => void;
  setNamespaces: (namespaces: string[]) => void;
  addNamespace: (cluster: string, namespace: string) => void;
  removeNamespace: (cluster: string, namespace: string) => void;
  setPortOverride: (key: string, localPort: number) => void;
  getPortOverride: (key: string) => number | undefined;
  setServices: (cluster: string, namespace: string, services: ServiceInfo[]) => void;
  setActiveForwards: (forwards: PortForwardStatus[]) => void;
  updateForward: (forward: PortForwardStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

export const usePortForwardStore = create<PortForwardStore>((set) => ({
  clusters: [],
  selectedCluster: null,
  namespaces: [],
  configuredNamespaces: {},
  portOverrides: {},
  services: {},
  activeForwards: [],
  loading: false,
  error: null,

  setClusters: (clusters) => set({ clusters }),
  setSelectedCluster: (cluster) => set({ selectedCluster: cluster }),
  setNamespaces: (namespaces) => set({ namespaces }),
  addNamespace: (cluster, namespace) =>
    set((state) => {
      const updated = {
        configuredNamespaces: {
          ...state.configuredNamespaces,
          [cluster]: [...(state.configuredNamespaces[cluster] || []), namespace].filter(
            (v, i, a) => a.indexOf(v) === i
          ),
        },
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  removeNamespace: (cluster, namespace) =>
    set((state) => {
      const updated = {
        configuredNamespaces: {
          ...state.configuredNamespaces,
          [cluster]: (state.configuredNamespaces[cluster] || []).filter((ns) => ns !== namespace),
        },
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  setPortOverride: (key, localPort) =>
    set((state) => {
      const updated = {
        portOverrides: {
          ...state.portOverrides,
          [key]: localPort,
        },
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  getPortOverride: (key) => {
    return usePortForwardStore.getState().portOverrides[key];
  },
  setServices: (cluster, namespace, services) =>
    set((state) => ({
      services: {
        ...state.services,
        [`${cluster}:${namespace}`]: services,
      },
    })),
  setActiveForwards: (forwards) => set({ activeForwards: forwards }),
  updateForward: (forward) =>
    set((state) => {
      const index = state.activeForwards.findIndex((f) => f.id === forward.id);
      if (index >= 0) {
        const updated = [...state.activeForwards];
        updated[index] = forward;
        return { activeForwards: updated };
      }
      return { activeForwards: [...state.activeForwards, forward] };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  loadConfig: async () => {
    if (!window.electronAPI) return;
    try {
      const config = await window.electronAPI.loadConfig();
      set({
        configuredNamespaces: config.configuredNamespaces || {},
        portOverrides: config.portOverrides || {},
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },
  saveConfig: async () => {
    if (!window.electronAPI) return;
    try {
      const state = usePortForwardStore.getState();
      const config: AppConfig = {
        configuredNamespaces: state.configuredNamespaces,
        portOverrides: state.portOverrides,
      };
      await window.electronAPI.saveConfig(config);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },
}));

