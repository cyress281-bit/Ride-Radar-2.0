import React, { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { useMessages, useMarkRead } from '@/features/chat/hooks/use-messages.js';
import { useSendMessage } from '@/features/chat/hooks/use-send-message.js';
import MessageBubble from '@/features/chat/components/MessageBubble.jsx';
import MessageInput from '@/features/chat/components/MessageInput.jsx';
import VirtualList from '@/components/VirtualList.jsx';
import { supabase } from '@/lib/supabase.js';
import { cn } from '@/lib/utils.js';
import { ArrowLeft, Shield } from 'lucide-react';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';

/**
 * Loading skeleton for the conversation header and message list.
 */
function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3 bg-background/90 backdrop-blur">
        <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-20 bg-secondary/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-12 rounded-2xl bg-secondary/40 animate-pulse',
              i % 2 === 0 ? 'w-3/4 ml-auto' : 'w-2/3'
            )}
          />
        ))}
      </div>
      <div className="p-3 border-t border-border/60 bg-background/90 backdrop-blur">
        <div className="h-10 rounded-full bg-secondary animate-pulse" />
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
export default function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const endRef = useRef(null);

  const { data: conversation, isLoading: isConversationLoading } = useQuery({
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

  // Mark as read when messages load
  useEffect(() => {
    if (messages.length > 0 && id) {
      markRead();
    }
  }, [messages.length, id, markRead]);

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
      send.mutate(body);
    },
    [send]
  );

  // Auto-scroll to bottom on new messages
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const shouldVirtualize = messages.length >= VIRTUALIZATION_THRESHOLD;

  const isLoading = isConversationLoading || isMessagesLoading;

  if (isLoading) {
    return <ConversationSkeleton />;
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3 bg-background/90 backdrop-blur shrink-0">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="p-2.5 min-h-[44px] min-w-[44px] hover:bg-secondary/60 rounded-full border border-border/30 transition-colors flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {otherProfile ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {otherProfile.avatar_url ? (
              <div className="relative">
                <img
                  src={otherProfile.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-primary/20"
                  loading="lazy"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm border border-border/50">
                {otherProfile.display_name?.[0] || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {otherProfile.display_name}
              </div>
              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Shield className="w-3 h-3" /> Secure channel
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">Rider</div>
          </div>
        )}
      </div>

      {/* Message list */}
      {shouldVirtualize ? (
        <div className="flex-1 overflow-hidden">
          <VirtualList
            items={messages}
            renderItem={(message) => (
              <MessageBubble
                message={message}
                isMine={message.from_user_id === user?.id}
              />
            )}
            estimateSize={52}
            overscan={10}
            gap={8}
            height="100%"
            scrollToBottom
            getItemKey={(index) => messages[index]?.id || index}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.from_user_id === user?.id}
            />
          ))}
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
