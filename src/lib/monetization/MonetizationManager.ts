import { AdManagerConfig, AdConfig, AdType } from './types';

class MonetizationManager {
  private config: AdManagerConfig | null = null;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const response = await fetch('/api/monetization/config?t=' + Date.now());
      if (response.ok) {
        this.config = await response.json();
      } else {
        // Fallback to local public config if API fails
        const fallbackResponse = await fetch('/monetization-config.json?t=' + Date.now());
        if (fallbackResponse.ok) {
          this.config = await fallbackResponse.json();
        }
      }
    } catch (e) {
      console.error('Failed to load monetization config', e);
    }
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAdsByType(type: AdType): AdConfig[] {
    if (!this.config || !this.config.globalEnabled) return [];
    return this.config.ads
      .filter((ad) => ad.type === type && ad.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}

export const monetizationManager = new MonetizationManager();
