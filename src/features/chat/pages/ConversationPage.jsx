import React, { useEffect, useRef, useCallback, memo, useState, useMemo } from 'react';
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
import { useViewportContext } from '@/providers/ViewportProvider';
import { useMessagingScrollLock } from '@/hooks/use-messaging-scroll-lock.js';
import { useScrollAuthority } from '@/scroll/scroll-authority.js';
import { useUnifiedScrollRuntime } from '@/scroll/runtime/useUnifiedScrollRuntime.js';
import { createScrollPredictionSmoother } from '@/scroll/runtime/scrollPredictionSmoother.js';
import { createScrollAdaptiveIntelligence } from '@/scroll/runtime/scrollAdaptiveIntelligence.js';
import { useGestureCoordinator, GesturePriority } from '@/gestures/gesture-coordinator.js';

/**
 * iOS detection helper.
 */
function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  );
}

/**
 * Loading skeleton for the conversation header and message list.
 */
function ConversationSkeleton() {
  const { keyboardHeight } = useViewportContext();
  return (
    <div
      className="flex flex-col w-full min-h-0 bg-background relative overflow-hidden"
      style={{
        height: `calc(var(--rr-viewport-height, 100dvh) - 3.5rem - env(safe-area-inset-top, 0px) - 3.5rem - var(--rr-safe-area-bottom, env(safe-area-inset-bottom, 0px)) - ${keyboardHeight}px)`,
      }}
    >
      <HStack align="center" gap={3} className="px-4 py-3 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl shrink-0">
        <Skeleton className="h-10 w-10 rounded-full" />
        <VStack gap={1.5} flex className="min-w-0">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </VStack>
      </HStack>
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-12 rounded-2xl',
              i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'
            )}
          />
        ))}
      </div>
      <div className="p-3 border-t border-white/[0.06] bg-background/80 backdrop-blur-xl shrink-0">
        <Skeleton className="h-12 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Single chat thread page.
 *
 * Displays messages, handles real-time updates, optimistic sends,
 * and auto-scrolls to the bottom on new messages.
 *
 * iOS PWA SCROLL ARCHITECTURE:
 * - The root container is a flex column with an explicit height calculated
 *   from the visual viewport (not 100vh) minus header, nav, safe areas, and
 *   keyboard overlap.
 * - The message list is the ONLY scrollable region (`overflow-y-auto`).
 * - AppLayout main-content scroll is contained on conversation pages to
 *   prevent iOS from scrolling the entire page when the keyboard opens.
 * - Auto-scroll is controlled exclusively by useScrollAuthority.
 *   No component may scroll or decide to scroll outside this hook.
 *
 * UNIFIED SCROLL RUNTIME:
 * - ConversationPage creates the appropriate scroll runtime (native or virtual)
 *   via useUnifiedScrollRuntime and registers it with the authority.
 * - The authority is a pure decision engine with ZERO DOM/virtualization
 *   awareness. All physical scroll operations go through the runtime.
 */
function ConversationPage() {
  const {
    keyboardHeight,
    layoutPhase,
    isLayoutStable,
  } = useViewportContext();

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const scrollContainerRef = useRef(null);
  const virtualApiRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMarkedLengthRef = useRef(0);
  const markedConversationIdRef = useRef(null);
  const prevCountRef = useRef(0);

  const { data: messages = [], isLoading: isMessagesLoading } = useMessages(id);

  const shouldVirtualize = messages.length >= VIRTUALIZATION_THRESHOLD;

  // ── Unified Scroll Runtime ────────────────────────────────────────────────
  // ONE contract for ALL scroll behavior, regardless of native or virtual mode.
  const baseRuntime = useUnifiedScrollRuntime({
    mode: shouldVirtualize ? 'virtual' : 'native',
    refs: {
      containerRef: scrollContainerRef,
      virtualApi: virtualApiRef.current,
    },
  });

  // ── Frame-Level Scroll Prediction Smoother ────────────────────────────────
  // Wraps the base runtime with velocity estimation, hysteresis gates,
  // position projection, and burst coalescing. Authority is unaware.
  const smoothedRuntime = useMemo(() => {
    return createScrollPredictionSmoother(baseRuntime);
  }, [baseRuntime]);

  // ── Adaptive Scroll Intelligence ──────────────────────────────────────────
  // Third layer: dynamic lookahead, adaptive hysteresis, intent confidence.
  // Composes on top of the smoother. Authority is still unaware.
  // Stack: baseRuntime → smoother → adaptive → authority
  const scrollRuntime = useMemo(() => {
    return createScrollAdaptiveIntelligence(smoothedRuntime);
  }, [smoothedRuntime]);

  // ── Scroll Authority — pure decision engine, zero DOM awareness ───────────
  const authority = useScrollAuthority({ layoutPhase, isLayoutStable });

  // Register the SMOOTHED runtime with the authority. The authority delegates
  // all physical scroll operations to this runtime, which transparently adds
  // predictive smoothing before executing.
  useEffect(() => {
    authority.registerRuntime(scrollRuntime);
    return () => {
      scrollRuntime.dispose?.();
    };
  }, [authority, scrollRuntime]);

  // ── Gesture Coordinator — prevents scroll vs swipe-back conflicts ─────────
  const gestures = useGestureCoordinator('chat-scroll', GesturePriority.SCROLL);

  // Contain AppLayout scroll on iOS so only the message list scrolls
  useMessagingScrollLock(isIOS());

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

  // ── Scroll handlers delegated to authority ───────────────────────────────

  const handleScroll = useCallback(() => {
    authority.onScroll();
    setShowScrollButton(authority.isUserScrolledUp);
  }, [authority]);

  const handleScrollToBottom = useCallback(() => {
    authority.scrollToBottom({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, [authority]);

  // ── Auto-scroll on new messages ──────────────────────────────────────────
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isFromSelf = lastMessage?.from_user_id === user?.id;
      authority.onNewMessage({ isFromSelf });
      setShowScrollButton(authority.isUserScrolledUp);
    }
    prevCountRef.current = messages.length;
  }, [messages, authority, user?.id]);

  // ── Deferred scroll when layout stabilizes ───────────────────────────────
  useEffect(() => {
    if (isLayoutStable) {
      authority.onLayoutStable();
      setShowScrollButton(authority.isUserScrolledUp);
    }
  }, [isLayoutStable, authority]);

  // ── Initial scroll to bottom on first load ───────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && prevCountRef.current === 0) {
      authority.scrollToBottom({ behavior: 'auto' });
    }
  }, [messages.length, authority]);

  const isLoading = isConversationLoading || isMessagesLoading;

  if (isLoading) {
    return <ConversationSkeleton />;
  }

  if (conversationError || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-3.5rem)] px-6 text-center max-w-md mx-auto">
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
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full min-h-0 bg-background relative overflow-hidden"
      style={{
        height: `calc(var(--rr-viewport-height, 100dvh) - 3.5rem - env(safe-area-inset-top, 0px) - 3.5rem - var(--rr-safe-area-bottom, env(safe-area-inset-bottom, 0px)) - ${keyboardHeight}px)`,
      }}
    >
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

      {/* Message list — the ONLY scrollable region */}
      {shouldVirtualize ? (
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <VirtualList
            items={messages}
            renderItem={renderMessage}
            estimateSize={52}
            overscan={10}
            gap={8}
            height="100%"
            shouldAutoScroll={!authority.isUserScrolledUp}
            containerRef={scrollContainerRef}
            getItemKey={(index) => messages[index]?.id || index}
            onVirtualApiReady={(api) => { virtualApiRef.current = api; }}
          />
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 scroll-smooth"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          {...gestures.bindScrollContainer()}
          role="log"
          aria-live="polite"
          aria-label="Message history"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="flex flex-col gap-3 min-h-0">
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
            {/* Invisible spacer at bottom for scroll anchoring */}
            <div aria-hidden="true" style={{ height: 1 }} />
          </div>
        </div>
      )}

      {/* Scroll to bottom button — positioned relative to the root flex container */}
      {showScrollButton && (
        <button
          type="button"
          onClick={handleScrollToBottom}
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
        <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive text-center shrink-0">
          Messaging is unavailable because you have blocked this user.
        </div>
      )}

      {/* Input — sits naturally in flex flow, no fixed positioning */}
      <MessageInput
        onSend={handleSend}
        isSending={send.isPending}
        disabled={conversation?.status === 'archived' || isBlocked}
      />
    </div>
  );
}

export default memo(ConversationPage);
