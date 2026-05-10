import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { getMessages, markConversationRead } from '@/features/chat/api/chat-api.js';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

/**
 * Hook to fetch messages for a conversation with real-time updates.
 *
 * Own messages are handled by optimistic updates in useSendMessage.
 * Real-time subscription only appends messages from OTHER users.
 * Deduplication is handled via a seenIdsRef.
 */
export function useMessages(conversationId) {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  const seenIdsRef = useRef(new Set());

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

  // Real-time subscription — only append messages from OTHER users
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new;

          if (newMessage.from_user_id === user.id) {
            seenIdsRef.current.add(newMessage.id);
            return;
          }

          if (seenIdsRef.current.has(newMessage.id)) return;

          seenIdsRef.current.add(newMessage.id);
          queryClient.setQueryData(['messages', conversationId], (old = []) => {
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          });
        }
      )
      .subscribe();

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
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) return null;
      const { data, error } = await markConversationRead(conversationId, user.id);
      if (error) throw error;
      return data;
    },
  });
}
