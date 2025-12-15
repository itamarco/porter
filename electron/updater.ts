import { app } from "electron";
import { logger } from "./logger";

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  assetUrl: string | null;
  releaseNotes: string | null;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
  prerelease: boolean;
}

function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => {
    return v.replace(/^v/, "").split(".").map(Number);
  };

  const parts1 = normalize(v1);
  const parts2 = normalize(v2);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

function findDMGAsset(
  assets: GitHubRelease["assets"],
  arch: string
): string | null {
  const archPattern = arch === "arm64" ? "arm64" : "x64";
  const dmgAsset = assets.find(
    (asset) =>
      asset.name.endsWith(".dmg") &&
      (asset.name.includes(archPattern) || asset.name.includes("universal"))
  );

  return dmgAsset?.browser_download_url || null;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();
  const arch = process.arch;

  const defaultResponse: UpdateInfo = {
    currentVersion,
    latestVersion: null,
    updateAvailable: false,
    releaseUrl: null,
    assetUrl: null,
    releaseNotes: null,
  };

  try {
    const response = await fetch(
      "https://api.github.com/repos/itamarco/porter/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      logger.error(
        `Failed to fetch releases: ${response.status} ${response.statusText}`
      );
      return defaultResponse;
    }

    const release: GitHubRelease = await response.json();

    if (release.prerelease) {
      logger.info("Latest release is a prerelease, skipping");
      return defaultResponse;
    }

    const latestVersion = release.tag_name.replace(/^v/, "");
    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison >= 0) {
      logger.info(`Already on latest version: ${currentVersion}`);
      return defaultResponse;
    }

    const assetUrl = findDMGAsset(release.assets, arch);

    logger.info(
      `Update available: ${currentVersion} -> ${latestVersion} (${arch})`
    );

    return {
      currentVersion,
      latestVersion,
      updateAvailable: true,
      releaseUrl: release.html_url,
      assetUrl: assetUrl || release.html_url,
      releaseNotes: release.body,
    };
  } catch (error) {
    logger.error("Error checking for updates:", error);
    return defaultResponse;
  }
}
