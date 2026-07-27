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

    const loadAds = async () => {
      try {
        const docRef = doc(db, 'settings', 'advertisements');
        const snap = await getDoc(docRef);
        
        if (!isMounted) return;
        
        if (snap.exists()) {
          const data = snap.data();
          injected.current = true; // Mark as fetched to avoid duplicate queries
          
          if (data.socialBarEnabled) {
            injectScript(SOCIAL_BAR_SRC);
          }
          if (data.popunderEnabled) {
            injectScript(POPUNDER_SRC);
          }
        } else {
          injected.current = true;
        }
      } catch (e) {
        // Silently ignore errors as per requirements
      }
    };

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

    loadAds();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
