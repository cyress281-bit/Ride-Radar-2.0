import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook to fetch conversations for current user with real-time updates
 *
 * Optimized: Real-time events use setQueryData for incremental updates
 * instead of full invalidation. Only new conversations trigger a prepend;
 * updates are applied in-place with re-sorting.
 */
export function useConversations(userId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false });

      if (error) {
        logger.error('[useConversations] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 60000, // 60 seconds - real-time handles freshness
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // Real-time keeps this fresh
  });

  // Real-time subscription with incremental cache updates (no full refetch)
  useEffect(() => {
    if (!userId) return;

    logger.debug('[useConversations] Setting up real-time subscription');

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          // Only add if user is a participant
          if (!payload.new.participant_ids?.includes(userId)) return;

          logger.debug('[useConversations] New conversation received');
          queryClient.setQueryData(['conversations', userId], (old = []) => {
            // Don't duplicate
            if (old.some((c) => c.id === payload.new.id)) return old;
            // Prepend new conversation (most recent first)
            return [payload.new, ...old];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          if (!payload.new.participant_ids?.includes(userId)) return;

          logger.debug('[useConversations] Conversation updated in-place');
          queryClient.setQueryData(['conversations', userId], (old = []) => {
            const updated = old.map((c) =>
              c.id === payload.new.id ? payload.new : c
            );
            // Re-sort by last_message_at (descending)
            return updated.sort(
              (a, b) =>
                new Date(b.last_message_at || 0).getTime() -
                new Date(a.last_message_at || 0).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
