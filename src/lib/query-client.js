import { QueryClient } from '@tanstack/react-query';
import { normalizeNotifications } from '@/lib/notificationNormalizer';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        // Retry once for network errors
        return failureCount < 1;
      },
      staleTime: 30000, // 30s default - prevents refetch on every mount
      gcTime: 5 * 60 * 1000, // 5 min garbage collection (was "cacheTime" in v4)
      // Allow stale data when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on network failure
      retry: (failureCount, error) => {
        // Don't retry if offline (will queue instead)
        if (!navigator.onLine) return false;
        return failureCount < 1;
      },
      // Queue mutations when offline
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Prefetch utilities for common navigation paths.
 * Call these on hover/focus to warm the cache before navigation.
 */
export function prefetchBroadcastDetail(broadcastId) {
  if (!broadcastId) return;
  queryClientInstance.prefetchQuery({
    queryKey: ['broadcast', broadcastId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('id', broadcastId)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 min - detail pages don't change often
  });
}

export function prefetchHomeData(userId) {
  if (!userId) return;

  // Prefetch conversations (commonly navigated to from home)
  queryClientInstance.prefetchQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Prefetch notifications count
  queryClientInstance.prefetchQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return normalizeNotifications(data || []);
    },
    staleTime: 30000,
  });
}

/**
 * Prefetch conversation messages when hovering over a conversation in the list.
 * Messages are the heaviest query in ConversationView - prefetching makes
 * navigation feel instant instead of showing a loading state.
 */
export function prefetchConversationMessages(conversationId) {
  if (!conversationId) return;

  // Only prefetch if not already cached
  const existing = queryClientInstance.getQueryData(['messages', conversationId]);
  if (existing) return;

  queryClientInstance.prefetchQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // Match useConversationMessages staleTime
  });
}

/**
 * Prefetch a rider's profile when hovering over profile links.
 * Warms the cache so RiderProfile page renders instantly.
 */
export function prefetchRiderProfile(userId) {
  if (!userId) return;

  // Only prefetch if not already cached
  const existing = queryClientInstance.getQueryData(['profile', userId]);
  if (existing) return;

  queryClientInstance.prefetchQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .maybeSingle();

      return data || null;
    },
    staleTime: 5 * 60 * 1000, // 5 min - profiles are stable
  });
}
