# Publishing Porter

This guide covers how to build and publish Porter for distribution.

## Prerequisites

1. **macOS** - Required for building macOS applications
2. **Apple Developer Account** (optional but recommended) - For code signing and notarization
3. **GitHub Personal Access Token** (if publishing to GitHub Releases) - With `repo` scope

## Building Locally

To build the app locally without publishing:

```bash
npm run build
```

This will:
1. Compile TypeScript (`tsc`)
2. Build the React app (`vite build`)
3. Package the Electron app using `electron-builder`
4. Create DMG files in the `release/` directory

The output will be:
- `release/Porter-1.0.0-x64.dmg` (Intel Mac)
- `release/Porter-1.0.0-arm64.dmg` (Apple Silicon Mac)
- `release/Porter-1.0.0-universal.dmg` (Universal binary, if configured)

## Code Signing (Recommended)

For distribution outside the Mac App Store, you should code sign your app. This prevents macOS security warnings.

### Setup

1. Get an Apple Developer certificate:
   - Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
   - Create an "Developer ID Application" certificate in Xcode or Keychain Access

2. Configure electron-builder with your certificate:

Update `electron-builder.json`:

```json
{
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "assets/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "assets/entitlements.mac.plist",
    "entitlementsInherit": "assets/entitlements.mac.plist"
  }
}
```

3. Set environment variables:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
export CSC_LINK="/path/to/your/certificate.p12"
export CSC_KEY_PASSWORD="your-certificate-password"
```

Or use Keychain (recommended):
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=true
```

## Notarization (Required for Distribution)

macOS requires notarization for apps distributed outside the App Store.

### Setup

1. Create an App-Specific Password:
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in → App-Specific Passwords → Generate
   - Save the password

2. Configure electron-builder:

Add to `electron-builder.json`:

```json
{
  "afterSign": "scripts/notarize.js",
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false
  }
}
```

3. Create `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.porter.app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
```

4. Install notarization tool:

```bash
npm install --save-dev @electron/notarize
```

## Publishing to GitHub Releases

### Automatic Publishing

1. Add publish configuration to `electron-builder.json`:

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "porter"
  }
}
```

2. Set GitHub token:

```bash
export GH_TOKEN="your-github-personal-access-token"
```

3. Build and publish:

```bash
npm run build
```

Or add a separate publish script to `package.json`:

```json
{
  "scripts": {
    "publish": "electron-builder --publish always"
  }
}
```

### Manual Publishing

1. Build the app:
```bash
npm run build
```

2. Create a GitHub Release:
   - Go to your repository on GitHub
   - Click "Releases" → "Draft a new release"
   - Tag version: `v1.0.0` (must match `package.json` version)
   - Upload DMG files from `release/` directory
   - Publish release

## Version Management

Follow semantic versioning:

- **Major** (`1.0.0` → `2.0.0`): Breaking changes
- **Minor** (`1.0.0` → `1.1.0`): New features, backward compatible
- **Patch** (`1.0.0` → `1.0.1`): Bug fixes

Update version in `package.json` before building:

```json
{
  "version": "1.0.1"
}
```

## CI/CD Publishing (GitHub Actions)

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: npm run build
```

## Troubleshooting

### "App is damaged" Error

This usually means the app isn't code signed or notarized. Solutions:
1. Code sign the app (see Code Signing section)
2. Notarize the app (see Notarization section)
3. Users can bypass: `xattr -cr /path/to/Porter.app`

### Build Fails with Icon Error

Ensure `assets/icon.icns` exists. You can create it from a PNG:
1. Create a 1024x1024 PNG icon
2. Use `iconutil` or online tools to convert to `.icns`
3. Place in `assets/icon.icns`

### Universal Binary Issues

To create a universal binary (single DMG for both architectures), update `electron-builder.json`:

```json
{
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["universal"]
      }
    ]
  }
}
```

## Distribution Options

1. **GitHub Releases** (Recommended for open source)
   - Free
   - Easy to set up
   - Automatic updates possible

2. **Mac App Store**
   - Requires additional configuration
   - Sandboxing restrictions
   - Review process

3. **Direct Download**
   - Host DMG files on your website
   - No automatic updates without custom solution

4. **Homebrew Cask** (for developers)
   - Create a cask formula
   - Users install via `brew install --cask porter`

