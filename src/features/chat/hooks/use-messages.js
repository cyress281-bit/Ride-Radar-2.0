import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { getMessages, hydrateMessageImages, markConversationRead } from '@/features/chat/api/chat-api.js';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';
import {
  markRealtimeSurfaceSubscribed,
  markRealtimeSurfaceReconnecting,
  markRealtimeSurfaceError,
} from '@/lib/realtimeHealthRegistry.js';

/**
 * Hook to fetch messages for a conversation with real-time updates.
 *
 * Own messages are handled by optimistic updates in useSendMessage.
 * Real-time subscription only appends messages from OTHER users.
 * Deduplication is handled via a seenIdsRef.
 */
export function useMessages(conversationId) {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const seenIdsRef = useRef(new Set());
  const channelIdRef = useRef(`msg-${Math.random().toString(36).slice(2)}`);

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await getMessages(conversationId);
      if (error) {
        logger.error('[useMessages] Error fetching messages:', error);
        throw error;
      }
      const messages = data || [];
      seenIdsRef.current = new Set(messages.map((m) => m.id));
      return messages;
    },
    enabled: !!conversationId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      markRealtimeSurfaceSubscribed('messages');
    } else if (query.isError) {
      markRealtimeSurfaceError('messages');
    }
  }, [query.isError, query.isSuccess]);

  // Real-time subscription — only append messages from OTHER users
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`messages-${conversationId}-${channelIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = await hydrateMessageImages([payload.new]).then((items) => items[0]);

          // Skip own messages — handled by optimistic updates in useSendMessage
          if (newMessage.from_user_id === user.id) return;

          // Deduplicate across all sources (optimistic updates, realtime, other devices)
          if (seenIdsRef.current.has(newMessage.id)) return;
          seenIdsRef.current.add(newMessage.id);

          queryClient.setQueryData(['messages', conversationId], (old = []) => {
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          });

          // Also update conversation list so it reflects the new message
          queryClient.setQueryData(['conversations', user?.id], (old = []) => {
            const updated = old.map((c) =>
              c.id === conversationId
                ? { ...c, last_message_at: newMessage.created_at }
                : c
            );
            return updated.sort(
              (a, b) =>
                new Date(b.last_message_at || 0).getTime() -
                new Date(a.last_message_at || 0).getTime()
            );
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[useMessages] Realtime subscription disconnected (expected reconnect)', {
              status,
              name: err?.name,
              code: err?.code,
              message: err?.message,
            });
            markRealtimeSurfaceReconnecting('messages');
          } else {
            logger.error('[useMessages] Realtime subscription error:', err);
            markRealtimeSurfaceError('messages');
          }
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('messages');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('messages');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, queryClient]);

  return query;
}

/**
 * Mutation hook to mark a conversation as read for the current user.
 * @param {string} conversationId
 */
export function useMarkRead(conversationId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) return null;
      const { data, error } = await markConversationRead(conversationId, user.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['conversation-notifications', user.id] });
      }
    },
  });
}
