import { StorageAdapter } from './types';
import { UpstashAdapter } from './UpstashAdapter';
import { LocalFileAdapter } from './LocalFileAdapter';

export * from './types';

let currentAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (currentAdapter) return currentAdapter;
  
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    currentAdapter = new UpstashAdapter();
  } else {
    currentAdapter = new LocalFileAdapter();
  }
  
  return currentAdapter;
}
