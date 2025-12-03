import { loadConfig, saveConfig, AppConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

jest.mock('fs');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

describe('config', () => {
  const mockUserDataPath = '/mock/user/data';
  const mockConfigPath = path.join(mockUserDataPath, 'config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    (app.getPath as jest.Mock).mockReturnValue(mockUserDataPath);
  });

  describe('loadConfig', () => {
    it('should load config from file', () => {
      const config: AppConfig = {
        configuredNamespaces: { 'cluster1': ['default'] },
        portOverrides: { 'key1': 8080 },
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(config));

      const result = loadConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
      expect(result).toEqual(config);
    });

    it('should return default config when file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = loadConfig();

      expect(result).toEqual({
        configuredNamespaces: {},
        portOverrides: {},
      });
    });

    it('should return default config on parse error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = loadConfig();

      expect(result).toEqual({
        configuredNamespaces: {},
        portOverrides: {},
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const config: AppConfig = {
        configuredNamespaces: { 'cluster1': ['default'] },
        portOverrides: { 'key1': 8080 },
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      saveConfig(config);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    });

    it('should create directory if it does not exist', () => {
      const config: AppConfig = {
        configuredNamespaces: {},
        portOverrides: {},
      };
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      saveConfig(config);

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(mockConfigPath), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw error on save failure', () => {
      const config: AppConfig = {
        configuredNamespaces: {},
        portOverrides: {},
      };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => saveConfig(config)).toThrow('Write failed');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

