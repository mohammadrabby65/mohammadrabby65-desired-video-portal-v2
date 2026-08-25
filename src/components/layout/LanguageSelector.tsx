import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '../../contexts/LanguageContext';

const languages = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'bn', label: 'BN', flag: '🇧🇩' },
  { code: 'hi', label: 'HI', flag: '🇮🇳' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
] as const;

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-primary/50 transition-colors duration-300 text-[11px] sm:text-base group whitespace-nowrap"
        aria-label="Select language"
      >
        <Globe className="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 group-hover:text-primary transition-colors" />
        <span className="font-medium text-neutral-200 tracking-tight whitespace-nowrap">{currentLang.flag} {currentLang.label}</span>
        <ChevronDown className={`w-2.5 h-2.5 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 sm:w-40 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm sm:text-base text-left hover:bg-neutral-800 transition-colors ${
                  language === lang.code ? 'text-primary font-medium bg-neutral-800/50' : 'text-neutral-300'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
