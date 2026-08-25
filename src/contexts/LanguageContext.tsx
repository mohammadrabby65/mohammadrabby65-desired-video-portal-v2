import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Language = 'en' | 'bn' | 'hi' | 'ar';

interface LanguageContextType {
  language: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  t: (key) => key,
  setLanguage: () => {},
  dir: 'ltr',
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    // Detect language from subdomain
    const hostname = window.location.hostname;
    let detectedLang: Language = 'en';
    if (hostname.startsWith('bd.')) detectedLang = 'bn';
    else if (hostname.startsWith('hi.')) detectedLang = 'hi';
    else if (hostname.startsWith('ar.')) detectedLang = 'ar';
    
    setLanguageState(detectedLang);
    
    // Set document direction for RTL support
    document.documentElement.dir = detectedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = detectedLang;
  }, []);

  useEffect(() => {
    // Fetch translations
    if (language === 'en') {
      setTranslations({});
      return;
    }
    
    fetch(`/locales/${language}.json`)
      .then(res => res.json())
      .then(data => setTranslations(data))
      .catch(err => console.error('Failed to load translations:', err));
  }, [language]);

  const t = useMemo(() => (key: string) => {
    if (language === 'en' || !translations[key]) return key;
    return translations[key] || key;
  }, [language, translations]);

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    
    // Get base domain (handle localhost or desiredhub.xyz)
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.run.app');
    
    let baseDomain = hostname;
    if (hostname.startsWith('bd.') || hostname.startsWith('hi.') || hostname.startsWith('ar.') || hostname.startsWith('www.')) {
       baseDomain = hostname.substring(hostname.indexOf('.') + 1);
    }
    
    let newHostname = baseDomain;
    
    if (lang === 'bn') newHostname = `bd.${baseDomain}`;
    else if (lang === 'hi') newHostname = `hi.${baseDomain}`;
    else if (lang === 'ar') newHostname = `ar.${baseDomain}`;
    else newHostname = `www.${baseDomain}`; // English default

    // On local dev without subdomains setup, just set state
    if (isLocalhost) {
       setLanguageState(lang);
       document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
       document.documentElement.lang = lang;
       return;
    }

    const newUrl = `${window.location.protocol}//${newHostname}${window.location.port ? ':' + window.location.port : ''}${window.location.pathname}${window.location.search}`;
    window.location.href = newUrl;
  };

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
};
