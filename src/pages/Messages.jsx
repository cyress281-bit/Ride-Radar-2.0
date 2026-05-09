import { memo, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useConversations } from '@/hooks/useConversations';
import { MessageCircle, Clock, Radio } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { prefetchConversationMessages } from '@/lib/query-client';

/**
 * Memoized conversation list item - prevents re-render when parent state changes
 * but this specific conversation's data has not changed.
 */
const ConversationItem = memo(function ConversationItem({ conversation, otherProfile, archived }) {
  const hasUnread = conversation.unread_count > 0;
  const isActive = conversation.status === 'active';

  return (
    <Link
      to={`/messages/${conversation.id}`}
      onMouseEnter={() => prefetchConversationMessages(conversation.id)}
      onFocus={() => prefetchConversationMessages(conversation.id)}
      className={cn(
        'flex items-center gap-4 p-4 rounded-[1.35rem] border transition-all duration-300 rr-haptic',
        archived ? 'bg-secondary/15 border-border/30 opacity-70 hover:opacity-100' : 'rr-surface hover:border-primary/35 hover:shadow-[0_18px_55px_-22px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5',
        isActive && !archived && 'border-primary/20'
      )}
    >
      <div className="relative shrink-0">
        {otherProfile?.avatar_url ? (
          <img src={otherProfile.avatar_url} className="w-12 h-12 rounded-full object-cover shrink-0 border border-border/50" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-lg text-foreground shrink-0 border border-border/50">
            {otherProfile?.display_name?.[0] || '?'}
          </div>
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse-green" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm truncate">{otherProfile?.display_name || 'Rider'}</div>
          {hasUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse-green" />}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {conversation.type === 'connection' ? 'Connection thread' : 'Friend'}
          {conversation.last_message_at && ` · ${timeAgo(conversation.last_message_at)}`}
        </div>
      </div>
      {conversation.type === 'connection' && conversation.thread_expires_at && conversation.status === 'active' && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          72h
        </div>
      )}
    </Link>
  );
});

export default function Messages() {
  const { user, profile } = useSupabaseAuth();

  // Fetch conversations with real-time updates!
  const { data: conversations = [], isLoading, isError, error } = useConversations(user?.id);

  // Use shared hooks
  const { blockedIds } = useBlockedProfiles();

  const visibleConversations = useMemo(
    () => conversations.filter((c) => !c.participant_ids?.some((id) => id !== user?.id && blockedIds.has(id))),
    [conversations, user?.id, blockedIds]
  );

  const otherIds = useMemo(
    () => visibleConversations.flatMap(c => c.participant_ids).filter(id => id !== user?.id),
    [visibleConversations, user?.id]
  );

  const { getProfile } = useProfileBatch(otherIds);

  const getOther = useCallback((c) => {
    const otherId = c.participant_ids.find((id) => id !== user?.id);
    return getProfile(otherId);
  }, [user?.id, getProfile]);

  const active = useMemo(
    () => visibleConversations.filter((c) => c.status === 'active'),
    [visibleConversations]
  );

  const archived = useMemo(
    () => visibleConversations.filter((c) => c.status === 'archived'),
    [visibleConversations]
  );

  const loadError = isError ? error : null;

  return (
    <div className="px-5 pt-5 pb-8">
      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Rider comms</div>
          <h1 className="rr-heading text-4xl mb-1">Messages</h1>
          <p className="text-sm text-muted-foreground">Active rider threads and 72-hour signals</p>
        </div>
      </div>

      {loadError ? (
        <div className="text-center py-16 rounded-3xl border border-destructive/30 bg-card/40 backdrop-blur-xl mt-8">
          <h3 className="font-display font-bold text-xl mb-2">Messages failed to load</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{loadError.message || 'Please refresh and try again.'}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary/30 backdrop-blur-md animate-pulse border border-border/50" />)}
        </div>
      ) : visibleConversations.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-primary/25 bg-card/40 backdrop-blur-xl mt-4 shadow-2xl relative overflow-hidden rr-scanline">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-10 right-10 top-16 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30 shadow-[0_0_22px_hsl(var(--primary)/0.16)] overflow-hidden">
            <span className="absolute inset-3 rounded-full border border-primary/15 animate-pulse" />
            <MessageCircle className="w-7 h-7 text-primary drop-shadow-[0_0_5px_currentColor]" />
            <Radio className="absolute right-2 bottom-2 w-3.5 h-3.5 text-primary/70" />
          </div>
          <div className="rr-kicker mb-2 relative z-10">No open comms</div>
          <h3 className="font-display font-bold text-xl mb-2 relative z-10">Channel is clear</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10 font-medium">Connect on a broadcast or add a rider to open a 72-hour signal thread.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <Section title="Active" items={active} getOther={getOther} />
          )}
          {archived.length > 0 && (
            <Section title="Archived" items={archived} getOther={getOther} archived />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Virtualized conversation section - only renders visible items + buffer.
 * With 100+ conversations, this reduces DOM nodes from O(n) to O(visible+overscan).
 * Falls back to simple rendering for small lists (<20 items) to avoid overhead.
 */
function Section({ title, items, getOther, archived }) {
  const parentRef = useRef(null);
  const VIRTUAL_THRESHOLD = 20;
  const shouldVirtualize = items.length >= VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // ~80px per conversation item
    overscan: 5,
    getItemKey: (index) => items[index]?.id || index,
  });

  if (!shouldVirtualize) {
    // Small list: render normally (no virtualization overhead)
    return (
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
        <div className="space-y-2">
          {items.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              otherProfile={getOther(c)}
              archived={archived}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 16rem)', contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
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
              <div style={{ paddingBottom: '8px' }}>
                <ConversationItem
                  conversation={items[virtualRow.index]}
                  otherProfile={getOther(items[virtualRow.index])}
                  archived={archived}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
