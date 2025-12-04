import { ClusterPanel } from './components/ClusterPanel';
import { ServiceList } from './components/ServiceList';
import { Groups } from './components/Groups';
import { useK8s } from './hooks/useK8s';
import { usePortForwardStore } from './stores/portforwards';

function App() {
  useK8s();
  const { error } = usePortForwardStore();

  return (
    <div className="h-screen w-screen overflow-y-auto">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8 glass-card rounded-2xl p-6">
          <h1 className="text-4xl font-bold text-white mb-2">Porter</h1>
          <p className="text-gray-300 text-lg">K8s Port Forward Manager</p>
        </div>

        {error && (
          <div className="mb-6 p-4 glass rounded-xl" style={{
            background: 'rgba(220, 38, 38, 0.15)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(220, 38, 38, 0.3)'
          }}>
            <p className="font-semibold text-red-200">{error}</p>
          </div>
        )}

        <Groups />
        <ServiceList />
        <ClusterPanel />
      </div>
    </div>
  );
}

export default App;

