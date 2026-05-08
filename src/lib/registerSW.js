/**
 * Service Worker Registration for Ride Radar PWA
 *
 * This module handles:
 * - Service worker registration and lifecycle
 * - Update notifications
 * - Installation prompting
 */

let deferredPrompt = null;
let registration = null;

/**
 * Register the service worker (called from main.jsx)
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered:', registration.scope);

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Reload when new service worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[PWA] Service Worker updated');
        window.location.reload();
      });

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
}

/**
 * Capture the install prompt event
 */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured');

    // Dispatch custom event so UI can show install button
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  // Track successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    localStorage.setItem('pwa-installed', 'true');
    localStorage.setItem('pwa-install-date', new Date().toISOString());
  });
}

/**
 * Show the install prompt
 * @returns {Promise<boolean>} true if user accepted install
 */
export async function promptInstall() {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`[PWA] Install prompt ${outcome}`);
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt error:', error);
    return false;
  }
}

/**
 * Check if app is installable
 */
export function isInstallable() {
  return !!deferredPrompt;
}

/**
 * Check if app is running as installed PWA
 */
export function isInstalledPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         localStorage.getItem('pwa-installed') === 'true';
}

export default {
  registerServiceWorker,
  setupInstallPrompt,
  promptInstall,
  isInstallable,
  isInstalledPWA,
};
