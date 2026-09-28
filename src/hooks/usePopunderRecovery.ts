import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function usePopunderRecovery() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Only process primary, unmodified clicks
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement;
      // Find the closest anchor tag (this handles clicks on inner elements like images)
      const link = target.closest("a");

      if (link) {
        const href = link.getAttribute("href");

        // Target specifically our video links
        if (href && href.startsWith("/video/")) {
          // If a popunder script (like Adsterra) intercepts the click via a global listener
          // and calls e.stopPropagation() or e.preventDefault(), React Router will never see
          // the event, and the user will be left stranded on the current page while the ad opens.
          // We schedule a forced navigation shortly after the click to guarantee the user ends up
          // on their intended video.
          setTimeout(() => {
            if (window.location.pathname !== href) {
              navigate(href);
            }
          }, 150);
        }
      }
    };

    // We must use the capturing phase (true) on the window object.
    // This ensures our listener runs BEFORE or ALONGSIDE the popunder's listener,
    // and BEFORE any stopPropagation() can kill the event path before it reaches React's root.
    window.addEventListener("click", handleGlobalClick, true);

    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
    };
  }, [navigate]);
}
