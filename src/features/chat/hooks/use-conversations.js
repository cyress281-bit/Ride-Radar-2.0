import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { getConversations } from '@/features/chat/api/chat-api.js';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

/**
 * Hook to fetch conversations for the current user with real-time updates.
 *
 * Real-time events use setQueryData for incremental updates instead of full
 * invalidation. New conversations are prepended; updates are applied in-place
 * and re-sorted by last_message_at descending. Blocked users are filtered out.
 */
export function useConversations() {
  const { user } = useAuthState();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { blockedIds } = useBlockedIds();

  const query = useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getConversations(userId);
      if (error) {
        logger.error('[useConversations] Error fetching conversations:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription with incremental cache updates
  useEffect(() => {
    if (!userId) return;

    logger.debug('[useConversations] Setting up real-time subscription');

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          if (!payload.new.participant_ids?.includes(userId)) return;

          logger.debug('[useConversations] New conversation received');
          queryClient.setQueryData(['conversations', userId], (old = []) => {
            if (old.some((c) => c.id === payload.new.id)) return old;
            return [payload.new, ...old];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          if (!payload.new.participant_ids?.includes(userId)) return;

          logger.debug('[useConversations] Conversation updated in-place');
          queryClient.setQueryData(['conversations', userId], (old = []) => {
            const updated = old.map((c) =>
              c.id === payload.new.id ? payload.new : c
            );
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

  const filtered = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter(
      (c) =>
        !c.participant_ids?.some(
          (id) => id !== userId && blockedIds.has(id)
        )
    );
  }, [query.data, userId, blockedIds]);

  return { ...query, data: filtered };
}
