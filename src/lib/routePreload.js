/**
 * Route preloading utilities.
 *
 * After login succeeds, we preload the Home route chunk so the user
 * doesn't see a loading spinner on their first navigation.
 *
 * High-intent route preloads are triggered by user interaction
 * (hover/focus/touch) on links and cards — never on startup.
 */

export const preloadHome = () => import('@/features/broadcast/pages/BroadcastFeedPage');
export const preloadMessages = () => import('@/features/chat/pages/ConversationsPage');
export const preloadBroadcast = () => import('@/features/broadcast/pages/BroadcastCreatePage');
export const preloadProfile = () => import('@/features/profile/pages/ProfilePage');

// High-intent detail routes — preloaded on user interaction only
export const preloadBroadcastDetail = () => import('@/features/broadcast/pages/BroadcastDetailPage');
export const preloadConversation = () => import('@/features/chat/pages/ConversationPage');
export const preloadRiderProfile = () => import('@/features/profile/pages/RiderProfilePage');
export const preloadSettings = () => import('@/features/settings/pages/SettingsPage');
export const preloadNotifications = () => import('@/features/notifications/pages/NotificationsPage');

// Admin routes — preloaded only when admin user hovers/focuses admin nav
export const preloadAdminDashboard = () => import('@/features/admin/pages/AdminDashboardPage');
export const preloadAdminUsers = () => import('@/features/admin/pages/AdminUsersPage');
export const preloadAdminBroadcasts = () => import('@/features/admin/pages/AdminBroadcastsPage');
export const preloadAdminEvents = () => import('@/features/admin/pages/AdminEventsPage');
export const preloadAdminReports = () => import('@/features/admin/pages/AdminReportsPage');
export const preloadAdminMonitoring = () => import('@/features/admin/pages/AdminMonitoringPage');
export const preloadAdminBlocks = () => import('@/features/admin/pages/AdminBlocksPage');
export const preloadAdminDeletions = () => import('@/features/admin/pages/AdminDeletionRequestsPage');
export const preloadAdminNotifications = () => import('@/features/admin/pages/AdminNotificationsPage');
export const preloadAdminAnalytics = () => import('@/features/admin/pages/AdminAnalyticsPage');
export const preloadAdminCompliance = () => import('@/features/admin/pages/AdminCompliancePage');

/**
 * Preload the core authenticated routes after login.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */
export function preloadCoreRoutes() {
  let timeoutId = null;

  const load = () => {
    preloadHome();
    timeoutId = setTimeout(() => {
      preloadMessages();
      preloadBroadcast();
      preloadProfile();
    }, 1000);
  };

  const handle = 'requestIdleCallback' in window
    ? requestIdleCallback(load)
    : setTimeout(load, 100);

  // Return cleanup for callers that need it (e.g., React effects)
  return () => {
    if ('cancelIdleCallback' in window) {
      cancelIdleCallback(handle);
    } else {
      clearTimeout(handle);
    }
    if (timeoutId) clearTimeout(timeoutId);
  };
}

// ------------------------------------------------------------------
// Intent-based preload helpers (mobile-safe)
// ------------------------------------------------------------------

/** @type {WeakSet<HTMLElement>} */
const preloaded = new WeakSet();

/**
 * Trigger a preload once per element.
 * Safe to call repeatedly — deduplicated via WeakSet.
 *
 * @param {() => Promise<unknown>} loader
 * @param {HTMLElement} [element]
 */
function triggerOnce(loader, element) {
  if (element && preloaded.has(element)) return;
  if (element) preloaded.add(element);
  // Defer to next tick so we never block the interaction itself
  Promise.resolve().then(() => {
    try {
      loader();
    } catch {
      // Preload failures are non-fatal
    }
  });
}

/**
 * Props to spread on interactive elements for intent-based preloading.
 * Uses pointerenter (desktop hover), focus (keyboard), and pointerdown (mobile tap).
 *
 * @param {() => Promise<unknown>} loader
 * @returns {{
 *   onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
 *   onFocus: (e: React.FocusEvent<HTMLElement>) => void;
 *   onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
 * }}
 */
export function withRoutePreload(loader, dataLoader) {
  const trigger = (el) => {
    triggerOnce(loader, el);
    if (dataLoader) Promise.resolve().then(() => { try { dataLoader(); } catch {} });
  };
  return {
    onPointerEnter(e) {
      // Only preload on hover (mouse), not on touch devices where pointerenter fires on tap
      if (e.pointerType === 'mouse') {
        trigger(e.currentTarget);
      }
    },
    onFocus(e) {
      trigger(e.currentTarget);
    },
    onPointerDown(e) {
      // Mobile: preload on touch start / pointer down before navigation
      trigger(e.currentTarget);
    },
  };
}
