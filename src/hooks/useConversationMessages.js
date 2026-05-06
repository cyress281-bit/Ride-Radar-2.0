import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { logger } from '@/lib/logger';

/**
 * Hook to fetch messages for a conversation with real-time updates
 *
 * Optimized to prevent double-refetch:
 * - Own messages are added optimistically by useSendMessage (no refetch needed)
 * - Real-time subscription only appends messages from OTHER users via setQueryData
 * - Full refetches are avoided in favor of incremental cache updates
 */
export function useConversationMessages(conversationId) {
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  // Track message IDs we've already seen to prevent duplicates from real-time
  const seenIdsRef = useRef(new Set());

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('[useConversationMessages] Error:', error);
        throw error;
      }

      const messages = data || [];
      // Update seen IDs set with fetched message IDs
      seenIdsRef.current = new Set(messages.map((m) => m.id));
      return messages;
    },
    enabled: !!conversationId,
    staleTime: 60000, // 60 seconds - real-time handles freshness
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Real-time keeps data fresh
  });

  // Real-time subscription - only appends messages from OTHER users
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

          // Skip messages from current user - already handled by optimistic update
          if (newMessage.from_user_id === user.id) {
            // But DO update the seen IDs so we don't duplicate later
            seenIdsRef.current.add(newMessage.id);
            return;
          }

          // Skip if we've already seen this message (dedup)
          if (seenIdsRef.current.has(newMessage.id)) {
            return;
          }

          // Append the new message directly to cache (no full refetch!)
          seenIdsRef.current.add(newMessage.id);
          queryClient.setQueryData(['messages', conversationId], (old = []) => {
            // Double-check it's not already in the array
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
