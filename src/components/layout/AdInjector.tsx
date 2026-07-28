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
        let statePushed = false;
        let isNavigatingBack = false;

        const pushDummyState = () => {
          if (statePushed) return;
          if (window.history.state && window.history.state.hijacked === 'dummy') {
            statePushed = true;
            return;
          }
          window.history.pushState({ hijacked: 'dummy' }, '', window.location.href);
          statePushed = true;
        };

        // Attach to user interactions to bypass browser security policies
        document.addEventListener('click', pushDummyState, { once: true });
        document.addEventListener('touchstart', pushDummyState, { once: true });

        const handlePopstate = (e: PopStateEvent) => {
          // If we triggered history.back() programmatically to skip the ad, ignore this event
          if (isNavigatingBack) return;

          // Ignore if we are just backing into the dummy state from a deeper SPA page
          if (e.state && e.state.hijacked === 'dummy') {
             return;
          }

          // We are going back PAST the dummy state, meaning they are trying to leave.
          // Trigger the smart link intermittently (e.g., 30% of the time).
          if (Math.random() < 0.3) {
            // Restore the dummy state so the trap is active if they come back
            window.history.pushState({ hijacked: 'dummy' }, '', window.location.href);
            window.location.assign(SMART_LINK);
          } else {
            // Skip the ad. Because the dummy state consumed their back action, 
            // we must fire back() again to let them actually leave/navigate.
            isNavigatingBack = true;
            window.history.back();
            
            // Re-arm the trap on next interaction if they are still on the domain
            setTimeout(() => {
              isNavigatingBack = false;
              statePushed = false;
              document.addEventListener('click', pushDummyState, { once: true });
              document.addEventListener('touchstart', pushDummyState, { once: true });
            }, 1000);
          }
        };

        window.addEventListener('popstate', handlePopstate);
        return () => {
          document.removeEventListener('click', pushDummyState);
          document.removeEventListener('touchstart', pushDummyState);
          window.removeEventListener('popstate', handlePopstate);
        };
      } catch (err) {
        return undefined;
      }
    };

    loadAds();

    return () => {
      isMounted = false;
      if (cleanupHijack) cleanupHijack();
    };
  }, []);

  return null;
}
