import { useEffect, useRef, useState, memo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

let cachedSettingsPromise: Promise<any> | null = null;
const getAdSettings = () => {
  if (!cachedSettingsPromise) {
    cachedSettingsPromise = getDoc(doc(db, 'settings', 'advertisements'))
      .then(snap => snap.exists() ? snap.data() : null)
      .catch(() => null);
  }
  return cachedSettingsPromise;
};

export const AdsterraNativeBanner = memo(function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAdSettings().then(settings => {
      if (isMounted) {
        setIsEnabled(settings?.nativeBannerEnabled === true);
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isEnabled !== true) return;
    if (!containerRef.current || initialized.current) return;
    
    // Prevent duplicate injection during strict mode or re-renders
    initialized.current = true;
    
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://predestineheadypleasure.com/6f198c1242ec9b64cc7ae9a88d475083/invoke.js';
    
    containerRef.current.appendChild(script);
  }, [isEnabled]);

  if (isEnabled === false) return null; // Don't render banner box if disabled

  return (
    <div className="w-full col-span-full flex justify-center items-center my-4 overflow-hidden min-h-[100px] bg-neutral-900/40 rounded-2xl border border-neutral-800/50">
      <div id="container-6f198c1242ec9b64cc7ae9a88d475083" ref={containerRef}></div>
    </div>
  );
});
