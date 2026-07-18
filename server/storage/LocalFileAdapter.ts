import fs from 'fs';
import path from 'path';
import { StorageAdapter, VersionInfo } from './types';

function debugLog(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  console.log(msg);
  fs.appendFileSync(path.join(process.cwd(), 'monetization-debug.log'), new Date().toISOString() + ' ' + msg + '\n');
}

export class LocalFileAdapter implements StorageAdapter {
  private readonly DATA_DIR = path.join(process.cwd(), '.data');
  private readonly LOCAL_CONFIG_PATH = path.join(this.DATA_DIR, 'monetization-config.json');
  private readonly DEFAULT_PATH = path.join(process.cwd(), 'public', 'monetization-config.json');
  private configCache: { data: any, timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 60 * 1000;

  constructor() {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
  }

  async loadConfig(): Promise<any> {
    if (this.configCache && (Date.now() - this.configCache.timestamp < this.CACHE_TTL_MS)) {
      debugLog('[Fallback Storage] CACHE HIT: Returning config from memory cache');
      return this.configCache.data;
    }

    debugLog('[Fallback Storage] Using local file fallback for loadConfig');
    if (fs.existsSync(this.LOCAL_CONFIG_PATH)) {
      const content = fs.readFileSync(this.LOCAL_CONFIG_PATH, 'utf-8');
      const data = JSON.parse(content);
      this.configCache = { data, timestamp: Date.now() };
      return data;
    }
    
    if (fs.existsSync(this.DEFAULT_PATH)) {
      const data = JSON.parse(fs.readFileSync(this.DEFAULT_PATH, 'utf-8'));
      this.configCache = { data, timestamp: Date.now() };
      return data;
    }
    
    return null;
  }

  async saveConfig(config: any, versionInfo: VersionInfo): Promise<void> {
    const dataToSave = { config, _metadata: versionInfo };
    this.configCache = { data: dataToSave, timestamp: Date.now() };

    debugLog('[Fallback Storage] Using local file fallback for saveConfig');
    fs.writeFileSync(this.LOCAL_CONFIG_PATH, JSON.stringify(dataToSave, null, 2));
    
    const historyPath = path.join(this.DATA_DIR, 'monetization-history.json');
    let history: any[] = [];
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    }
    history.unshift(dataToSave);
    if (history.length > 10) history = history.slice(0, 10);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  async reloadConfig(): Promise<any> {
    this.configCache = null;
    return this.loadConfig();
  }

  async exportConfig(): Promise<any> {
    return this.loadConfig();
  }

  async importConfig(config: any, versionInfo: VersionInfo): Promise<void> {
    return this.saveConfig(config, versionInfo);
  }
}
