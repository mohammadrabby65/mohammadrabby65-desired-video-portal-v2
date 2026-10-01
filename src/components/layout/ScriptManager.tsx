import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

const POPUNDER_ID = "adsterra-popunder-script";
const POPUNDER_SRC = "https://predestineheadypleasure.com/2e/24/de/2e24deaee3c8ed46777c8fd01a8bfbf8.js";

const SOCIAL_BAR_ID = "adsterra-socialbar-script";
const SOCIAL_BAR_SRC = "https://predestineheadypleasure.com/06/3d/17/063d1781b009b29552518c216e2b364c.js";

function syncScript(id: string, src: string, enabled: boolean) {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(id) as HTMLScriptElement | null;

  if (enabled) {
    if (!existing) {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  } else {
    if (existing) {
      existing.remove();
    }
  }
}

/**
 * ScriptManager
 * Centralized runtime implementation for Adsterra Popunder and Social Bar.
 * Firestore toggles: settings/advertisements -> popunderEnabled, socialBarEnabled
 * No-cloaking: identical behavior for all visitors.
 */
export function ScriptManager() {
  const location = useLocation();
  const settingsRef = useRef({ popunderEnabled: false, socialBarEnabled: false });

  useEffect(() => {
    const docRef = doc(db, "settings", "advertisements");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const popunder = Boolean(data?.popunderEnabled);
          const socialBar = Boolean(data?.socialBarEnabled);
          settingsRef.current = {
            popunderEnabled: popunder,
            socialBarEnabled: socialBar,
          };
          syncScript(POPUNDER_ID, POPUNDER_SRC, popunder);
          syncScript(SOCIAL_BAR_ID, SOCIAL_BAR_SRC, socialBar);
        } else {
          settingsRef.current = {
            popunderEnabled: false,
            socialBarEnabled: false,
          };
          syncScript(POPUNDER_ID, POPUNDER_SRC, false);
          syncScript(SOCIAL_BAR_ID, SOCIAL_BAR_SRC, false);
        }
      },
      (err) => {
        console.error("ScriptManager error listening to ad settings:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Ensure scripts stay properly synchronized on route changes without duplicate injections
  useEffect(() => {
    const { popunderEnabled, socialBarEnabled } = settingsRef.current;
    syncScript(POPUNDER_ID, POPUNDER_SRC, popunderEnabled);
    syncScript(SOCIAL_BAR_ID, SOCIAL_BAR_SRC, socialBarEnabled);
  }, [location.pathname]);

  return null;
}
