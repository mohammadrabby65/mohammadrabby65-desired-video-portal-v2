import React, { useState } from 'react';
import { AdConfig, AdType } from '../../../lib/monetization/types';
import { 
  AppWindow, 
  Share2, 
  Image as ImageIcon, 
  LayoutList, 
  Pin, 
  Send, 
  MousePointerClick, 
  PlusCircle, 
  Megaphone, 
  Code,
  ChevronDown,
  Monitor,
  Smartphone,
  Activity,
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface PromoCardProps {
  title: string;
  type: AdType;
  adConfig?: AdConfig;
}

const DEFAULT_CONFIG: AdConfig = {
  id: '',
  type: 'banner',
  enabled: false,
  priority: 0,
  desktop: true,
  mobile: true,
};

const AD_ICONS: Record<AdType, { icon: React.ElementType, color: string, bg: string }> = {
  popunder: { icon: AppWindow, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  socialBar: { icon: Share2, color: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  banner: { icon: ImageIcon, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  native: { icon: LayoutList, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  sticky: { icon: Pin, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  telegramWelcome: { icon: Send, color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-500/10' },
  videoClickRedirect: { icon: MousePointerClick, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  floatingButton: { icon: PlusCircle, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  announcementBar: { icon: Megaphone, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  customHtml: { icon: Code, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10' },
};

export function PromoCard({ title, type, adConfig }: PromoCardProps) {
  const config = adConfig || { ...DEFAULT_CONFIG, type, id: type };
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { icon: Icon, color, bg } = AD_ICONS[type] || AD_ICONS.banner;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col group">
      {/* Header (Always Visible) */}
      <div 
        className="p-5 cursor-pointer select-none flex flex-col gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded); }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base leading-tight group-hover:text-red-500 transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${config.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                  {config.enabled ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {type}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label 
              className="flex items-center cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.enabled} readOnly />
                <div className={`block w-10 h-5 rounded-full transition-colors ${config.enabled ? 'bg-red-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}></div>
                <div className={`dot absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform ${config.enabled ? 'transform translate-x-5' : ''} shadow-sm`}></div>
              </div>
            </label>
            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Quick Stats Row (Visible when collapsed) */}
        <div className={`flex items-center gap-4 px-1 transition-all duration-300 origin-top ${isExpanded ? 'opacity-0 h-0 hidden' : 'opacity-100 h-auto mt-2'}`}>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400" title="Priority">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-medium">P{config.priority || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400" title="Trigger">
            <Zap className="w-3.5 h-3.5" />
            <span className="capitalize">{config.trigger?.type || 'Load'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 ml-auto">
            {config.desktop && <Monitor className="w-3.5 h-3.5" title="Desktop Enabled" />}
            {config.mobile && <Smartphone className="w-3.5 h-3.5" title="Mobile Enabled" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div 
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-5 bg-neutral-50/50 dark:bg-neutral-900/50">
            {/* Device Targeting */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Targeting</label>
              <div className="flex gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-red-500 focus:ring-red-500 dark:bg-neutral-800" checked={config.desktop} readOnly />
                  <Monitor className="w-4 h-4 text-neutral-400" />
                  Desktop
                </label>
                <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800"></div>
                <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-red-500 focus:ring-red-500 dark:bg-neutral-800" checked={config.mobile} readOnly />
                  <Smartphone className="w-4 h-4 text-neutral-400" />
                  Mobile
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Priority (Higher = First)</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input type="number" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.priority} readOnly />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Delay (ms)</label>
                <input type="number" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.delay || ''} placeholder="0" readOnly />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Trigger Event</label>
              <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <select className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-10 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none shadow-sm cursor-pointer" value={config.trigger?.type || 'load'} readOnly>
                  <option value="load">On Page Load</option>
                  <option value="click">On First Click</option>
                  <option value="scroll">On Scroll Depth</option>
                  <option value="exitIntent">On Exit Intent</option>
                  <option value="firstVisit">On First Visit</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Max Impressions</label>
                <input type="number" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.frequency?.maxImpressions || ''} placeholder="Unlimited" readOnly />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Timeframe (Sec)</label>
                <input type="number" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.frequency?.timeframeSeconds || ''} placeholder="0" readOnly />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Countries (ISO Codes)</label>
              <input type="text" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600" value={config.countries?.join(', ') || ''} placeholder="e.g. US, UK, IN (empty for all)" readOnly />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Start Date</label>
                <input type="datetime-local" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.startDate || ''} readOnly />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">End Date</label>
                <input type="datetime-local" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={config.endDate || ''} readOnly />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Action URL</label>
              <input type="url" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-600" value={config.url || ''} placeholder="https://" readOnly />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Custom HTML</label>
              <textarea className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm h-24 resize-y placeholder:text-neutral-400 dark:placeholder:text-neutral-600" value={config.customHTML || ''} placeholder="<div>...</div>" readOnly />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Custom Script</label>
              <textarea className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm h-24 resize-y placeholder:text-neutral-400 dark:placeholder:text-neutral-600" value={config.customScript || ''} placeholder="<script>...</script>" readOnly />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

