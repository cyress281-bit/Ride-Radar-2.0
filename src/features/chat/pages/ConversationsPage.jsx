import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { useProfileBatch } from '@/features/profile/hooks/use-profile-batch.js';
import { useConversations } from '@/features/chat/hooks/use-conversations.js';
import ConversationList from '@/features/chat/components/ConversationList.jsx';
import { MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils.js';

/**
 * Conversations list page.
 *
 * Displays all active chat threads with real-time updates.
 */
export default function ConversationsPage() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();

  const { data: conversations = [], isLoading, isError, error } = useConversations();

  const otherIds = useMemo(
    () =>
      conversations
        .flatMap((c) => c.participant_ids)
        .filter((id) => id !== user?.id),
    [conversations, user?.id]
  );

  const { profiles } = useProfileBatch(otherIds);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Comms</h1>
      </div>

      {isError ? (
        <div className="text-center py-16 rounded-3xl border border-destructive/30 bg-card/40 backdrop-blur-xl mt-8">
          <h3 className="font-bold text-xl mb-2">Messages failed to load</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {error?.message || 'Please refresh and try again.'}
          </p>
        </div>
      ) : conversations.length === 0 && !isLoading ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-primary/25 bg-card/40 backdrop-blur-xl mt-4 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-xl mb-2 relative z-10">No open comms</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10">
            Start a conversation with another rider to see it here.
          </p>
        </div>
      ) : (
        <ConversationList
          conversations={conversations}
          profiles={profiles}
          currentUserId={user?.id}
          isLoading={isLoading}
        />
      )}

      {/* New message FAB */}
      <button
        type="button"
        onClick={() => navigate('/messages/new')}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full',
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
