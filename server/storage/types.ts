export interface VersionInfo {
  version: number;
  lastUpdated: string;
  updatedBy: string;
  configHash: string;
}

export interface StorageAdapter {
  loadConfig(): Promise<any>;
  saveConfig(config: any, versionInfo: VersionInfo): Promise<void>;
  reloadConfig(): Promise<any>;
  exportConfig(): Promise<any>;
  importConfig(config: any, versionInfo: VersionInfo): Promise<void>;
}
