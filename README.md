# <img src="assets/icon.png" width="32" height="32" align="center"/> Porter

> A beautiful macOS app for managing Kubernetes port-forwards with ease

> ⚠️ **First time installing on macOS?** See [⚠️ "App is damaged" Error](#️-app-is-damaged-error) if macOS blocks the app

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
- ☸️ kubectl installed and configured
- 🔑 Valid kubeconfig (`~/.kube/config`)

---

## 📥 Installation

### Download & Install

1. Download the latest DMG from [Releases](../../releases)
2. Open the DMG and drag **Porter.app** to your Applications folder
3. Launch Porter from Applications

### ⚠️ "App is damaged" Error

If macOS shows an error saying Porter is "damaged and should be moved to the trash", this is because the app is not code-signed. This is a security feature of macOS Gatekeeper.

**Fix it by running this command in Terminal:**

```bash
xattr -cr /Applications/Porter.app
```

**Alternative:** Right-click Porter.app → **Open** → Click **Open** in the dialog.

---

## 🛠️ Development

> Requires Node.js 18+

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

**macOS:**

```
~/Library/Logs/porter/main.log
```

**Windows:**

```
%USERPROFILE%\AppData\Roaming\porter\logs\main.log
```

Or in expanded form:

```
C:\Users\<YourUsername>\AppData\Roaming\porter\logs\main.log
```

### Viewing Logs

**In Development:**

- Logs appear in the terminal/console where you run `npm run dev`
- DevTools console also shows logs

**In Production:**

**macOS:**

- View logs using macOS Console.app:
  1. Open **Console.app** (Applications > Utilities)
  2. Search for "porter" or navigate to your user logs
  3. Select `~/Library/Logs/porter/main.log`
- Or open the log file directly in a text editor

**Windows:**

- Open File Explorer and navigate to: `%USERPROFILE%\AppData\Roaming\porter\logs\`
- Open `main.log` in any text editor (Notepad, VS Code, etc.)
- Or press `Win + R`, type `%USERPROFILE%\AppData\Roaming\porter\logs\main.log` and press Enter

**Both Platforms:**

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
