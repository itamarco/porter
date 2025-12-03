# Testing Guide

This document describes the testing setup and how to run tests for the Porter application.

## Test Framework

The project uses:
- **Jest** - Test runner and assertion library
- **React Testing Library** - For testing React components
- **ts-jest** - TypeScript support for Jest

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are organized as follows:

```
src/
  __tests__/
    setup.ts                    # Test setup and global mocks
    mocks/
      electronAPI.ts           # Mock Electron API
  stores/
    __tests__/
      portforwards.test.ts     # Zustand store tests
  hooks/
    __tests__/
      useK8s.test.tsx          # React hook tests
  components/
    __tests__/
      App.test.tsx             # App component tests
      ClusterPanel.test.tsx    # ClusterPanel component tests
      ServiceList.test.tsx     # ServiceList component tests

electron/
  __tests__/
    config.test.ts             # Config module tests
  k8s/
    __tests__/
      client.test.ts           # K8sClient tests
      clusters.test.ts         # Cluster functions tests
      services.test.ts         # Service functions tests
      handlers.test.ts         # IPC handler tests
      portforward.test.ts      # Port forward manager tests
```

## Test Coverage

The test suite covers:

### Frontend Tests
- **Store (portforwards.ts)**: All state management functions including clusters, namespaces, services, port forwards, and configuration
- **Hook (useK8s.ts)**: Cluster loading, namespace loading, service loading, and port forward management
- **Components**: 
  - App component rendering and error handling
  - ClusterPanel component with cluster expansion, namespace management, and service display
  - ServiceList component with service rendering and refresh functionality

### Backend Tests
- **K8sClient**: Kubernetes client initialization, context management, and API client creation
- **Clusters**: Cluster discovery and context management
- **Services**: Namespace and service listing with error handling
- **Handlers**: All IPC handlers including cluster, namespace, service, port forward, and config handlers
- **Port Forward Manager**: Port forward instance lifecycle, retry logic, health checks, and manager operations
- **Config**: Configuration loading and saving with error handling

## Mocking

### Electron API Mock
The Electron API is mocked globally in `src/__tests__/setup.ts` to allow testing React components without requiring Electron.

### Kubernetes Client Mock
The Kubernetes client is mocked in backend tests to avoid requiring actual Kubernetes clusters.

## Writing New Tests

When adding new features:

1. Create test files following the naming convention: `*.test.ts` or `*.test.tsx`
2. Place tests next to the code they test or in `__tests__` directories
3. Mock external dependencies (Electron API, Kubernetes client, file system)
4. Test both success and error cases
5. Use descriptive test names that explain what is being tested

## Example Test

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePortForwardStore } from '../portforwards';

describe('usePortForwardStore', () => {
  it('should set clusters', () => {
    const { result } = renderHook(() => usePortForwardStore());
    const clusters = [{ name: 'test', context: 'test', server: 'https://test.com' }];

    act(() => {
      result.current.setClusters(clusters);
    });

    expect(result.current.clusters).toEqual(clusters);
  });
});
```

## Continuous Integration

Tests should pass before merging PRs. The CI pipeline runs:
- Linting checks
- Type checking
- Unit tests
- Integration tests (if applicable)

