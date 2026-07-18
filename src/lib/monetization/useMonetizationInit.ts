import { useState, useEffect } from 'react';
import { monetizationManager } from './MonetizationManager';

export function useMonetizationInit() {
  const [isLoaded, setIsLoaded] = useState(monetizationManager.isInitialized());

  useEffect(() => {
    if (isLoaded) return;
    
    let mounted = true;
    monetizationManager.init().then(() => {
      if (mounted) {
        setIsLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isLoaded]);

  return isLoaded;
}
