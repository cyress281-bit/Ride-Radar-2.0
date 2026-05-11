/**
 * Hook for PWA installation prompt.
 */

import { useState, useEffect } from 'react';
import { isInstallable, isInstalledPWA, promptInstall } from '@/lib/registerSW';

export function usePWAInstall() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(isInstalledPWA());

  useEffect(() => {
    setInstallable(isInstallable());

    function handleInstallable() {
      setInstallable(true);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallable(false);
    }

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handlePromptInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setInstallable(false);
      setInstalled(true);
    }
    return accepted;
  };

  return {
    isInstallable: installable,
    isInstalled: installed,
    promptInstall: handlePromptInstall,
  };
}
