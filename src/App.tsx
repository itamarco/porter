import { ClusterSelector } from './components/ClusterSelector';
import { NamespaceConfig } from './components/NamespaceConfig';
import { ServiceList } from './components/ServiceList';
import { ActiveForwards } from './components/ActiveForwards';
import { useK8s } from './hooks/useK8s';
import { usePortForwardStore } from './stores/portforwards';

function App() {
  useK8s();
  const { error } = usePortForwardStore();

  return (
    <div className="h-screen w-screen bg-gray-50 overflow-y-auto">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Porter</h1>
          <p className="text-gray-600 mt-1">K8s Port Forward Manager</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <ClusterSelector />
        <NamespaceConfig />
        <ServiceList />
        <ActiveForwards />
      </div>
    </div>
  );
}

export default App;

