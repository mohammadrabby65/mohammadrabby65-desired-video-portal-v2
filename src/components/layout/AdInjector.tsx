import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const SOCIAL_BAR_SRC = 'https://pl30417136.effectivecpmnetwork.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js';
const POPUNDER_SRC = 'https://pl30417108.effectivecpmnetwork.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js';

export function AdInjector() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    
    let isMounted = true;
    let fallbackTimer: NodeJS.Timeout;

    const injectScript = (src: string) => {
      // Prevent duplicate injection
      if (document.querySelector(`script[src="${src}"]`)) return;

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onerror = () => {
        // Silently handle load failure so website continues normally
      };
      document.body.appendChild(script);
    };

    const triggerAds = (social: boolean, popunder: boolean) => {
      if (injected.current) return;
      injected.current = true;
      if (social) injectScript(SOCIAL_BAR_SRC);
      if (popunder) injectScript(POPUNDER_SRC);
    };

    // Safe fallback: if Firestore doesn't respond within 1500ms, fallback to ensuring ads are active
    fallbackTimer = setTimeout(() => {
      if (!injected.current && isMounted) {
        triggerAds(true, true);
      }
    }, 1500);

    const loadAds = async () => {
      try {
        const docRef = doc(db, 'settings', 'advertisements');
        const snapPromise = getDoc(docRef);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200));
        
        const snap = await Promise.race([snapPromise, timeoutPromise]) as any;
        
        if (!isMounted) return;
        clearTimeout(fallbackTimer);
        
        if (snap && snap.exists()) {
          const data = snap.data();
          triggerAds(data.socialBarEnabled ?? true, data.popunderEnabled ?? true);
        } else {
          triggerAds(true, true);
        }
      } catch (e) {
        if (!injected.current && isMounted) {
          clearTimeout(fallbackTimer);
          triggerAds(true, true);
        }
      }
    };

    loadAds();

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
