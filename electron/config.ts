import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Group {
  id: string;
  name: string;
  servicePorts: string[];
  localPort?: number;
}

export interface AppConfig {
  configuredNamespaces: Record<string, string[]>;
  portOverrides: Record<string, number>;
  selectedServices: Record<string, string[]>;
  groups?: Group[];
}

const CONFIG_FILE_NAME = 'config.json';

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, CONFIG_FILE_NAME);
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(data);
      return {
        configuredNamespaces: config.configuredNamespaces || {},
        portOverrides: config.portOverrides || {},
        selectedServices: config.selectedServices || {},
        groups: config.groups || [],
      };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

  return {
    configuredNamespaces: {},
    portOverrides: {},
    selectedServices: {},
    groups: [],
  };
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

export function resetConfig(): void {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  } catch (error) {
    console.error('Error resetting config:', error);
    throw error;
  }
}

export function exportConfig(): AppConfig {
  return loadConfig();
}

export function importConfig(configData: AppConfig): void {
  const config: AppConfig = {
    configuredNamespaces: configData.configuredNamespaces || {},
    portOverrides: configData.portOverrides || {},
    selectedServices: configData.selectedServices || {},
    groups: configData.groups || [],
  };
  saveConfig(config);
}

