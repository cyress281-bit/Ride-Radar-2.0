import React, { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useMessages, useMarkRead } from '@/features/chat/hooks/use-messages.js';
import { useSendMessage } from '@/features/chat/hooks/use-send-message.js';
import MessageBubble from '@/features/chat/components/MessageBubble.jsx';
import MessageInput from '@/features/chat/components/MessageInput.jsx';
import VirtualList from '@/components/shared/VirtualList.jsx';
import { supabase } from '@/lib/supabase.js';
import { cn } from '@/lib/utils.js';
import { ArrowLeft, Shield, MoreVertical, ChevronDown, Ban, Flag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCreateBlock } from '@/features/safety/hooks/use-blocks.js';
import { useCreateReport } from '@/features/safety/hooks/use-reports.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { toast } from 'sonner';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the conversation header and message list.
 */
function ConversationSkeleton() {
  return (
    <VStack className="h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-3.5rem-var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px)))] min-h-0 overflow-hidden">
      <HStack align="center" gap={3} className="px-4 py-3 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl shrink-0">
        <Skeleton className="h-10 w-10 rounded-full" />
        <VStack gap={1.5} flex={1}>
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </VStack>
      </HStack>
      <VStack flex className="px-4 py-4 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-12 rounded-2xl',
              i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'
            )}
          />
        ))}
      </VStack>
      <div className="p-3 border-t border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <Skeleton className="h-12 rounded-full" />
      </div>
    </VStack>
  );
}

/**
 * Single chat thread page.
 *
 * Displays messages, handles real-time updates, optimistic sends,
 * and auto-scrolls to the bottom on new messages.
 */
function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const endRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMarkedLengthRef = useRef(0);
  const markedConversationIdRef = useRef(null);

  const {
    data: conversation,
    isLoading: isConversationLoading,
    error: conversationError,
  } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useMessages(id);
  const send = useSendMessage(id);
  const { mutate: markRead } = useMarkRead(id);
  const { mutate: blockUser } = useCreateBlock();
  const { mutate: reportUser } = useCreateReport();

  // Mark as read immediately on conversation open, regardless of message count or sender
  useEffect(() => {
    if (!id || !user?.id) return;
    if (markedConversationIdRef.current === id) return;
    markedConversationIdRef.current = id;
    markRead();
  }, [id, user?.id, markRead]);

  // Mark as read when new messages from the other user arrive while the thread is open
  useEffect(() => {
    if (!id || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const hasNewMessages = messages.length > lastMarkedLengthRef.current;
    if (hasNewMessages && lastMessage && lastMessage.from_user_id !== user?.id) {
      markRead();
    }
    lastMarkedLengthRef.current = messages.length;
  }, [messages, id, user?.id, markRead]);

  const otherId = conversation?.participant_ids?.find((p) => p !== user?.id);

  const { blockedIds } = useBlockedIds();
  const isBlocked = !!otherId && blockedIds.has(otherId);

  const { data: otherProfile } = useQuery({
    queryKey: ['profile', otherId],
    enabled: !!otherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', otherId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const handleBlockUser = useCallback(() => {
    if (!otherId || !user?.id) return;
    blockUser(
      { blocker_user_id: user.id, blocked_user_id: otherId },
      {
        onError: (error) => {
          toast.error('Block failed', {
            description: error?.message || 'Could not block this user. Please try again.',
          });
        },
      }
    );
  }, [otherId, user?.id, blockUser]);

  const handleReportUser = useCallback(() => {
    if (!otherId || !user?.id) return;
    reportUser(
      {
        reporter_user_id: user.id,
        target_type: 'user',
        target_id: otherId,
        target_user_id: otherId,
        reason: 'inappropriate_behavior',
      },
      {
        onError: (error) => {
          toast.error('Report failed', {
            description: error?.message || 'Could not submit report. Please try again.',
          });
        },
      }
    );
  }, [otherId, user?.id, reportUser]);

  const handleSend = useCallback(
    ({ body, imageFile } = {}) => {
      if (send.isPending) return;
      if (isBlocked) return;
      const _tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      send.mutate({ body, imageFile, _tempId });
    },
    [send, isBlocked]
  );

  const renderMessage = useCallback(
    (message) => (
      <MessageBubble
        message={message}
        isMine={message.from_user_id === user?.id}
        onRetry={message._failed ? () => send.mutate({ body: message.body, _tempId: message.id }) : undefined}
      />
    ),
    [user?.id, send]
  );

  // Auto-scroll to bottom on new messages
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Track scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const shouldVirtualize = messages.length >= VIRTUALIZATION_THRESHOLD;

  const isLoading = isConversationLoading || isMessagesLoading;

  if (isLoading) {
    return <ConversationSkeleton />;
  }

  if (conversationError || !conversation) {
    return (
      <VStack align="center" justify="center" gap={4} className="h-[calc(100dvh-3.5rem)] px-6 text-center max-w-md mx-auto">
        <Text variant="h3" color="default">Conversation not found</Text>
        <Text variant="bodySm" color="muted">
          {conversationError?.message || 'This conversation may have been deleted or you do not have access.'}
        </Text>
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className={cn(
            'px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold',
            'hover:bg-primary/90 transition-colors pressable animate-glow-pulse'
          )}
        >
          Back to messages
        </button>
      </VStack>
    );
  }

  return (
    <VStack className="w-full h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px)-3.5rem-var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px)))] min-h-0 bg-background relative overflow-hidden">
      {/* Header */}
      <HStack
        align="center"
        gap={3}
        className="px-4 py-3 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl shrink-0 z-20"
      >
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className={cn(
            'p-2.5 min-h-[44px] min-w-[44px] hover:bg-surface-elevated rounded-full',
            'border border-white/[0.06] transition-colors flex items-center justify-center pressable',
            'shadow-depth-1'
          )}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {otherProfile && otherId ? (
          <HStack
            align="center"
            gap={3}
            flex
            className="min-w-0 pressable cursor-pointer"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/profile/${otherId}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`/profile/${otherId}`);
            }}
          >
            <AvatarWithStatus
              url={otherProfile.avatar_url}
              name={otherProfile.display_name}
              status={otherProfile.is_online ? 'online' : 'offline'}
              size="md"
            />
            <VStack flex className="min-w-0">
              <Text variant="bodySm" className="font-semibold truncate">
                {otherProfile.display_name}
              </Text>
              <HStack align="center" gap={1}>
                <Shield className="w-3 h-3 text-brand-radar" />
                <Text variant="micro" color="muted">Secure channel</Text>
              </HStack>
            </VStack>
          </HStack>
        ) : (
          <VStack flex className="min-w-0">
            <Text variant="bodySm" className="font-semibold truncate">Rider</Text>
          </VStack>
        )}

        {/* Message actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'p-2.5 min-h-[44px] min-w-[44px] hover:bg-surface-elevated rounded-full',
                'border border-white/[0.06] transition-colors flex items-center justify-center pressable',
                'shadow-depth-1'
              )}
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5 text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem
              onClick={handleBlockUser}
              className="text-muted-foreground focus:text-foreground cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              Block user
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleReportUser}
              className="text-muted-foreground focus:text-foreground cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HStack>

      {/* Message list */}
      {shouldVirtualize ? (
        <div className="flex-1 overflow-hidden">
          <VirtualList
            items={messages}
            renderItem={renderMessage}
            estimateSize={52}
            overscan={10}
            gap={8}
            height="100%"
            scrollToBottom
            getItemKey={(index) => messages[index]?.id || index}
          />
        </div>
      ) : (
        <VStack
          gap={3}
          flex
          className="overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] overscroll-contain min-h-0 min-w-0 px-4 py-4 scroll-smooth"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="Message history"
        >
          {messages.map((message, index) => {
            const showTimestamp = index === 0 || (
              new Date(message.created_at).getTime() -
              new Date(messages[index - 1].created_at).getTime() > 15 * 60 * 1000
            );
            return (
              <React.Fragment key={message.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-1 rounded-full bg-surface-elevated/80 border border-white/[0.04] text-[10px] text-muted-foreground font-mono-data tracking-wide">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isMine={message.from_user_id === user?.id}
                  onRetry={message._failed ? () => send.mutate({ body: message.body, _tempId: message.id }) : undefined}
                />
              </React.Fragment>
            );
          })}
          <div ref={endRef} />
        </VStack>
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-24 left-1/2 -translate-x-1/2 z-30',
            'h-11 w-11 rounded-full flex items-center justify-center',
            'bg-surface-elevated/90 backdrop-blur-xl border border-white/[0.08] text-primary',
            'shadow-depth-3 hover:bg-surface-elevated transition-all pressable animate-fade-up'
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Block notice */}
      {isBlocked && (
        <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center">
          Messaging is unavailable because you have blocked this user.
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        isSending={send.isPending}
        disabled={conversation?.status === 'archived' || isBlocked}
      />
    </VStack>
  );
}

export default memo(ConversationPage);
