/**
 * Service Worker Registration for Ride Radar PWA
 *
 * This module handles:
 * - Service worker registration and lifecycle
 * - Update notifications
 * - Installation prompting
 * - Push notification setup (infrastructure only)
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

/**
 * Request push notification permissions
 * @param {string} userId - User ID to associate with push token
 */
export async function requestPushPermission(userId) {
  if (!('Notification' in window)) {
    console.log('[PWA] Push notifications not supported');
    return null;
  }

  if (Notification.permission === 'granted') {
    return await subscribeToPush(userId);
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      return await subscribeToPush(userId);
    }
  }

  return null;
}

/**
 * Subscribe to push notifications
 * @private
 */
async function subscribeToPush(userId) {
  try {
    if (!registration) {
      console.error('[PWA] Service worker not registered');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // TODO: Replace with your VAPID public key from Supabase Edge Function
        'YOUR_VAPID_PUBLIC_KEY_HERE'
      ),
    });

    const token = JSON.stringify(subscription);

    // Store in user_settings table
    // TODO: Implement Supabase mutation to save push token
    console.log('[PWA] Push subscription:', token.substring(0, 50) + '...');

    return token;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

/**
 * Convert VAPID key to Uint8Array
 * @private
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribePush() {
  try {
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Push unsubscribed');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscribe failed:', error);
    return false;
  }
}

export default {
  registerServiceWorker,
  setupInstallPrompt,
  promptInstall,
  isInstallable,
  isInstalledPWA,
  requestPushPermission,
  unsubscribePush,
};
