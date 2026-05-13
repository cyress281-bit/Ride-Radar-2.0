import React, { useMemo, memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useConversations } from '@/features/chat/hooks/use-conversations.js';
import ConversationList from '@/features/chat/components/ConversationList.jsx';
import { supabase } from '@/lib/supabase.js';
import { MessageCircle, Plus, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { toast } from '@/components/ui/use-toast';

/**
 * Conversations list page.
 *
 * Displays all active chat threads with real-time updates.
 * Electric neon design: search bar with glassmorphism, neon accents,
 * animated conversation list, glowing FAB.
 */
function ConversationsPage() {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: conversations = [], isLoading, isError, error, refetch } = useConversations();

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

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const otherId = conv.participant_ids?.find((id) => id !== user?.id);
      const profile = profiles.get(otherId);
      const name = profile?.display_name || '';
      const preview = conv.last_message?.body || conv.last_message_preview || '';
      return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, profiles, user?.id]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [refetch]);

  const hasUnread = unreadMap.size > 0;

  return (
    <VStack gap={4} className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <HStack justify="between" align="center" className="px-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Text as="h1" variant="h1" color="default" className="rr-aggressive-heading">
              Messages
            </Text>
            {hasUnread && (
              <span className="absolute -top-1 -right-3 h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary)_/_0.8)]" />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className={cn(
            'p-2.5 rounded-full border border-white/[0.06] bg-surface/80 backdrop-blur-xl transition-all',
            'hover:bg-surface-elevated hover:border-primary/20 active:scale-95 disabled:opacity-50',
            'shadow-depth-1'
          )}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
        </button>
      </HStack>

      {/* Search */}
      <div className="relative animate-fade-up" style={{ animationDelay: '50ms' }}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className={cn(
            'w-full rounded-full border border-white/[0.06] bg-surface/60 backdrop-blur-xl pl-10 pr-4 py-3 text-sm text-foreground',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30',
            'transition-all duration-200 shadow-depth-1',
            'hover:bg-surface/80 hover:border-white/[0.08]'
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="sr-only">Clear search</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading && conversations.length === 0 ? (
        <LoadingState variant="section" message="Loading conversations..." />
      ) : isError ? (
        <ErrorState
          title="Messages failed to load"
          message={error?.message || 'Please refresh and try again.'}
          onRetry={refetch}
        />
      ) : filteredConversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center animate-fade-up">
          {searchQuery.trim() ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description="Try a different search term."
              className="w-full"
            />
          ) : (
            <EmptyState
              icon={MessageCircle}
              title="No open comms"
              description="Start a conversation with another rider to see it here."
              action={{ label: 'Find a rider', onClick: () => navigate('/home'), variant: 'default' }}
              className="w-full"
            />
          )}
        </div>
      ) : (
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <ConversationList
            conversations={filteredConversations}
            profiles={profiles}
            currentUserId={user?.id}
            unreadMap={unreadMap}
          />
        </div>
      )}

      {/* New message FAB */}
      <button
        type="button"
        onClick={() => {
          toast({
            title: 'Start a conversation',
            description: 'Visit a rider\'s profile from the home feed to message them.',
          });
          navigate('/home');
        }}
        className={cn(
          'fixed bottom-28 right-5 z-50 h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center pressable',
          'border border-primary/20 shadow-depth-4',
          'animate-glow-pulse hover:animate-none'
        )}
        aria-label="New message"
      >
        <Plus className="w-6 h-6" />
      </button>
    </VStack>
  );
}

export default memo(ConversationsPage);
