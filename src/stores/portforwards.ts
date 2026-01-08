import { create } from 'zustand';
import { PortForwardStatus, ClusterInfo, ServiceInfo, AppConfig, Group } from '../types/electron';

interface PortForwardStore {
  clusters: ClusterInfo[];
  selectedCluster: string | null;
  namespaces: string[];
  configuredNamespaces: Record<string, string[]>;
  portOverrides: Record<string, number>;
  services: Record<string, ServiceInfo[]>;
  selectedServices: Record<string, string[]>;
  activeForwards: PortForwardStatus[];
  groups: Group[];
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
  toggleServicePortSelection: (cluster: string, namespace: string, serviceName: string, port: number) => void;
  setActiveForwards: (forwards: PortForwardStatus[]) => void;
  updateForward: (forward: PortForwardStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createGroup: (name: string, servicePorts: string[]) => void;
  updateGroup: (id: string, name: string, servicePorts: string[]) => void;
  deleteGroup: (id: string) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetState: () => Promise<void>;
}

export const usePortForwardStore = create<PortForwardStore>()((set, get) => ({
  clusters: [],
  selectedCluster: null,
  namespaces: [],
  configuredNamespaces: {},
  portOverrides: {},
  services: {},
  selectedServices: {},
  activeForwards: [],
  groups: [],
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
  getPortOverride: (key: string): number | undefined => {
    return get().portOverrides[key];
  },
  setServices: (cluster, namespace, services) =>
    set((state) => ({
      services: {
        ...state.services,
        [`${cluster}:${namespace}`]: services,
      },
    })),
  toggleServicePortSelection: (cluster, namespace, serviceName, port) =>
    set((state) => {
      const key = `${cluster}:${namespace}`;
      const current = state.selectedServices[key] || [];
      const servicePortKey = `${serviceName}:${port}`;
      const updated = current.includes(servicePortKey)
        ? current.filter((item) => item !== servicePortKey)
        : [...current, servicePortKey];
      const newState = {
        selectedServices: {
          ...state.selectedServices,
          [key]: updated,
        },
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return newState;
    }),
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
  createGroup: (name, servicePorts) =>
    set((state) => {
      const newGroup: Group = {
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        servicePorts,
      };
      const updated = {
        groups: [...state.groups, newGroup],
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  updateGroup: (id, name, servicePorts) =>
    set((state) => {
      const updated = {
        groups: state.groups.map((group) =>
          group.id === id ? { ...group, name, servicePorts } : group
        ),
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  deleteGroup: (id) =>
    set((state) => {
      const updated = {
        groups: state.groups.filter((group) => group.id !== id),
      };
      setTimeout(() => {
        usePortForwardStore.getState().saveConfig();
      }, 100);
      return updated;
    }),
  loadConfig: async () => {
    if (!window.electronAPI) return;
    try {
      const config = await window.electronAPI.loadConfig();
      set({
        configuredNamespaces: config.configuredNamespaces || {},
        portOverrides: config.portOverrides || {},
        selectedServices: config.selectedServices || {},
        groups: config.groups || [],
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
        selectedServices: state.selectedServices,
        groups: state.groups,
      };
      await window.electronAPI.saveConfig(config);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },
  resetState: async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.resetConfig();
      set({
        configuredNamespaces: {},
        portOverrides: {},
        selectedServices: {},
        groups: [],
      });
    } catch (error) {
      console.error('Failed to reset state:', error);
      throw error;
    }
  },
}));

