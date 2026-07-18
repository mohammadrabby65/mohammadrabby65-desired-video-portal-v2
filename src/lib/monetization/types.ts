export type AdType =
  | 'popunder'
  | 'socialBar'
  | 'banner'
  | 'native'
  | 'sticky'
  | 'telegramWelcome'
  | 'videoClickRedirect'
  | 'floatingButton'
  | 'announcementBar'
  | 'customHtml';

export interface AdFrequency {
  maxImpressions: number;
  timeframeSeconds: number;
}

export interface AdTrigger {
  type: 'load' | 'click' | 'scroll' | 'exitIntent' | 'firstVisit';
  value?: string | number; // e.g., scroll percentage
}

export interface AdConfig {
  id: string;
  type: AdType;
  enabled: boolean;
  priority: number;
  desktop: boolean;
  mobile: boolean;
  countries?: string[]; // ISO country codes, empty means all
  frequency?: AdFrequency;
  trigger?: AdTrigger;
  delay?: number; // Delay in milliseconds
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  url?: string;
  customScript?: string;
  customHTML?: string;
  options?: Record<string, any>; // Extensible options for specific ad types
}

export interface AdManagerConfig {
  globalEnabled: boolean;
  ads: AdConfig[];
}
