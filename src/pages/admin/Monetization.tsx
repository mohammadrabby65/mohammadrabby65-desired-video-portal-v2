import React, { useState, useEffect, useRef } from 'react';
import { SEO } from '../../components/seo/SEO';
import { Save, RefreshCw, Eye, Download, Upload, LayoutTemplate, ToggleRight, ToggleLeft, Settings2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdManagerConfig, AdConfig, AdType } from '../../lib/monetization/types';
import { PromoCard } from '../../components/admin/monetization/PromoCard';
import { useAuth } from '../../contexts/AuthContext';

const AD_TYPES: { type: AdType; title: string }[] = [
  { type: 'popunder', title: 'Popunder' },
  { type: 'socialBar', title: 'Social Bar' },
  { type: 'banner', title: 'Banner Ads' },
  { type: 'native', title: 'Native Ads' },
  { type: 'sticky', title: 'Sticky Ads' },
  { type: 'telegramWelcome', title: 'Telegram Welcome Card' },
  { type: 'videoClickRedirect', title: 'Player Click Redirect' },
  { type: 'floatingButton', title: 'Floating Button' },
  { type: 'announcementBar', title: 'Announcement Bar' },
  { type: 'customHtml', title: 'Custom HTML / JS' },
];

export function Monetization() {
  const { user } = useAuth();
  const [config, setConfig] = useState<AdManagerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastReload, setLastReload] = useState<Date | null>(null);
  const [versionMetadata, setVersionMetadata] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/monetization/config?t=' + Date.now());
      if (!response.ok) {
        // fallback
        const fallback = await fetch('/monetization-config.json?t=' + Date.now());
        if (!fallback.ok) throw new Error(`Failed to load: ${response.statusText}`);
        const data = await fallback.json();
        setConfig(data);
      } else {
        const data = await response.json();
        setConfig(data);
      }
      setLastReload(new Date());
    } catch (e: any) {
      console.error('Error loading ads config:', e);
      setError(e.message || 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const getAdConfig = (type: AdType): AdConfig | undefined => {
    return config?.ads.find(ad => ad.type === type);
  };

  const handleExport = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monetization-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Basic frontend validation before replacing state
        if (typeof parsed.globalEnabled !== 'boolean' || !Array.isArray(parsed.ads)) {
          throw new Error('Invalid configuration format');
        }

        setConfig(parsed);
        setSuccess('Configuration imported successfully. Review changes and click Save to persist.');
        setError(null);
      } catch (err: any) {
        setError('Import failed: ' + (err.message || 'Invalid JSON file'));
        setSuccess(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!config || !user) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/monetization/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess(`Configuration saved successfully! (Version ${data.metadata.version})`);
      setVersionMetadata(data.metadata);
      setLastReload(new Date());
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGlobal = () => {
    if (config) {
      setConfig({ ...config, globalEnabled: !config.globalEnabled });
    }
  };

  const enabledCount = config?.ads.filter(a => a.enabled).length || 0;
  const disabledCount = AD_TYPES.length - enabledCount;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      <SEO title="Monetization - DesiredHub" description="Ad Management Dashboard" noIndex={true} />
      
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Monetization</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Configure and manage all advertisements across the platform.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={loadConfig}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all shadow-sm text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          
          <button 
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all shadow-sm text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all shadow-sm text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || !config}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors text-sm font-medium shadow-sm ${
              isSaving || !config 
                ? 'bg-red-50 dark:bg-red-500/10 text-red-300 border border-red-200 dark:border-red-500/20 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white border border-red-600'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h4 className="font-medium">Configuration Error</h4>
            <p className="text-sm mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-medium">Success</h4>
            <p className="text-sm mt-0.5 opacity-90">{success}</p>
          </div>
        </div>
      )}

      {/* Dashboard Summary Section */}
      {!isLoading && !error && config && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 mb-3">
              <LayoutTemplate className="w-5 h-5" />
              <h3 className="font-medium text-sm">Total Ad Slots</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{AD_TYPES.length}</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-500 dark:text-emerald-400 mb-3">
              <ToggleRight className="w-5 h-5" />
              <h3 className="font-medium text-sm">Enabled Ads</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{enabledCount}</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-neutral-400 dark:text-neutral-500 mb-3">
              <ToggleLeft className="w-5 h-5" />
              <h3 className="font-medium text-sm">Disabled Ads</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{disabledCount}</p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-blue-500 dark:text-blue-400 mb-3">
              <Settings2 className="w-5 h-5" />
              <h3 className="font-medium text-sm">Global Config</h3>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center cursor-pointer" onClick={toggleGlobal}>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={config?.globalEnabled || false} readOnly />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${config?.globalEnabled ? 'bg-red-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}></div>
                  <div className={`dot absolute left-[2px] top-[2px] bg-white w-6 h-6 rounded-full transition-transform ${config?.globalEnabled ? 'transform translate-x-5' : ''} shadow-sm`}></div>
                </div>
              </label>
              <span className={`font-semibold ${config?.globalEnabled ? 'text-red-500' : 'text-neutral-500'}`}>
                {config?.globalEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 text-orange-500 dark:text-orange-400 mb-3">
              <Clock className="w-5 h-5" />
              <h3 className="font-medium text-sm">Last Reload</h3>
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
              {lastReload ? lastReload.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
            </p>
            {versionMetadata && (
              <p className="text-xs text-neutral-500 mt-1">v{versionMetadata.version} by {versionMetadata.updatedBy}</p>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-500 font-medium">Loading configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {AD_TYPES.map(({ type, title }) => (
            <div key={type}>
              <PromoCard 
                type={type} 
                title={title} 
                adConfig={getAdConfig(type)} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
