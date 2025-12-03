import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServiceList } from '../ServiceList';
import { usePortForwardStore } from '../../stores/portforwards';
import { useK8s } from '../../hooks/useK8s';
import { ClusterInfo, ServiceInfo } from '../../types/electron';
import { createMockElectronAPI } from '../../__tests__/mocks/electronAPI';

jest.mock('../../stores/portforwards');
jest.mock('../../hooks/useK8s');

describe('ServiceList', () => {
  const mockElectronAPI = createMockElectronAPI();

  beforeEach(() => {
    window.electronAPI = mockElectronAPI as any;
    jest.clearAllMocks();
    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: jest.fn(),
      refreshActiveForwards: jest.fn(),
    });
    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters: [],
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });
  });

  it('should render message when no clusters with namespaces', () => {
    render(<ServiceList />);
    expect(screen.getByText('Add namespaces to clusters above to see services')).toBeInTheDocument();
  });

  it('should render services for configured namespaces', () => {
    const clusters: ClusterInfo[] = [
      { name: 'test-cluster', context: 'test-context', server: 'https://test.com' },
    ];
    const services: ServiceInfo[] = [
      {
        name: 'test-service',
        namespace: 'default',
        ports: [{ name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { 'test-context': ['default'] },
      services: { 'test-context:default': services },
      activeForwards: [],
    });

    render(<ServiceList />);

    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('test-cluster')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('test-service')).toBeInTheDocument();
  });

  it('should refresh services when refresh button clicked', async () => {
    const clusters: ClusterInfo[] = [
      { name: 'test-cluster', context: 'test-context', server: 'https://test.com' },
    ];
    const mockLoadServices = jest.fn();

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { 'test-context': ['default'] },
      services: { 'test-context:default': [] },
      activeForwards: [],
    });

    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
      loadServices: mockLoadServices,
      refreshActiveForwards: jest.fn(),
    });

    render(<ServiceList />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockLoadServices).toHaveBeenCalledWith('test-context', 'default');
    });
  });

  it('should expand service to show ports', () => {
    const clusters: ClusterInfo[] = [
      { name: 'test-cluster', context: 'test-context', server: 'https://test.com' },
    ];
    const services: ServiceInfo[] = [
      {
        name: 'test-service',
        namespace: 'default',
        ports: [{ name: 'http', port: 80, targetPort: 8080, protocol: 'TCP' }],
      },
    ];

    (usePortForwardStore as jest.Mock).mockReturnValue({
      clusters,
      configuredNamespaces: { 'test-context': ['default'] },
      services: { 'test-context:default': services },
      activeForwards: [],
    });

    render(<ServiceList />);

    const serviceCard = screen.getByText('test-service').closest('div');
    fireEvent.click(serviceCard!);

    expect(screen.getByText('http (TCP)')).toBeInTheDocument();
  });
});

