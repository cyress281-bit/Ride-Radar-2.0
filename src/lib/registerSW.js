/**
 * Service Worker Registration for Ride Radar PWA
 *
 * This module handles:
 * - Service worker registration and lifecycle
 * - Update notifications
 * - Installation prompting
 */

import { logger } from '@/lib/logger.js';
import { trackPWAInstalled } from '@/lib/analytics.js';

let deferredPrompt = null;
let registration = null;
let refreshing = false;
const UPDATE_AVAILABLE_STORAGE_KEY = 'rr-pwa-update-available';
const UPDATE_AVAILABLE_EVENT = 'rr-pwa-update-available';
const UPDATE_CLEARED_EVENT = 'rr-pwa-update-cleared';
let updateListenersAttached = false;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    const lastReload = sessionStorage.getItem('sw-last-reload');
    const now = Date.now();
    if (lastReload && now - parseInt(lastReload, 10) < 10000) {
      return;
    }
    sessionStorage.setItem('sw-last-reload', String(now));
    refreshing = true;
    clearPendingServiceWorkerUpdate();
    window.location.reload();
  });
}

function setPendingServiceWorkerUpdate() {
  try {
    sessionStorage.setItem(UPDATE_AVAILABLE_STORAGE_KEY, '1');
  } catch {
    // ignore storage failures; the live event still updates the UI
  }
  window.dispatchEvent(new CustomEvent(UPDATE_AVAILABLE_EVENT));
}

function clearPendingServiceWorkerUpdate() {
  try {
    sessionStorage.removeItem(UPDATE_AVAILABLE_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(UPDATE_CLEARED_EVENT));
}

function hasPendingServiceWorkerUpdate() {
  try {
    return sessionStorage.getItem(UPDATE_AVAILABLE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function getWaitingServiceWorkerRegistration() {
  return registration?.waiting || null;
}

function notifyIfWaitingUpdate() {
  if (navigator.serviceWorker.controller && getWaitingServiceWorkerRegistration()) {
    setPendingServiceWorkerUpdate();
  }
}

function isExpectedServiceWorkerUpdateError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return (
    name === 'invalidstateerror' ||
    message.includes('invalidstateerror') ||
    message.includes('invalid state') ||
    message.includes('not found') ||
    message.includes('script unknown') ||
    message.includes('unknown: not found')
  );
}

async function safeUpdateRegistration(context) {
  if (!registration) return false;

  try {
    await registration.update();
    return true;
  } catch (error) {
    if (isExpectedServiceWorkerUpdateError(error)) {
      logger.debug('[registerSW] Ignoring expected service worker update race', {
        context,
        name: error?.name,
        message: error?.message,
      });
    } else {
      logger.warn('[registerSW] Service worker update failed', {
        context,
        name: error?.name,
        message: error?.message,
        error,
      });
    }
    return false;
  }
}

function attachServiceWorkerUpdateListeners() {
  if (updateListenersAttached || !registration) return;
  updateListenersAttached = true;

  const checkForUpdate = () => {
    if (document.visibilityState !== 'visible') return;
    void safeUpdateRegistration('visibilitychange/focus').finally(notifyIfWaitingUpdate);
  };

  window.addEventListener('focus', checkForUpdate);
  document.addEventListener('visibilitychange', checkForUpdate);

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        setPendingServiceWorkerUpdate();
      }
    });
  });
}

/**
 * Register the service worker (called from main.jsx)
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Force-unregister any old service workers from previous builds
      // This ensures the latest build loads immediately
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing && existing.scope) {
        const swUrl = existing.active?.scriptURL || existing.installing?.scriptURL || existing.waiting?.scriptURL;
        // If the SW URL doesn't contain our version marker, unregister it
        if (swUrl && !swUrl.includes('v=' + __SW_VERSION__)) {
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
        const stalePrefixes = ['supabase-storage-cache'];
        await Promise.all(
          cacheNames
            .filter((name) => stalePrefixes.some((p) => name.includes(p)))
            .map((name) => caches.delete(name))
        );
      }

      registration = await navigator.serviceWorker.register('/sw.js?v=' + __SW_VERSION__, {
        scope: '/',
      });
      attachServiceWorkerUpdateListeners();

      if (registration.waiting && navigator.serviceWorker.controller) {
        setPendingServiceWorkerUpdate();
      }

      void safeUpdateRegistration('post-register').finally(notifyIfWaitingUpdate);

      // Check for updates every hour
      const updateInterval = setInterval(() => {
        void safeUpdateRegistration('hourly-check').finally(notifyIfWaitingUpdate);
      }, 60 * 60 * 1000);

      // Cleanup interval when page unloads to avoid leaked timers in tests/long sessions
      window.addEventListener('beforeunload', () => {
        clearInterval(updateInterval);
      });

    } catch (error) {
      logger.warn('[registerSW] Service worker registration failed', {
        name: error?.name,
        message: error?.message,
        error,
      });
      // Keep the app alive; update recovery remains handled elsewhere.
    }
  }
}

/**
 * Activate a waiting service worker if one is available.
 * Returns true when an activation request was sent.
 */
export async function activatePendingServiceWorkerUpdate() {
  if (!('serviceWorker' in navigator) || !registration) return false;

  const waiting = getWaitingServiceWorkerRegistration();
  if (!waiting) {
    await safeUpdateRegistration('activate-no-waiting');
    notifyIfWaitingUpdate();
    return false;
  }

  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export function getPendingServiceWorkerUpdateState() {
  return hasPendingServiceWorkerUpdate();
}

export function clearPendingServiceWorkerUpdateState() {
  clearPendingServiceWorkerUpdate();
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
    trackPWAInstalled();
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
    // Install prompt error â€” logged silently
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
  activatePendingServiceWorkerUpdate,
  getPendingServiceWorkerUpdateState,
  clearPendingServiceWorkerUpdateState,
  setupInstallPrompt,
  promptInstall,
  isInstallable,
  isInstalledPWA,
};
