import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const POPUNDER_ID = "adsterra-popunder-script";
const POPUNDER_SRC = "https://predestineheadypleasure.com/2e/24/de/2e24deaee3c8ed46777c8fd01a8bfbf8.js";

const SOCIAL_BAR_ID = "adsterra-socialbar-script";
const SOCIAL_BAR_SRC = "https://predestineheadypleasure.com/8b/2b/ef/8b2befdf84fc8def02f509b4771ad9a8.js";

function syncScript(id: string, src: string, enabled: boolean) {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(id) as HTMLScriptElement | null;

  if (enabled) {
    if (!existing) {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
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
 * Fetches runtime ad settings from /api/settings/ads (with server-side cache).
 * Survives client navigation without duplicate injection.
 */
export function ScriptManager() {
  const location = useLocation();
  const settingsRef = useRef({ popunderEnabled: false, socialBarEnabled: false });

  useEffect(() => {
    let isMounted = true;

    const fetchAdSettings = async () => {
      try {
        const res = await fetch("/api/settings/ads");
        if (res.ok && isMounted) {
          const data = await res.json();
          const popunder = Boolean(data?.popunderEnabled);
          const socialBar = Boolean(data?.socialBarEnabled);
          settingsRef.current = {
            popunderEnabled: popunder,
            socialBarEnabled: socialBar,
          };
          syncScript(POPUNDER_ID, POPUNDER_SRC, popunder);
          syncScript(SOCIAL_BAR_ID, SOCIAL_BAR_SRC, socialBar);
        }
      } catch (err) {
        console.error("ScriptManager error loading ad settings:", err);
      }
    };

    fetchAdSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure scripts survive normal React navigation without duplicate injections
  useEffect(() => {
    const { popunderEnabled, socialBarEnabled } = settingsRef.current;
    if (popunderEnabled) {
      syncScript(POPUNDER_ID, POPUNDER_SRC, true);
    }
    if (socialBarEnabled) {
      syncScript(SOCIAL_BAR_ID, SOCIAL_BAR_SRC, true);
    }
  }, [location.pathname]);

  return null;
}
