import { useEffect } from "react";

/**
 * ScriptManager
 * 
 * CLEAN TESTING PHASE:
 * Adsterra Social Bar and Popunder scripts are completely disabled across all routes.
 * No third-party ad scripts are loaded or injected.
 * A safe first-party cleanup removes any legacy injected third-party elements from document.body.
 */

// Legacy ad script URLs kept for cleanup targeting only
const LEGACY_SOCIAL_BAR_SRC =
  "https://pl30417136.effectivecpmnetwork.com/a8/c5/ae/a8c5ae6b95183bffe51c005c71b9acfd.js";
const LEGACY_POPUNDER_SRC =
  "https://predestineheadypleasure.com/46/fb/02/46fb02b7663603a5ec0e75ce574d43f4.js";

export function ScriptManager() {
  useEffect(() => {
    // 1. Remove any legacy script elements if present from a previous execution
    const existingSocial = document.querySelector(`script[src="${LEGACY_SOCIAL_BAR_SRC}"]`);
    if (existingSocial) {
      existingSocial.remove();
    }
    const existingPopunder = document.querySelector(`script[src="${LEGACY_POPUNDER_SRC}"]`);
    if (existingPopunder) {
      existingPopunder.remove();
    }

    // 2. Safe cleanup of legacy floating third-party overlays (e.g., Social Bar / fake messages)
    try {
      const suspiciousContainers = document.querySelectorAll(
        'div[style*="z-index: 2147483647"], div[style*="z-index: 999999"], iframe[src*="effectivecpmnetwork"], iframe[src*="predestineheadypleasure"]'
      );
      suspiciousContainers.forEach((el) => {
        // Confirm it is not our first-party AgeGate before removing
        if (!el.getAttribute("role") && !el.closest('[role="dialog"]')) {
          el.remove();
        }
      });
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  return null;
}
