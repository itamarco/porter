import '@testing-library/jest-dom';

global.window.electronAPI = {
  getClusters: jest.fn(),
  getNamespaces: jest.fn(),
  getServices: jest.fn(),
  startPortForward: jest.fn(),
  stopPortForward: jest.fn(),
  getActiveForwards: jest.fn(),
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  openInBrowser: jest.fn(),
  onPortForwardUpdate: jest.fn(),
  removePortForwardListener: jest.fn(),
} as any;

