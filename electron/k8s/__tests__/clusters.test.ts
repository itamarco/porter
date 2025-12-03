import { getClusters, ClusterInfo } from '../clusters';
import { K8sClient } from '../client';
import * as k8s from '@kubernetes/client-node';

describe('getClusters', () => {
  let mockClient: jest.Mocked<K8sClient>;
  let mockKubeConfig: jest.Mocked<k8s.KubeConfig>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKubeConfig = {
      getContexts: jest.fn(),
    } as any;

    mockClient = {
      getContexts: jest.fn(),
    } as any;
  });

  it('should return cluster info from contexts', async () => {
    const contexts = [
      { name: 'context1', cluster: 'cluster1' },
      { name: 'context2', cluster: 'cluster2' },
    ];
    mockClient.getContexts.mockReturnValue(contexts as any);

    const result = await getClusters(mockClient);

    expect(result).toEqual([
      { name: 'context1', context: 'context1', server: 'cluster1' },
      { name: 'context2', context: 'context2', server: 'cluster2' },
    ]);
  });

  it('should handle contexts without cluster', async () => {
    const contexts = [
      { name: 'context1' },
    ];
    mockClient.getContexts.mockReturnValue(contexts as any);

    const result = await getClusters(mockClient);

    expect(result).toEqual([
      { name: 'context1', context: 'context1', server: '' },
    ]);
  });

  it('should return empty array when no contexts', async () => {
    mockClient.getContexts.mockReturnValue([]);

    const result = await getClusters(mockClient);

    expect(result).toEqual([]);
  });
});

