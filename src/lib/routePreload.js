/**
 * Route preloading utilities.
 *
 * After login succeeds, we preload the Home route chunk so the user
 * doesn't see a loading spinner on their first navigation.
 *
 * Usage:
 *   import { preloadHome } from '@/lib/routePreload';
 *   // After login success:
 *   preloadHome();
 */

// These match the lazy() imports in App.jsx — Vite will deduplicate the chunks.
export const preloadHome = () => import('@/pages/Home');
export const preloadMessages = () => import('@/pages/Messages');
export const preloadBroadcast = () => import('@/pages/Broadcast');
export const preloadProfile = () => import('@/pages/Profile');

/**
 * Preload the core authenticated routes after login.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */
export function preloadCoreRoutes() {
  const load = () => {
    preloadHome();
    // Delay secondary routes slightly to prioritize Home
    setTimeout(() => {
      preloadMessages();
      preloadBroadcast();
      preloadProfile();
    }, 1000);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(load);
  } else {
    setTimeout(load, 100);
  }
}
