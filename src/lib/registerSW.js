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
      // Force-unregister any old service workers from previous builds
      // This ensures the new Velocity redesign loads immediately
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing && existing.scope) {
        const swUrl = existing.active?.scriptURL || existing.installing?.scriptURL || existing.waiting?.scriptURL;
        // If the SW URL doesn't contain our version marker, unregister it
        if (swUrl && !swUrl.includes('v=velocity')) {
          await existing.unregister();
          // Clear all caches to ensure no stale assets
          if ('caches' in window) {
            const allCaches = await caches.keys();
            await Promise.all(allCaches.map((name) => caches.delete(name)));
          }
          // Reload once to load fresh without any old SW interference
          if (!window.location.hash.includes('sw-fresh')) {
            window.location.hash = 'sw-fresh';
            window.location.reload();
            return;
          }
        }
      }

      // Only clear stale caches from previous app versions
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const stalePrefixes = ['radar-map-tile-cache', 'supabase-storage-cache'];
        await Promise.all(
          cacheNames
            .filter((name) => stalePrefixes.some((p) => name.includes(p)))
            .map((name) => caches.delete(name))
        );
      }

      registration = await navigator.serviceWorker.register('/sw.js?v=velocity', {
        scope: '/',
      });

      // Check for updates every hour
      const updateInterval = setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Cleanup interval when page unloads to avoid leaked timers in tests/long sessions
      window.addEventListener('beforeunload', () => {
        clearInterval(updateInterval);
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Reload when new service worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        // Rate-limit: don't reload more than once per 10 seconds
        const lastReload = sessionStorage.getItem('sw-last-reload');
        const now = Date.now();
        if (lastReload && now - parseInt(lastReload, 10) < 10000) {
          return;
        }
        sessionStorage.setItem('sw-last-reload', String(now));
        refreshing = true;
        window.location.reload();
      });

    } catch (error) {
      // Service Worker registration failed — logged silently
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
    // Dispatch custom event so UI can show install button
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  // Track successful installation
  window.addEventListener('appinstalled', () => {
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

    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    // Install prompt error — logged silently
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
