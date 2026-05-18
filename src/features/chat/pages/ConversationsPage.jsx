import React, { useMemo, memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useConversations } from '@/features/chat/hooks/use-conversations.js';
import { useConnectionRequests } from '@/features/connections/hooks/use-connection-requests.js';
import ConversationList from '@/features/chat/components/ConversationList.jsx';
import CrewTab from '@/features/chat/components/CrewTab.jsx';
import RequestsTab from '@/features/chat/components/RequestsTab.jsx';
import RiderSearch from '@/features/chat/components/RiderSearch.jsx';
import { supabase } from '@/lib/supabase.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { MessageSquare, Search, RefreshCw, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';


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
  const [showSearch, setShowSearch] = useState(false);

  const [activeTab, setActiveTab] = useState('chats');
  const { data: conversations = [], isLoading, isError, error, refetch } = useConversations();
  const { data: pendingRequests = [] } = useConnectionRequests();
  const { blockedIds } = useBlockedIds();
  const pendingCount = pendingRequests.length;

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
              <span
                className="absolute -top-1 -right-3 h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary)_/_0.8)]"
                aria-label="Unread messages"
              />
            )}
          </div>
        </div>
        <HStack gap={2} align="center">
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            className={cn(
              'p-2.5 rounded-full border transition-all active:scale-95 shadow-depth-1',
              showSearch
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-white/[0.06] bg-surface/80 backdrop-blur-xl text-muted-foreground hover:bg-surface-elevated hover:border-primary/20',
            )}
            aria-label={showSearch ? 'Close rider search' : 'Find riders'}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className={cn(
              'p-2.5 rounded-full border border-white/[0.06] bg-surface/80 backdrop-blur-xl transition-all',
              'hover:bg-surface-elevated hover:border-primary/20 active:scale-95 disabled:opacity-50',
              'shadow-depth-1',
            )}
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
          </button>
        </HStack>
      </HStack>

      {/* Find Riders search panel */}
      {showSearch && (
        <div className="animate-fade-up">
          <RiderSearch currentUserId={user?.id} blockedIds={blockedIds} showActions={false} />
        </div>
      )}

      {/* Tabs */}
      <HStack gap={2} className="px-1">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={cn(
            'min-h-[44px] px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'chats'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface/60 border border-white/[0.06] text-muted-foreground hover:text-foreground',
          )}
        >
          <MessageSquare className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          Chats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('crew')}
          className={cn(
            'min-h-[44px] px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'crew'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface/60 border border-white/[0.06] text-muted-foreground hover:text-foreground',
          )}
        >
          <Users className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          Friends
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={cn(
            'relative min-h-[44px] px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'requests'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface/60 border border-white/[0.06] text-muted-foreground hover:text-foreground',
          )}
        >
          <UserPlus className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      </HStack>

      {activeTab === 'chats' && (
        <>
          {/* Search */}
          <div className="relative animate-fade-up" style={{ animationDelay: '50ms' }}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="conversation-search"
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
                  icon={MessageSquare}
                  title="No rider messages yet."
                  description="Find a rider or start a signal to open a conversation."
                  action={{ label: 'Find a Rider', onClick: () => navigate('/home'), variant: 'default' }}
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


        </>
      )}

      {activeTab === 'crew' && <CrewTab />}
      {activeTab === 'requests' && <RequestsTab />}
    </VStack>
  );
}

export default memo(ConversationsPage);
