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
import { ArrowLeft, Shield, MoreVertical, ChevronDown } from 'lucide-react';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Typing indicator — animated dots with neon green pulse.
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm bg-surface-elevated border border-white/[0.06] shadow-depth-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: '800ms' }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the conversation header and message list.
 */
function ConversationSkeleton() {
  return (
    <VStack className="h-[calc(100dvh-3.5rem)]">
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
  const [isTyping, setIsTyping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMarkedLengthRef = useRef(0);

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

  // Mark as read when viewing conversation and when new messages arrive from others
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

  const handleSend = useCallback(
    (body) => {
      if (send.isPending) return;
      send.mutate(body);
      // Demo: simulate typing indicator from other user after a short delay
      setTimeout(() => setIsTyping(true), 800);
      setTimeout(() => setIsTyping(false), 3000);
    },
    [send]
  );

  const renderMessage = useCallback(
    (message) => (
      <MessageBubble
        message={message}
        isMine={message.from_user_id === user?.id}
      />
    ),
    [user?.id]
  );

  // Auto-scroll to bottom on new messages or typing indicator
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current || isTyping) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isTyping]);

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
    <VStack className="h-[calc(100dvh-3.5rem)] bg-background relative">
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

        {otherProfile ? (
          <HStack align="center" gap={3} flex className="min-w-0">
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
        <button
          type="button"
          onClick={() => setShowActions((s) => !s)}
          className={cn(
            'p-2.5 min-h-[44px] min-w-[44px] hover:bg-surface-elevated rounded-full',
            'border border-white/[0.06] transition-colors flex items-center justify-center pressable relative',
            'shadow-depth-1'
          )}
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5 text-foreground" />
        </button>

        {/* Action menu */}
        {showActions && (
          <div className="absolute top-16 right-4 z-50 bg-surface/95 backdrop-blur-xl border border-white/[0.06] p-2 min-w-[160px] rounded-xl shadow-depth-4 animate-scale-in">
            <button
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
              onClick={() => setShowActions(false)}
            >
              Block user
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
              onClick={() => setShowActions(false)}
            >
              Report
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-brand-emergency hover:bg-brand-emergency/10 rounded-lg transition-colors"
              onClick={() => setShowActions(false)}
            >
              Delete conversation
            </button>
          </div>
        )}
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
          className="overflow-y-auto px-4 py-4 scroll-smooth"
          ref={scrollContainerRef}
          onScroll={handleScroll}
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
                />
              </React.Fragment>
            );
          })}
          {isTyping && <TypingIndicator />}
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
            'h-9 w-9 rounded-full flex items-center justify-center',
            'bg-surface-elevated/90 backdrop-blur-xl border border-white/[0.08] text-primary',
            'shadow-depth-3 hover:bg-surface-elevated transition-all pressable animate-fade-up'
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        isSending={send.isPending}
        disabled={conversation?.status === 'archived'}
      />
    </VStack>
  );
}

export default memo(ConversationPage);
