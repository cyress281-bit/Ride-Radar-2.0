/**
 * Route preloading utilities.
 *
 * After login succeeds, we preload the Home route chunk so the user
 * doesn't see a loading spinner on their first navigation.
 */

export const preloadHome = () => import('@/features/broadcast/pages/BroadcastFeedPage');
export const preloadMessages = () => import('@/features/chat/pages/ConversationsPage');
export const preloadBroadcast = () => import('@/features/broadcast/pages/BroadcastCreatePage');
export const preloadProfile = () => import('@/features/profile/pages/ProfilePage');

/**
 * Preload the core authenticated routes after login.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */
export function preloadCoreRoutes() {
  const load = () => {
    preloadHome();
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
