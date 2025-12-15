import { checkForUpdates, UpdateInfo } from "../updater";
import { app } from "electron";

jest.mock("electron", () => ({
  app: {
    getVersion: jest.fn(),
  },
}));

global.fetch = jest.fn();

describe("updater", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (app.getVersion as jest.Mock).mockReturnValue("1.0.0");
    process.arch = "arm64";
  });

  describe("checkForUpdates", () => {
    it("should return update available when newer version exists", async () => {
      const mockRelease = {
        tag_name: "v1.1.0",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
        body: "Release notes",
        prerelease: false,
        assets: [
          {
            name: "Porter-1.1.0-arm64.dmg",
            browser_download_url:
              "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe("1.1.0");
      expect(result.currentVersion).toBe("1.0.0");
      expect(result.releaseUrl).toBe(
        "https://github.com/itamarco/porter/releases/tag/v1.1.0"
      );
      expect(result.assetUrl).toBe(
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg"
      );
    });

    it("should return no update when on latest version", async () => {
      const mockRelease = {
        tag_name: "v1.0.0",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.0.0",
        body: "Release notes",
        prerelease: false,
        assets: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(result.latestVersion).toBe("1.0.0");
    });

    it("should return no update when current version is newer", async () => {
      (app.getVersion as jest.Mock).mockReturnValue("1.2.0");

      const mockRelease = {
        tag_name: "v1.1.0",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
        body: "Release notes",
        prerelease: false,
        assets: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(false);
    });

    it("should skip prerelease versions", async () => {
      const mockRelease = {
        tag_name: "v1.1.0-beta",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.1.0-beta",
        body: "Beta release",
        prerelease: true,
        assets: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(false);
    });

    it("should find x64 DMG asset when arch is x64", async () => {
      process.arch = "x64";

      const mockRelease = {
        tag_name: "v1.1.0",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
        body: "Release notes",
        prerelease: false,
        assets: [
          {
            name: "Porter-1.1.0-x64.dmg",
            browser_download_url:
              "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-x64.dmg",
          },
          {
            name: "Porter-1.1.0-arm64.dmg",
            browser_download_url:
              "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.assetUrl).toBe(
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-x64.dmg"
      );
    });

    it("should fallback to release URL when no matching asset found", async () => {
      const mockRelease = {
        tag_name: "v1.1.0",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
        body: "Release notes",
        prerelease: false,
        assets: [
          {
            name: "Porter-1.1.0-x64.dmg",
            browser_download_url:
              "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-x64.dmg",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.assetUrl).toBe(
        "https://github.com/itamarco/porter/releases/tag/v1.1.0"
      );
    });

    it("should handle fetch errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(result.latestVersion).toBeNull();
    });

    it("should handle non-ok responses gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(false);
      expect(result.latestVersion).toBeNull();
    });

    it("should handle version comparison correctly", async () => {
      (app.getVersion as jest.Mock).mockReturnValue("1.0.5");

      const mockRelease = {
        tag_name: "v1.0.10",
        html_url: "https://github.com/itamarco/porter/releases/tag/v1.0.10",
        body: "Release notes",
        prerelease: false,
        assets: [
          {
            name: "Porter-1.0.10-arm64.dmg",
            browser_download_url:
              "https://github.com/itamarco/porter/releases/download/v1.0.10/Porter-1.0.10-arm64.dmg",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRelease,
      });

      const result = await checkForUpdates();

      expect(result.updateAvailable).toBe(true);
      expect(result.latestVersion).toBe("1.0.10");
    });
  });
});
