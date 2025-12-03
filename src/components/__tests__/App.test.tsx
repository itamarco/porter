import { render, screen } from '@testing-library/react';
import App from '../App';
import { usePortForwardStore } from '../../stores/portforwards';
import { useK8s } from '../../hooks/useK8s';

jest.mock('../../stores/portforwards');
jest.mock('../../hooks/useK8s');

describe('App', () => {
  beforeEach(() => {
    (useK8s as jest.Mock).mockReturnValue({
      clusters: [],
      selectedCluster: null,
      configuredNamespaces: {},
      services: {},
      activeForwards: [],
    });
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: null,
    });
  });

  it('should render app title', () => {
    render(<App />);
    expect(screen.getByText('Porter')).toBeInTheDocument();
    expect(screen.getByText('K8s Port Forward Manager')).toBeInTheDocument();
  });

  it('should render error message when error exists', () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: 'Test error message',
    });

    render(<App />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should not render error message when error is null', () => {
    (usePortForwardStore as jest.Mock).mockReturnValue({
      error: null,
    });

    render(<App />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should render ClusterPanel', () => {
    render(<App />);
    expect(screen.getByText('Clusters')).toBeInTheDocument();
  });
});

