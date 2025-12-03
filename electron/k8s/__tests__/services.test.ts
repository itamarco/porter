import { getNamespaces, getServices } from '../services';
import { K8sClient } from '../client';
import * as k8s from '@kubernetes/client-node';

describe('getNamespaces', () => {
  let mockClient: jest.Mocked<K8sClient>;
  let mockCoreV1Api: jest.Mocked<k8s.CoreV1Api>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreV1Api = {
      listNamespace: jest.fn(),
    } as any;

    mockClient = {
      getCurrentContext: jest.fn().mockReturnValue('original-context'),
      setContext: jest.fn(),
      getCoreV1Api: jest.fn().mockReturnValue(mockCoreV1Api),
    } as any;
  });

  it('should return namespace names', async () => {
    const namespaces = {
      body: {
        items: [
          { metadata: { name: 'default' } },
          { metadata: { name: 'kube-system' } },
        ],
      },
    };
    mockCoreV1Api.listNamespace.mockResolvedValue(namespaces as any);

    const result = await getNamespaces(mockClient, 'test-cluster');

    expect(mockClient.setContext).toHaveBeenCalledWith('test-cluster');
    expect(mockCoreV1Api.listNamespace).toHaveBeenCalled();
    expect(result).toEqual(['default', 'kube-system']);
    expect(mockClient.setContext).toHaveBeenCalledWith('original-context');
  });

  it('should handle response without body', async () => {
    const namespaces = {
      items: [
        { metadata: { name: 'default' } },
      ],
    };
    mockCoreV1Api.listNamespace.mockResolvedValue(namespaces as any);

    const result = await getNamespaces(mockClient, 'test-cluster');

    expect(result).toEqual(['default']);
  });

  it('should filter out namespaces without names', async () => {
    const namespaces = {
      body: {
        items: [
          { metadata: { name: 'default' } },
          { metadata: {} },
          { metadata: { name: 'kube-system' } },
        ],
      },
    };
    mockCoreV1Api.listNamespace.mockResolvedValue(namespaces as any);

    const result = await getNamespaces(mockClient, 'test-cluster');

    expect(result).toEqual(['default', 'kube-system']);
  });

  it('should restore original context on error', async () => {
    mockCoreV1Api.listNamespace.mockRejectedValue(new Error('API error'));

    await expect(getNamespaces(mockClient, 'test-cluster')).rejects.toThrow('API error');
    expect(mockClient.setContext).toHaveBeenCalledWith('original-context');
  });
});

describe('getServices', () => {
  let mockClient: jest.Mocked<K8sClient>;
  let mockCoreV1Api: jest.Mocked<k8s.CoreV1Api>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreV1Api = {
      listNamespacedService: jest.fn(),
    } as any;

    mockClient = {
      getCurrentContext: jest.fn().mockReturnValue('original-context'),
      setContext: jest.fn(),
      getCoreV1Api: jest.fn().mockReturnValue(mockCoreV1Api),
    } as any;
  });

  it('should return service info', async () => {
    const services = {
      body: {
        items: [
          {
            metadata: { name: 'test-service', namespace: 'default' },
            spec: {
              ports: [
                { name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' },
              ],
            },
          },
        ],
      },
    };
    mockCoreV1Api.listNamespacedService.mockResolvedValue(services as any);

    const result = await getServices(mockClient, 'test-cluster', 'default');

    expect(mockClient.setContext).toHaveBeenCalledWith('test-cluster');
    expect(mockCoreV1Api.listNamespacedService).toHaveBeenCalled();
    expect(result).toEqual([
      {
        name: 'test-service',
        namespace: 'default',
        ports: [
          { name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' },
        ],
      },
    ]);
    expect(mockClient.setContext).toHaveBeenCalledWith('original-context');
  });

  it('should handle services without ports', async () => {
    const services = {
      body: {
        items: [
          {
            metadata: { name: 'test-service', namespace: 'default' },
            spec: {},
          },
        ],
      },
    };
    mockCoreV1Api.listNamespacedService.mockResolvedValue(services as any);

    const result = await getServices(mockClient, 'test-cluster', 'default');

    expect(result).toEqual([
      {
        name: 'test-service',
        namespace: 'default',
        ports: [],
      },
    ]);
  });

  it('should use default values for missing port fields', async () => {
    const services = {
      body: {
        items: [
          {
            metadata: { name: 'test-service', namespace: 'default' },
            spec: {
              ports: [
                { port: 80 },
              ],
            },
          },
        ],
      },
    };
    mockCoreV1Api.listNamespacedService.mockResolvedValue(services as any);

    const result = await getServices(mockClient, 'test-cluster', 'default');

    expect(result[0].ports[0]).toEqual({
      name: 'default',
      port: 80,
      targetPort: 80,
      protocol: 'TCP',
    });
  });

  it('should restore original context on error', async () => {
    mockCoreV1Api.listNamespacedService.mockRejectedValue(new Error('API error'));

    await expect(getServices(mockClient, 'test-cluster', 'default')).rejects.toThrow('API error');
    expect(mockClient.setContext).toHaveBeenCalledWith('original-context');
  });
});

