import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AppConfig {
  configuredNamespaces: Record<string, string[]>;
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
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

  return {
    configuredNamespaces: {},
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

