import { QueryClient } from '@tanstack/react-query';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';
import { getBroadcastById } from '@/features/broadcast/api/broadcast-api.js';
import { getProfileByUserId } from '@/features/profile/api/profile-api';
import { getMessages } from '@/features/chat/api/chat-api.js';
import { getConversations } from '@/features/chat/api/chat-api.js';
import { getNotifications } from '@/features/notifications/api/notifications-api.js';
import {
  getUserCount,
  getActiveBroadcastCount,
  getPendingReportCount,
  getActiveConversationCount,
  getTodaysStats,
} from '@/features/admin/api/admin-api.js';
import { getOrCreateSettings } from '@/features/settings/api/settings-api.js';

// Inline key shapes to avoid importing hook modules into the eager main chunk.
// Importing hook files (use-notifications, use-settings) here pulls them into
// the eagerly-loaded bundle, which creates a TDZ when the lazy page chunks try
// to evaluate the same modules. Keep these in sync with the hook key factories.
const _notifListKey = (userId) => ['notifications', 'list', userId];
const _settingsDetailKey = (userId) => ['settings', userId];

/**
 * Shared TanStack Query client for Ride Radar 2.0.
 *
 * Default behavior:
 * - 30s stale time to avoid refetching on every mount
 * - 5min garbage collection
 * - No refetch on window focus
 * - Offline-first network mode
 * - 1 retry for network errors only when online
 */
function isRetryableError(error) {
  // Retry network errors and 5xx server errors; don't retry 4xx client errors
  if (!error) return true;
  const status = error?.status || error?.statusCode || error?.code;
  if (typeof status === 'number') {
    if (status >= 400 && status < 500) return false;
  }
  if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch')) return true;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        if (!isRetryableError(error)) return false;
        // Retry once for retryable errors
        return failureCount < 1;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        if (!isRetryableError(error)) return false;
        return failureCount < 1;
      },
    },
  },
});

/**
 * Alias for AppProviders compatibility.
 */
export const queryClientInstance = queryClient;

/**
 * Prefetch a broadcast detail page.
 * @param {QueryClient} qc
 * @param {string} broadcastId
 */
export function prefetchBroadcastDetail(qc, broadcastId) {
  if (!broadcastId) return;
  qc.prefetchQuery({
    queryKey: broadcastKeys.detail(broadcastId),
    queryFn: async () => {
      const { data, error } = await getBroadcastById(broadcastId);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
}

/**
 * Prefetch messages for a conversation.
 * @param {QueryClient} qc
 * @param {string} conversationId
 * @param {string} userId
 */
export function prefetchConversationMessages(qc, conversationId, userId) {
  if (!conversationId || !userId) return;
  const existing = qc.getQueryData(['messages', conversationId, userId]);
  if (existing) return;

  qc.prefetchQuery({
    queryKey: ['messages', conversationId, userId],
    queryFn: async () => {
      const { data, error } = await getMessages(conversationId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });
}

/**
 * Prefetch conversations list for a user.
 * @param {QueryClient} qc
 * @param {string} userId
 */
export function prefetchConversations(qc, userId) {
  if (!userId) return;
  const existing = qc.getQueryData(['conversations', userId]);
  if (existing) return;

  qc.prefetchQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const { data, error } = await getConversations(userId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });
}

/**
 * Prefetch notifications for a user.
 * @param {QueryClient} qc
 * @param {string} userId
 */
export function prefetchNotifications(qc, userId) {
  if (!userId) return;
  const existing = qc.getQueryData(_notifListKey(userId));
  if (existing) return;

  qc.prefetchQuery({
    queryKey: _notifListKey(userId),
    queryFn: async () => {
      const { data, error } = await getNotifications(userId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

/**
 * Prefetch user settings.
 * @param {QueryClient} qc
 * @param {string} userId
 */
export function prefetchSettings(qc, userId) {
  if (!userId) return;
  const existing = qc.getQueryData(_settingsDetailKey(userId));
  if (existing) return;

  qc.prefetchQuery({
    queryKey: _settingsDetailKey(userId),
    queryFn: async () => {
      const { data, error } = await getOrCreateSettings(userId);
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
}

/**
 * Prefetch admin dashboard stats (all 5 stat cards).
 * Only call this for admin users — each API fn calls assertAdmin() internally.
 * @param {QueryClient} qc
 */
export function prefetchAdminDashboard(qc) {
  const opts = { staleTime: 30000 };
  qc.prefetchQuery({ queryKey: ['admin', 'user-count'], queryFn: getUserCount, ...opts });
  qc.prefetchQuery({ queryKey: ['admin', 'active-broadcast-count'], queryFn: getActiveBroadcastCount, ...opts });
  qc.prefetchQuery({ queryKey: ['admin', 'pending-report-count'], queryFn: getPendingReportCount, ...opts });
  qc.prefetchQuery({ queryKey: ['admin', 'active-conversation-count'], queryFn: getActiveConversationCount, ...opts });
  qc.prefetchQuery({ queryKey: ['admin', 'todays-stats'], queryFn: getTodaysStats, ...opts });
}

/**
 * Prefetch a rider's public profile.
 * @param {QueryClient} qc
 * @param {string} userId
 */
export function prefetchRiderProfile(qc, userId) {
  if (!userId) return;
  const existing = qc.getQueryData(['profile', userId]);
  if (existing) return;

  qc.prefetchQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await getProfileByUserId(userId);
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });
}
