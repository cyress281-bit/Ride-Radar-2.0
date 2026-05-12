import { QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase.js';

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
  if (typeof status === 'number' && status >= 400 && status < 500) return false;
  if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch')) return true;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
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
    queryKey: ['broadcast', broadcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('id', broadcastId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
}

/**
 * Prefetch home-screen data (conversations + notifications).
 * @param {QueryClient} qc
 */
export function prefetchHomeData(qc) {
  // Prefetch active broadcasts list
  qc.prefetchQuery({
    queryKey: ['broadcasts', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Prefetch nearby riders count
  qc.prefetchQuery({
    queryKey: ['riders', 'nearby', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_presence')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30000,
  });
}

/**
 * Prefetch messages for a conversation.
 * @param {QueryClient} qc
 * @param {string} conversationId
 */
export function prefetchConversationMessages(qc, conversationId) {
  if (!conversationId) return;
  const existing = qc.getQueryData(['messages', conversationId]);
  if (existing) return;

  qc.prefetchQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
