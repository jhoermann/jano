import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface JanoConfig {
  plugins: Record<string, { enabled: boolean }>;
}

const JANO_DIR = join(homedir(), '.jano');
const CONFIG_PATH = join(JANO_DIR, 'config.json');
const PLUGINS_DIR = join(JANO_DIR, 'plugins');

export function getJanoDir(): string { return JANO_DIR; }
export function getPluginsDir(): string { return PLUGINS_DIR; }
export function getConfigPath(): string { return CONFIG_PATH; }

export function ensureJanoDir() {
  if (!existsSync(JANO_DIR)) mkdirSync(JANO_DIR, { recursive: true });
  if (!existsSync(PLUGINS_DIR)) mkdirSync(PLUGINS_DIR, { recursive: true });
}

export function loadConfig(): JanoConfig {
  ensureJanoDir();

  if (!existsSync(CONFIG_PATH)) {
    return { plugins: {} };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw) as JanoConfig;
  } catch {
    return { plugins: {} };
  }
}

export function saveConfig(config: JanoConfig) {
  ensureJanoDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export function isPluginEnabled(config: JanoConfig, name: string): boolean {
  return config.plugins[name]?.enabled !== false;
}

export function setPluginEnabled(config: JanoConfig, name: string, enabled: boolean) {
  config.plugins[name] = { enabled };
}
