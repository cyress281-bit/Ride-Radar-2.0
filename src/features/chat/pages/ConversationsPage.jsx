import React, { useMemo, memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useConversations } from '@/features/chat/hooks/use-conversations.js';
import { useConnectionRequests } from '@/features/connections/hooks/use-connection-requests.js';
import ConversationList from '@/features/chat/components/ConversationList.jsx';
import CrewTab from '@/features/chat/components/CrewTab.jsx';
import RequestsTab from '@/features/chat/components/RequestsTab.jsx';
import { supabase } from '@/lib/supabase.js';
import { MessageSquare, Search, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils.js';
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
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState(() => location.state?.tab === 'crew' ? 'crew' : 'chats');
  const { data: conversations = [], isLoading, isError, error, refetch } = useConversations();
  const { data: pendingRequests = [] } = useConnectionRequests();
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
      // A message the current user sent is never "unread" to them — without this,
      // sending bumps last_message_at past your own read_at and falsely glows.
      if (conv.last_message?.from_user_id && conv.last_message.from_user_id === user?.id) continue;
      const readAt = readMap.get(conv.id);
      const lastMessageAt = conv.last_message_at;
      if (lastMessageAt && (!readAt || new Date(readAt) < new Date(lastMessageAt))) {
        map.set(conv.id, 1);
      }
    }
    return map;
  }, [conversations, readNotifications, user?.id]);

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

  return (
    <div className="relative bg-background min-h-dvh">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-primary/[0.06] via-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(57,255,20,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(57,255,20,0.18) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />
      <VStack gap={4} className="relative mx-auto max-w-2xl px-4 pb-8 pt-4">
        <HStack gap={2} className="px-2 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={cn(
                'flex-1 min-h-[44px] rounded-full border px-3 py-1.5 text-sm font-semibold transition-all',
                activeTab === 'chats'
                  ? 'border-primary/30 bg-primary text-primary-foreground'
                  : 'border-primary/20 bg-transparent text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground',
              )}
            >
              <MessageSquare className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Chats
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('crew')}
              className={cn(
                'flex-1 min-h-[44px] rounded-full border px-3 py-1.5 text-sm font-semibold transition-all',
                activeTab === 'crew'
                  ? 'border-primary/30 bg-primary text-primary-foreground'
                  : 'border-primary/20 bg-transparent text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground',
              )}
            >
              <Users className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Friends
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={cn(
                'relative flex-1 min-h-[44px] rounded-full border px-3 py-1.5 text-sm font-semibold transition-all',
                activeTab === 'requests'
                  ? 'border-primary/30 bg-primary text-primary-foreground'
                  : 'border-primary/20 bg-transparent text-muted-foreground hover:border-primary/35 hover:bg-primary/[0.04] hover:text-foreground',
              )}
            >
              <UserPlus className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Requests
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
          </HStack>

        {activeTab === 'chats' && (
          <>
            <div className="relative">
              <input
                id="conversation-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats"
                className={cn(
                  'w-full rounded-full border border-primary/20 bg-transparent backdrop-blur-xl pl-4 pr-10 py-3 text-base text-foreground',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30',
                  'transition-all duration-200 shadow-[0_12px_28px_hsl(0_0%_0%/0.18)] hover:border-primary/35',
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/[0.06] transition-colors"
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                </button>
              )}
            </div>

            {isLoading && conversations.length === 0 ? (
              <LoadingState variant="section" message="Loading conversations..." />
            ) : isError ? (
              <ErrorState
                title="Messages failed to load"
                message={error?.message || 'Please refresh and try again.'}
                onRetry={refetch}
              />
            ) : filteredConversations.length === 0 ? (
              <div className="flex min-h-[34vh] flex-1 items-center justify-center animate-fade-up">
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
              <div className="animate-fade-up pb-6" style={{ animationDelay: '100ms' }}>
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
    </div>
  );
}

export default memo(ConversationsPage);
