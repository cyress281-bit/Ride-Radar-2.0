import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';

/**
 * Returns the number of conversations with unread messages.
 * Shares query keys with ConversationsPage so no duplicate requests when that page is mounted.
 */
export function useUnreadMessageCount() {
  const { user } = useAuthState();
  const userId = user?.id;

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, last_message_at')
        .contains('participant_ids', [userId])
        .not('last_message_at', 'is', null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: readNotifications = [] } = useQuery({
    queryKey: ['conversation-notifications', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_notifications')
        .select('conversation_id, read_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  return useMemo(() => {
    const readMap = new Map(readNotifications.map((n) => [n.conversation_id, n.read_at]));
    return conversations.filter((c) => {
      const readAt = readMap.get(c.id);
      return c.last_message_at && (!readAt || new Date(readAt) < new Date(c.last_message_at));
    }).length;
  }, [conversations, readNotifications]);
}
