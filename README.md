# Porter - K8s Port Forward Manager

A macOS application for easily managing multiple Kubernetes port-forwards with a modern GUI.

## Features

- **Cluster Discovery**: Automatically discovers available Kubernetes clusters from your kubeconfig
- **Namespace Management**: Configure namespaces per cluster for easy access
- **Service Browser**: Browse services and their ports for selected namespaces
- **Port Forward Control**: Start/stop port-forwards with custom local port override
- **Robust Error Handling**: Automatic reconnection with exponential backoff
- **Status Dashboard**: Real-time status of active port-forwards with connection health checks

## Requirements

- macOS
- Node.js 18+
- kubectl installed and configured
- Valid kubeconfig file (~/.kube/config)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Publishing

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for detailed instructions on:
- Building distributable DMG files
- Code signing and notarization
- Publishing to GitHub Releases
- Setting up CI/CD for automated releases

## Usage

1. Launch the application
2. Select a cluster from the dropdown
3. Add namespaces you want to manage
4. Browse services in the configured namespaces
5. Click "Start" on any service port to create a port-forward
6. Monitor active port-forwards in the dashboard
7. Stop port-forwards when done

## Configuration

The app automatically saves your namespace configurations to `~/Library/Application Support/porter/config.json`.

## Port Forward Features

- **Automatic Reconnection**: If a port-forward fails, it will automatically retry with exponential backoff (up to 5 retries)
- **Health Checks**: Periodic TCP probes to ensure the connection is active
- **Connection Timeout**: 30-second timeout for initial connection establishment
- **Status Indicators**: Color-coded status (green=active, yellow=reconnecting, red=failed)
- **Manual Retry**: Retry button available when a port-forward fails

## Project Structure

```
porter/
├── electron/          # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # IPC bridge
│   ├── k8s/           # Kubernetes integration
│   └── config.ts      # Configuration persistence
├── src/               # React renderer process
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   ├── stores/        # State management (Zustand)
│   └── types/         # TypeScript definitions
└── dist-electron/     # Compiled Electron code
```

## License

MIT

