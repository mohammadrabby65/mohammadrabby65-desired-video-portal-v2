import fs from 'fs';
import path from 'path';
import { StorageAdapter, VersionInfo } from './types';

function debugLog(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  console.log(msg);
  fs.appendFileSync(path.join(process.cwd(), 'monetization-debug.log'), new Date().toISOString() + ' ' + msg + '\n');
}

async function upstashRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${url}/${cleanEndpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!res.ok) {
    throw new Error(`Upstash request failed: ${res.statusText}`);
  }
  
  return await res.json();
}

export class UpstashAdapter implements StorageAdapter {
  private configCache: { data: any, timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 60 * 1000;

  async loadConfig(): Promise<any> {
    if (this.configCache && (Date.now() - this.configCache.timestamp < this.CACHE_TTL_MS)) {
      debugLog('[Upstash Redis] CACHE HIT: Returning config from memory cache');
      return this.configCache.data;
    }

    try {
      debugLog(`[Upstash Redis] CACHE MISS: Fetching from Upstash REST API...`);
      const response = await upstashRequest('get/monetization-config');
      if (response.result) {
        let data = response.result;
        while (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            break; // Not JSON or already parsed
          }
        }
        this.configCache = { data, timestamp: Date.now() };
        debugLog('[Upstash Redis] SUCCESS: Configuration loaded and cached.');
        return data;
      }
    } catch (e) {
      debugLog('[Upstash Redis] ERROR: Failed to get from Upstash:', e);
    }
    return null;
  }

  async saveConfig(config: any, versionInfo: VersionInfo): Promise<void> {
    const dataToSave = { config, _metadata: versionInfo };
    
    // Update cache immediately
    this.configCache = { data: dataToSave, timestamp: Date.now() };
    debugLog('[Upstash Redis] Cache invalidated/updated immediately on save.');

    try {
      debugLog('[Upstash Redis] Saving config to Upstash REST API...');
      await upstashRequest('set/monetization-config', 'POST', dataToSave);
      
      await upstashRequest(`lpush/monetization-history`, 'POST', dataToSave);
      await upstashRequest(`ltrim/monetization-history/0/9`, 'POST');
      debugLog('[Upstash Redis] SUCCESS: Configuration saved to Upstash.');
    } catch (e) {
      debugLog('[Upstash Redis] ERROR: Failed to save to Upstash:', e);
      throw e;
    }
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
