import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

const SOCIAL_BAR_SRC =
  "https://pl30417136.effectivecpmnetwork.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js";

const POPUNDER_SRC =
  "https://predestineheadypleasure.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js";

export function ScriptManager() {
  const location = useLocation();
  const injectedPath = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname === "/") {
      // Ensure Social Bar and Popunder scripts are removed when on homepage
      const existingSocial = document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`);
      if (existingSocial) {
        existingSocial.remove();
      }
      const existingPopunder = document.querySelector(`script[src="${POPUNDER_SRC}"]`);
      if (existingPopunder) {
        existingPopunder.remove();
      }
      injectedPath.current = null;
      return;
    }

    if (injectedPath.current === location.pathname) return;

    let isMounted = true;

    const loadAds = async () => {
      try {
        const docRef = doc(db, "settings", "advertisements");
        const snap = await getDoc(docRef);

        if (!isMounted) return;

        if (snap.exists()) {
          const data = snap.data();
          injectedPath.current = location.pathname;

          if (data.socialBarEnabled) {
            injectScript(SOCIAL_BAR_SRC);
          }
          if (data.popunderEnabled) {
            injectScript(POPUNDER_SRC);
          }
        } else {
          injectedPath.current = location.pathname;
        }
      } catch (e) {
        // Silently ignore errors as per requirements
      }
    };

    const injectScript = (src: string) => {
      // Prevent duplicate injection
      if (document.querySelector(`script[src="${src}"]`)) return;

      const script = document.createElement("script");
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
  }, [location.pathname]);

  return null;
}
