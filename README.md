# 🚢 Porter

> A beautiful macOS app for managing Kubernetes port-forwards with ease

---

## ✨ Features

| Feature                     | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| 🔍 **Cluster Discovery**    | Automatically finds all clusters from your kubeconfig |
| 📁 **Namespace Management** | Configure namespaces per cluster for quick access     |
| 🌐 **Service Browser**      | Browse services and ports across your namespaces      |
| 🔌 **Port Forward Control** | Start/stop forwards with custom local port override   |
| 🔄 **Auto Reconnect**       | Automatic retry with exponential backoff              |
| 📊 **Live Dashboard**       | Real-time status with connection health checks        |

---

## 📋 Requirements

- 🍎 macOS
- 📦 Node.js 18+
- ☸️ kubectl installed and configured
- 🔑 Valid kubeconfig (`~/.kube/config`)

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

---

## 📖 Publishing

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for:

- 📀 Building distributable DMG files
- ✍️ Code signing and notarization
- 🚀 Publishing to GitHub Releases
- ⚙️ CI/CD setup for automated releases

---

## 🚀 Quick Start

1. 🖥️ Launch Porter
2. ☸️ Select a cluster from the dropdown
3. ➕ Add namespaces you want to manage
4. 🔎 Browse services in the configured namespaces
5. ▶️ Click **Start** on any service port to create a port-forward
6. 👀 Monitor active forwards in the dashboard
7. ⏹️ Stop port-forwards when done

---

## ⚙️ Configuration

Your namespace configs are saved automatically to:

```
~/Library/Application Support/porter/config.json
```

---

## 📝 Logging

Porter logs all operations to help with debugging. Logs are automatically written to files in production.

### Log File Location

Logs are stored at:

```
~/Library/Logs/porter/main.log
```

### Viewing Logs

**In Development:**

- Logs appear in the terminal/console where you run `npm run dev`
- DevTools console also shows logs

**In Production:**

- View logs using macOS Console.app:
  1. Open **Console.app** (Applications > Utilities)
  2. Search for "porter" or navigate to your user logs
  3. Select `~/Library/Logs/porter/main.log`
- Or open the log file directly in a text editor
- You can also get the log path programmatically via `window.electronAPI.getLogPath()`

### Log Levels

- **Info**: Normal operations (service fetching, port-forward start/stop, status changes)
- **Error**: Errors and failures (API errors, connection failures, process errors)
- **Debug**: Detailed debugging information (only in development mode)

All logs include timestamps and are prefixed with module names like `[getServices]`, `[PortForward]`, `[IPC]` for easy filtering.

---

## 🔌 Port Forward Features

| Feature                   | Details                                            |
| ------------------------- | -------------------------------------------------- |
| 🔄 **Auto Reconnect**     | Retries with exponential backoff (up to 5 retries) |
| 💓 **Health Checks**      | Periodic TCP probes ensure connection is alive     |
| ⏱️ **Connection Timeout** | 30-second timeout for initial connection           |
| 🚦 **Status Indicators**  | 🟢 Active · 🟡 Reconnecting · 🔴 Failed            |
| 🔁 **Manual Retry**       | Retry button available on failed forwards          |

---

## 📂 Project Structure

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

---

## 📄 License

MIT
