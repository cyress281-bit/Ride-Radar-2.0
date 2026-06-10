import { useEffect, useId } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';

/**
 * Returns the other participant's last read_at timestamp for a conversation,
 * used to render read receipts. RLS only returns the other rider's row when BOTH
 * riders have read receipts enabled — so a null result means "no receipt to show"
 * (either unread, or receipts disabled by either side).
 *
 * @param {string|null} conversationId
 * @param {string|null} otherUserId
 * @returns {string|null} ISO timestamp the other rider last read, or null
 */
export function useConversationReadState(conversationId, otherUserId) {
  const qc = useQueryClient();
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const queryKey = ['conversation-read-receipt', conversationId, otherUserId];

  const { data: otherReadAt = null } = useQuery({
    queryKey,
    enabled: !!conversationId && !!otherUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_notifications')
        .select('read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId)
        .maybeSingle();
      if (error) throw error;
      return data?.read_at || null;
    },
    staleTime: 10_000,
  });

  // Live update when the other rider reads (their conversation_notifications row changes).
  // RLS gates delivery: if receipts are disabled either side, the row is invisible and
  // no event arrives — which is the correct "no receipt" outcome.
  useEffect(() => {
    if (!conversationId || !otherUserId) return;
    const channel = supabase
      .channel(`conv-read-${conversationId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_notifications', filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, otherUserId, instanceId, qc]);

  return otherReadAt;
}
