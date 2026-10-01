import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

const POPUNDER_SRC = "https://predestineheadypleasure.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js";
const SOCIAL_BAR_SRC = "https://predestineheadypleasure.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js";

const POPUNDER_ID = "adsterra-popunder-script";
const SOCIAL_BAR_ID = "adsterra-socialbar-script";

/**
 * Centrally manages Adsterra official ad units (Popunder & Social Bar).
 * - Governed entirely by Firestore configuration (settings/advertisements)
 * - Guarantees strict singleton injection (at most one instance per script)
 * - Prevents duplicate script injection during React re-renders or route changes
 * - Removes scripts when disabled via emergency kill switch
 */
export function ScriptManager() {
  useEffect(() => {
    let isMounted = true;

    // Listen to realtime changes from Firestore advertisements settings document
    const docRef = doc(db, "settings", "advertisements");
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (!isMounted) return;

        const data = docSnap.exists()
          ? (docSnap.data() as { popunderEnabled?: boolean; socialBarEnabled?: boolean })
          : { popunderEnabled: true, socialBarEnabled: true };

        const isPopunderActive = Boolean(data.popunderEnabled);
        const isSocialBarActive = Boolean(data.socialBarEnabled);

        // 1. Manage Popunder Script
        const existingPopunder =
          document.getElementById(POPUNDER_ID) ||
          document.querySelector(`script[src="${POPUNDER_SRC}"]`);

        if (isPopunderActive) {
          if (!existingPopunder) {
            const script = document.createElement("script");
            script.id = POPUNDER_ID;
            script.src = POPUNDER_SRC;
            script.async = true;
            document.head.appendChild(script);
          }
        } else if (existingPopunder) {
          existingPopunder.remove();
        }

        // 2. Manage Social Bar Script
        const existingSocialBar =
          document.getElementById(SOCIAL_BAR_ID) ||
          document.querySelector(`script[src="${SOCIAL_BAR_SRC}"]`);

        if (isSocialBarActive) {
          if (!existingSocialBar) {
            const script = document.createElement("script");
            script.id = SOCIAL_BAR_ID;
            script.src = SOCIAL_BAR_SRC;
            script.async = true;
            document.head.appendChild(script);
          }
        } else if (existingSocialBar) {
          existingSocialBar.remove();
        }
      },
      (error) => {
        console.error("Ad configuration error:", error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return null;
}
