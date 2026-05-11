import React, { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useConversations } from '@/features/chat/hooks/use-conversations.js';
import ConversationList from '@/features/chat/components/ConversationList.jsx';
import { supabase } from '@/lib/supabase.js';
import { MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import RRLogo from '@/components/RRLogo';
import { LoadingState } from '@/components/shared/LoadingState';

/**
 * Conversations list page.
 *
 * Displays all active chat threads with real-time updates.
 */
function ConversationsPage() {
  const { user } = useAuthState();
  const navigate = useNavigate();

  const { data: conversations = [], isLoading, isError, error } = useConversations();

  const { data: readNotifications = [] } = useQuery({
    queryKey: ['conversation-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('conversation_notifications')
        .select('conversation_id, read_at')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const unreadMap = useMemo(() => {
    const map = new Map();
    const readMap = new Map(readNotifications.map((n) => [n.conversation_id, n.read_at]));
    for (const conv of conversations) {
      const readAt = readMap.get(conv.id);
      const lastMessageAt = conv.last_message_at;
      if (lastMessageAt && (!readAt || new Date(readAt) < new Date(lastMessageAt))) {
        map.set(conv.id, 1);
      }
    }
    return map;
  }, [conversations, readNotifications]);

  const otherIds = useMemo(
    () =>
      conversations
        .flatMap((c) => c.participant_ids)
        .filter((id) => id !== user?.id),
    [conversations, user?.id]
  );

  const { profiles } = useProfileBatch(otherIds);

  return (
    <div className="px-5 pt-5 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Comms</h1>
      </div>

      {isLoading && conversations.length === 0 ? (
        <LoadingState variant="section" message="Loading comms..." />
      ) : isError ? (
        <div className="rr-surface text-center py-16 rounded-3xl border border-destructive/30 backdrop-blur-xl mt-8">
          <h3 className="font-bold text-xl mb-2">Messages failed to load</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {error?.message || 'Please refresh and try again.'}
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="rr-surface text-center py-20 rounded-3xl border border-dashed border-primary/25 backdrop-blur-xl mt-4 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <div className="relative z-10 flex items-center justify-center gap-2 mb-2">
            <RRLogo size="sm" className="opacity-70" />
            <h3 className="font-bold text-xl">No open comms</h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10">
            Start a conversation with another rider to see it here.
          </p>
        </div>
      ) : (
        <ConversationList
          conversations={conversations}
          profiles={profiles}
          currentUserId={user?.id}
          unreadMap={unreadMap}
        />
      )}

      {/* New message FAB */}
      <button
        type="button"
        onClick={() => navigate('/messages/new')}
        className={cn(
          'fixed bottom-28 right-6 z-50 h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-transform duration-200 hover:scale-105 active:scale-95',
          'border border-primary/20'
        )}
        aria-label="New message"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

export default memo(ConversationsPage);
