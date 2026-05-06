/**
 * Hook to detect online/offline status
 *
 * Usage:
 * const isOnline = useOnlineStatus();
 */

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      console.log('[Network] Back online');
      setIsOnline(true);
    }

    function handleOffline() {
      console.log('[Network] Went offline');
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
