import { render, screen, waitFor } from "@testing-library/react";
import { UpdateBanner } from "../UpdateBanner";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";
import { UpdateInfo } from "../../types/electron";

describe("UpdateBanner", () => {
  const mockElectronAPI = createMockElectronAPI();
  let mockLocalStorage: { [key: string]: string } = {};

  beforeEach(() => {
    window.electronAPI = mockElectronAPI as any;
    jest.clearAllMocks();
    mockLocalStorage = {};
    Storage.prototype.getItem = jest.fn((key: string) => mockLocalStorage[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });
  });

  it("should not render when no update is available", async () => {
    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue({
      currentVersion: "1.0.0",
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      assetUrl: null,
      releaseNotes: null,
    });

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
    });
  });

  it("should render update banner when update is available", async () => {
    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo
    );

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(
        screen.getByText(/Porter v1\.1\.0 available/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/You're currently on v1\.0\.0/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/xattr -cr \/Applications\/Porter\.app/i)
      ).toBeInTheDocument();
    });
  });

  it("should call checkForUpdates on mount", async () => {
    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue({
      currentVersion: "1.0.0",
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      assetUrl: null,
      releaseNotes: null,
    });

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();
    });
  });

  it("should set up update status listener", async () => {
    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue({
      currentVersion: "1.0.0",
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      assetUrl: null,
      releaseNotes: null,
    });

    const { unmount } = render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockElectronAPI.onUpdateStatus).toHaveBeenCalled();
    });

    unmount();

    expect(mockElectronAPI.removeUpdateStatusListener).toHaveBeenCalled();
  });

  it("should open download URL when Download button is clicked", async () => {
    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo
    );
    (mockElectronAPI.openInBrowser as jest.Mock).mockResolvedValue(true);

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Download Update/i)).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download Update/i);
    downloadButton.click();

    await waitFor(() => {
      expect(mockElectronAPI.openInBrowser).toHaveBeenCalledWith(
        updateInfo.assetUrl
      );
    });
  });

  it("should fallback to releaseUrl when assetUrl is not available", async () => {
    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl: null,
      releaseNotes: "Release notes",
    };

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo
    );
    (mockElectronAPI.openInBrowser as jest.Mock).mockResolvedValue(true);

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Download Update/i)).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download Update/i);
    downloadButton.click();

    await waitFor(() => {
      expect(mockElectronAPI.openInBrowser).toHaveBeenCalledWith(
        updateInfo.releaseUrl
      );
    });
  });

  it("should dismiss banner when Dismiss button is clicked", async () => {
    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo
    );

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(screen.getByText(/Dismiss/i)).toBeInTheDocument();
    });

    const dismissButton = screen.getByText(/Dismiss/i);
    dismissButton.click();

    await waitFor(() => {
      expect(
        screen.queryByText(/Porter v1\.1\.0 available/i)
      ).not.toBeInTheDocument();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "porter.dismissedUpdateVersions",
      JSON.stringify(["1.1.0"])
    );
  });

  it("should not show banner for dismissed version after remount", async () => {
    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    mockLocalStorage["porter.dismissedUpdateVersions"] = JSON.stringify(["1.1.0"]);

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo
    );

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();
    });

    expect(
      screen.queryByText(/Porter v1\.1\.0 available/i)
    ).not.toBeInTheDocument();
  });

  it("should show banner for new version after dismissing previous version", async () => {
    const updateInfo1: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    mockLocalStorage["porter.dismissedUpdateVersions"] = JSON.stringify(["1.1.0"]);

    const updateInfo2: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.2.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.2.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.2.0/Porter-1.2.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue(
      updateInfo2
    );

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(
        screen.getByText(/Porter v1\.2\.0 available/i)
      ).toBeInTheDocument();
    });
  });

  it("should handle update status events", async () => {
    (mockElectronAPI.checkForUpdates as jest.Mock).mockResolvedValue({
      currentVersion: "1.0.0",
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      assetUrl: null,
      releaseNotes: null,
    });

    let updateStatusCallback: ((data: UpdateInfo) => void) | null = null;
    (mockElectronAPI.onUpdateStatus as jest.Mock).mockImplementation(
      (callback) => {
        updateStatusCallback = callback;
      }
    );

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockElectronAPI.onUpdateStatus).toHaveBeenCalled();
    });

    const updateInfo: UpdateInfo = {
      currentVersion: "1.0.0",
      latestVersion: "1.1.0",
      updateAvailable: true,
      releaseUrl: "https://github.com/itamarco/porter/releases/tag/v1.1.0",
      assetUrl:
        "https://github.com/itamarco/porter/releases/download/v1.1.0/Porter-1.1.0-arm64.dmg",
      releaseNotes: "Release notes",
    };

    if (updateStatusCallback) {
      updateStatusCallback(updateInfo);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/Porter v1\.1\.0 available/i)
      ).toBeInTheDocument();
    });
  });

  it("should not render when electronAPI is not available", () => {
    window.electronAPI = undefined as any;

    render(<UpdateBanner />);

    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
  });

  it("should handle checkForUpdates errors gracefully", async () => {
    (mockElectronAPI.checkForUpdates as jest.Mock).mockRejectedValue(
      new Error("Network error")
    );

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<UpdateBanner />);

    await waitFor(() => {
      expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();
    });

    expect(screen.queryByText(/available/i)).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking for updates:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
