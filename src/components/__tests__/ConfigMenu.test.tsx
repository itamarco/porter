import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfigMenu } from "../ConfigMenu";
import { usePortForwardStore } from "../../stores/portforwards";
import { createMockElectronAPI } from "../../__tests__/mocks/electronAPI";

jest.mock("../../stores/portforwards");

describe("ConfigMenu", () => {
  const mockElectronAPI = createMockElectronAPI();
  const mockLoadConfig = jest.fn().mockResolvedValue(undefined);
  const mockResetState = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation();
    window.electronAPI = mockElectronAPI as any;
    global.confirm = jest.fn().mockReturnValue(true);
    global.alert = jest.fn();

    (usePortForwardStore as jest.Mock).mockReturnValue({
      loadConfig: mockLoadConfig,
      resetState: mockResetState,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should render config menu button", () => {
    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    expect(button).toBeInTheDocument();
  });

  it("should toggle menu when button is clicked", () => {
    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    expect(screen.getByText("Reset State")).toBeInTheDocument();
    expect(screen.getByText("Export State")).toBeInTheDocument();
    expect(screen.getByText("Import State")).toBeInTheDocument();
  });

  it("should close menu when clicking outside", () => {
    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    expect(screen.getByText("Reset State")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Reset State")).not.toBeInTheDocument();
  });

  it("should call resetState when reset button is clicked and confirmed", async () => {
    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const resetButton = screen.getByText("Reset State");
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockResetState).toHaveBeenCalled();
    });
  });

  it("should not call resetState when reset is cancelled", async () => {
    global.confirm = jest.fn().mockReturnValue(false);

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const resetButton = screen.getByText("Reset State");
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(mockResetState).not.toHaveBeenCalled();
    });
  });

  it("should show alert when Electron API is not available for reset", async () => {
    window.electronAPI = undefined as any;

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const resetButton = screen.getByText("Reset State");
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Electron API not available");
      expect(mockResetState).not.toHaveBeenCalled();
    });
  });

  it("should call exportConfigToFile when export button is clicked", async () => {
    mockElectronAPI.exportConfigToFile = jest
      .fn()
      .mockResolvedValue({ canceled: false });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const exportButton = screen.getByText("Export State");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockElectronAPI.exportConfigToFile).toHaveBeenCalled();
    });
  });

  it("should show success alert when export succeeds", async () => {
    mockElectronAPI.exportConfigToFile = jest
      .fn()
      .mockResolvedValue({ canceled: false });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const exportButton = screen.getByText("Export State");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "State has been exported successfully."
      );
    });
  });

  it("should not show success alert when export is cancelled", async () => {
    mockElectronAPI.exportConfigToFile = jest
      .fn()
      .mockResolvedValue({ canceled: true });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const exportButton = screen.getByText("Export State");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.alert).not.toHaveBeenCalledWith(
        "State has been exported successfully."
      );
    });
  });

  it("should call importConfigFromFile when import button is clicked", async () => {
    mockElectronAPI.importConfigFromFile = jest
      .fn()
      .mockResolvedValue({ canceled: false });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const importButton = screen.getByText("Import State");
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockElectronAPI.importConfigFromFile).toHaveBeenCalled();
      expect(mockLoadConfig).toHaveBeenCalled();
    });
  });

  it("should show success alert when import succeeds", async () => {
    mockElectronAPI.importConfigFromFile = jest
      .fn()
      .mockResolvedValue({ canceled: false });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const importButton = screen.getByText("Import State");
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "State has been imported successfully. Please reload the application to see the changes."
      );
    });
  });

  it("should show error alert when import fails", async () => {
    mockElectronAPI.importConfigFromFile = jest
      .fn()
      .mockRejectedValue(new Error("Import failed"));

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const importButton = screen.getByText("Import State");
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Failed to import state. Please ensure the file is valid JSON."
      );
    });
  });

  it("should show error alert when export fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockElectronAPI.exportConfigToFile = jest
      .fn()
      .mockRejectedValue(new Error("Export failed"));

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const exportButton = screen.getByText("Export State");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to export state.");
    });

    consoleErrorSpy.mockRestore();
  });

  it("should close menu after action is performed", async () => {
    mockElectronAPI.exportConfigToFile = jest
      .fn()
      .mockResolvedValue({ canceled: false });

    render(<ConfigMenu />);

    const button = screen.getByLabelText("Config menu");
    fireEvent.click(button);

    const exportButton = screen.getByText("Export State");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.queryByText("Reset State")).not.toBeInTheDocument();
    });
  });
});
