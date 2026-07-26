import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function usePopunderRecovery() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If we actually land on a video page, clear the intent
    if (location.pathname.startsWith('/video/')) {
      sessionStorage.removeItem('intendedVideo');
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleRecovery = () => {
      // Don't recover if we're already on a video page
      if (window.location.pathname.startsWith('/video/')) return;
      
      const intendedVideo = sessionStorage.getItem('intendedVideo');
      if (intendedVideo) {
        sessionStorage.removeItem('intendedVideo');
        navigate(intendedVideo);
      }
    };

    // Check immediately on mount (for back button navigation)
    handleRecovery();

    // Check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRecovery();
      }
    };
    
    // Also check on pageshow for bfcache restores
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        handleRecovery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [navigate]);
}
