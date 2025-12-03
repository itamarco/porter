import { ElectronAPI } from '../../types/electron';

export const createMockElectronAPI = (): ElectronAPI => ({
  getClusters: jest.fn().mockResolvedValue([]),
  getNamespaces: jest.fn().mockResolvedValue([]),
  getServices: jest.fn().mockResolvedValue([]),
  startPortForward: jest.fn().mockResolvedValue('test-id'),
  stopPortForward: jest.fn().mockResolvedValue(true),
  getActiveForwards: jest.fn().mockResolvedValue([]),
  loadConfig: jest.fn().mockResolvedValue({
    configuredNamespaces: {},
    portOverrides: {},
  }),
  saveConfig: jest.fn().mockResolvedValue(true),
  openInBrowser: jest.fn().mockResolvedValue(true),
  onPortForwardUpdate: jest.fn(),
  removePortForwardListener: jest.fn(),
});

