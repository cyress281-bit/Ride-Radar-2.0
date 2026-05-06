import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Clock } from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import { cn } from '@/lib/utils';
import { getProfileByIdSafe } from '@/lib/profileLookup';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { prefetchRiderProfile } from '@/lib/query-client';

/**
 * Memoized message bubble - prevents all messages from re-rendering
 * when a new message arrives (only the new message renders).
 * Critical for conversations with 50+ messages.
 */
const MessageBubble = memo(function MessageBubble({ body, isMine }) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[75%] px-3.5 py-2 rounded-2xl text-[14.5px] leading-relaxed',
        isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-secondary-foreground rounded-bl-md'
      )}>
        {body}
      </div>
    </div>
  );
});

export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const { data: conversation } = useQuery({
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
    staleTime: 60000, // 1 min - metadata doesn't change often
  });

  const { data: messages = [] } = useConversationMessages(id);

  const otherId = conversation?.participant_ids?.find((p) => p !== user?.id);
  const { data: other } = useQuery({
    queryKey: ['profile', otherId],
    enabled: !!otherId,
    queryFn: async () => await getProfileByIdSafe(otherId),
    staleTime: 5 * 60 * 1000, // 5 min - profiles are stable
  });

  // Use shared hook for block checking
  const { isBlocked } = useBlockedProfiles();
  const isOtherBlocked = isBlocked(otherId);

  // Virtual scrolling for messages - critical for conversations with 100+ messages.
  // Only renders visible messages + overscan buffer, reducing DOM from O(n) to O(visible).
  const messagesParentRef = useRef(null);
  const VIRTUAL_MESSAGE_THRESHOLD = 30;
  const shouldVirtualizeMessages = messages.length >= VIRTUAL_MESSAGE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualizeMessages ? messages.length : 0,
    getScrollElement: () => messagesParentRef.current,
    estimateSize: () => 52, // ~52px per message bubble (varies with content)
    overscan: 10, // Higher overscan for chat to avoid flicker during fast scroll
    getItemKey: (index) => messages[index]?.id || index,
  });

  // Scroll to bottom when new messages arrive
  const prevMessageCount = useRef(messages.length);
  useEffect(() => {
    if (shouldVirtualizeMessages) {
      if (messages.length > 0 && messages.length >= prevMessageCount.current) {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
      }
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, shouldVirtualizeMessages, virtualizer]);

  const send = useSendMessage(id);

  // Stable callback - prevents Input re-render from creating new function ref each render
  const handleSend = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    send.mutate(body, {
      onSuccess: () => setText(''),
    });
  }, [text, send]);

  const isArchived = conversation?.status === 'archived';
  const expiresAt = conversation?.thread_expires_at;
  const hoursLeft = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 3600000)) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3 bg-background/90 backdrop-blur">
        <button onClick={() => navigate('/messages')} className="p-1 hover:bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {other && (
          <Link
            to={`/profile/${other.user_id}`}
            onMouseEnter={() => prefetchRiderProfile(other.user_id)}
            onFocus={() => prefetchRiderProfile(other.user_id)}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            {other.avatar_url ? (
              <img src={other.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                {other.display_name?.[0] || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{other.display_name}</div>
              <div className="text-xs text-muted-foreground truncate">Rider</div>
            </div>
          </Link>
        )}
        {other && (
          <SafetyActions targetType="conversation" targetId={id} targetProfileId={other.user_id} compact />
        )}
        {conversation?.type === 'connection' && !isArchived && hoursLeft !== null && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" /> {hoursLeft}h
          </div>
        )}
      </div>

      {shouldVirtualizeMessages ? (
        /* Virtualized message list - for conversations with 30+ messages */
        <div ref={messagesParentRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ contain: 'strict' }}>
          {conversation?.type === 'connection' && (
            <div className="text-center text-[11px] text-muted-foreground pb-2">
              This thread expires 72 hours after the last message.
            </div>
          )}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const m = messages[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-2">
                    <MessageBubble body={m.body} isMine={m.from_user_id === user?.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Standard rendering for short conversations (<30 messages) */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {conversation?.type === 'connection' && (
            <div className="text-center text-[11px] text-muted-foreground pb-2">
              This thread expires 72 hours after the last message.
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} body={m.body} isMine={m.from_user_id === user?.id} />
          ))}
          <div ref={endRef} />
        </div>
      )}

      <div className="p-3 border-t border-border/60 bg-background/90 backdrop-blur">
        {isArchived ? (
          <div className="text-center text-sm text-muted-foreground py-2">This conversation is archived.</div>
        ) : isOtherBlocked ? (
          <div className="text-center text-sm text-muted-foreground py-2">You blocked this rider. Messaging is disabled.</div>
        ) : send.isError ? (
          <div className="text-center text-sm text-destructive py-2">{send.error?.message || 'Failed to send message'}</div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Message..."
              className="rounded-full"
            />
            <Button onClick={handleSend} disabled={send.isPending || !text.trim()} size="icon" className="rounded-full shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}