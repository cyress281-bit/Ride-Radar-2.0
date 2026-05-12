import React, { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useMessages, useMarkRead } from '@/features/chat/hooks/use-messages.js';
import { useSendMessage } from '@/features/chat/hooks/use-send-message.js';
import MessageBubble from '@/features/chat/components/MessageBubble.jsx';
import MessageInput from '@/features/chat/components/MessageInput.jsx';
import VirtualList from '@/components/shared/VirtualList.jsx';
import { supabase } from '@/lib/supabase.js';
import { cn } from '@/lib/utils.js';
import { ArrowLeft, Shield } from 'lucide-react';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';

/**
 * Typing indicator — bouncing dots animation.
 */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-1 px-4 py-2.5 rounded-[18px] rounded-bl-[4px] bg-surface-elevated border border-border/30">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Loading skeleton for the conversation header and message list.
 */
function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3 bg-background/80 backdrop-blur-xl">
        <div className="h-9 w-9 rounded-full bg-surface animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-surface rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-12 rounded-2xl bg-surface/60 animate-pulse',
              i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'
            )}
          />
        ))}
      </div>
      <div className="p-3 border-t border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="h-10 rounded-full bg-surface animate-pulse" />
      </div>
    </div>
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
  const [isTyping, setIsTyping] = useState(false);
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

  const shouldVirtualize = messages.length >= VIRTUALIZATION_THRESHOLD;

  const isLoading = isConversationLoading || isMessagesLoading;

  if (isLoading) {
    return <ConversationSkeleton />;
  }

  if (conversationError || !conversation) {
    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] items-center justify-center px-6 text-center max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Conversation not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {conversationError?.message || 'This conversation may have been deleted or you do not have access.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="px-4 py-2 rounded-full bg-brand-kawasaki text-primary-foreground text-sm font-medium hover:bg-brand-kawasaki/90 transition-colors active:scale-95"
        >
          Back to messages
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3 bg-background/80 backdrop-blur-xl shrink-0">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-surface-elevated rounded-full border border-border/30 transition-colors flex items-center justify-center active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {otherProfile ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {otherProfile.avatar_url ? (
              <div className="relative">
                <img
                  src={otherProfile.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-brand-kawasaki/30"
                  loading="lazy"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-kawasaki border-2 border-background" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center font-semibold text-sm text-foreground border border-border/50">
                {otherProfile.display_name?.[0] || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate text-foreground">
                {otherProfile.display_name}
              </div>
              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Shield className="w-3 h-3 text-brand-yamaha" /> Secure channel
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate text-foreground">Rider</div>
          </div>
        )}
      </div>

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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.from_user_id === user?.id}
            />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={endRef} />
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        isSending={send.isPending}
        disabled={conversation?.status === 'archived'}
      />
    </div>
  );
}

export default memo(ConversationPage);
