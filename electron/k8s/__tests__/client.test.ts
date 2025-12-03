import { K8sClient } from '../client';
import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('@kubernetes/client-node');
jest.mock('fs');

describe('K8sClient', () => {
  let mockKubeConfig: jest.Mocked<k8s.KubeConfig>;
  let mockCoreV1Api: jest.Mocked<k8s.CoreV1Api>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreV1Api = {} as any;
    mockKubeConfig = {
      loadFromFile: jest.fn(),
      loadFromDefault: jest.fn(),
      getContexts: jest.fn().mockReturnValue([]),
      getCurrentContext: jest.fn().mockReturnValue('default-context'),
      setCurrentContext: jest.fn(),
      makeApiClient: jest.fn().mockReturnValue(mockCoreV1Api),
    } as any;

    (k8s.KubeConfig as jest.Mock).mockImplementation(() => mockKubeConfig);
  });

  describe('constructor', () => {
    it('should create KubeConfig instance', () => {
      new K8sClient();
      expect(k8s.KubeConfig).toHaveBeenCalled();
    });

    it('should load config from file if exists', () => {
      const kubeconfigPath = path.join(os.homedir(), '.kube', 'config');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      new K8sClient();

      expect(fs.existsSync).toHaveBeenCalledWith(kubeconfigPath);
      expect(mockKubeConfig.loadFromFile).toHaveBeenCalledWith(kubeconfigPath);
    });

    it('should load default config if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      new K8sClient();

      expect(mockKubeConfig.loadFromDefault).toHaveBeenCalled();
    });

    it('should use KUBECONFIG environment variable if set', () => {
      const customPath = '/custom/kubeconfig';
      process.env.KUBECONFIG = customPath;
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      new K8sClient();

      expect(fs.existsSync).toHaveBeenCalledWith(customPath);
      expect(mockKubeConfig.loadFromFile).toHaveBeenCalledWith(customPath);

      delete process.env.KUBECONFIG;
    });
  });

  describe('getContexts', () => {
    it('should return contexts from kubeconfig', () => {
      const contexts = [
        { name: 'context1', cluster: 'cluster1' },
        { name: 'context2', cluster: 'cluster2' },
      ];
      mockKubeConfig.getContexts.mockReturnValue(contexts as any);

      const client = new K8sClient();
      const result = client.getContexts();

      expect(result).toEqual(contexts);
    });
  });

  describe('getCurrentContext', () => {
    it('should return current context name', () => {
      mockKubeConfig.getCurrentContext.mockReturnValue('test-context');

      const client = new K8sClient();
      const result = client.getCurrentContext();

      expect(result).toBe('test-context');
    });
  });

  describe('setContext', () => {
    it('should set current context', () => {
      const client = new K8sClient();
      client.setContext('test-context');

      expect(mockKubeConfig.setCurrentContext).toHaveBeenCalledWith('test-context');
    });
  });

  describe('getCoreV1Api', () => {
    it('should return CoreV1Api instance', () => {
      const client = new K8sClient();
      const api = client.getCoreV1Api();

      expect(mockKubeConfig.makeApiClient).toHaveBeenCalledWith(k8s.CoreV1Api);
      expect(api).toBe(mockCoreV1Api);
    });
  });

  describe('getKubeConfig', () => {
    it('should return kubeconfig instance', () => {
      const client = new K8sClient();
      const kc = client.getKubeConfig();

      expect(kc).toBe(mockKubeConfig);
    });
  });
});

