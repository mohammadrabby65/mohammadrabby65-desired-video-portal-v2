import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

const SOCIAL_BAR_SRC =
  "https://pl30417136.effectivecpmnetwork.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js";
const POPUNDER_SRC =
  "https://predestineheadypleasure.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js";

export function ScriptManager() {
  useEffect(() => {
    const injectScript = (src: string) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (!existing) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
    };

    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "advertisements");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.socialBarEnabled) {
            injectScript(SOCIAL_BAR_SRC);
          } else {
            const existingSocial = document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`);
            if (existingSocial) existingSocial.remove();
          }

          if (data.popunderEnabled) {
            injectScript(POPUNDER_SRC);
          } else {
            const existingPopunder = document.querySelector(`script[src="${POPUNDER_SRC}"]`);
            if (existingPopunder) existingPopunder.remove();
          }
        }
      } catch (err) {
        console.error("Error loading ad settings:", err);
      }
    };

    loadSettings();
  }, []);

  return null;
}
