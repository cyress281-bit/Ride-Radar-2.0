import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/broadcastUtils';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { cn } from '@/lib/utils';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { prefetchBroadcastDetail, prefetchConversationMessages, prefetchRiderProfile } from '@/lib/query-client';

/**
 * Memoized connection request card - prevents re-render when other requests
 * or notifications change but this request's data remains the same.
 */
const ConnectionRequestCard = memo(function ConnectionRequestCard({ request, fromProfile, onAccept, onDecline, isAccepting }) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        {fromProfile?.avatar_url ? <img src={fromProfile.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" /> :
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold">{fromProfile?.display_name?.[0] || '?'}</div>}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{fromProfile?.display_name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.created_at)}</div>
        </div>
      </div>
      {request.message && <p className="text-sm text-muted-foreground mb-3 pl-12">"{request.message}"</p>}
      <div className="flex gap-2 pl-12">
        <Button size="sm" onClick={() => onAccept(request)} disabled={isAccepting} className="rounded-full">
          <Check className="w-3.5 h-3.5 mr-1" /> Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecline(request)} className="rounded-full">
          <X className="w-3.5 h-3.5 mr-1" /> Decline
        </Button>
      </div>
    </div>
  );
});

/**
 * Memoized notification activity item - prevents re-render when unrelated
 * notifications change or parent state updates.
 */
const NotificationItem = memo(function NotificationItem({ notification, onMarkRead }) {
  const href =
    notification.related_entity_type === 'conversation' ? `/messages/${notification.related_entity_id}` :
    notification.related_entity_type === 'broadcast' ? `/broadcast/${notification.related_entity_id}` :
    notification.related_entity_type === 'user_profile' ? `/profile/${notification.related_entity_id}` : null;

  const content = (
    <div
      className={cn('p-3 rounded-xl flex items-start gap-3 transition', notification.is_read ? 'bg-card/50' : 'bg-card border border-border/60 cursor-pointer')}
      onClick={() => { if (!notification.is_read) onMarkRead(notification); }}
    >
      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{notification.title}</div>
        {notification.body && <div className="text-sm text-muted-foreground line-clamp-2">{notification.body}</div>}
        <div className="text-[11px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</div>
      </div>
    </div>
  );

  // Prefetch the linked resource on hover for instant navigation
  const handlePrefetch = useCallback(() => {
    if (!notification.related_entity_id) return;
    if (notification.related_entity_type === 'conversation') {
      prefetchConversationMessages(notification.related_entity_id);
    } else if (notification.related_entity_type === 'broadcast') {
      prefetchBroadcastDetail(notification.related_entity_id);
    } else if (notification.related_entity_type === 'user_profile') {
      prefetchRiderProfile(notification.related_entity_id);
    }
  }, [notification.related_entity_type, notification.related_entity_id]);

  return href ? (
    <Link to={href} onMouseEnter={handlePrefetch} onFocus={handlePrefetch}>{content}</Link>
  ) : (
    <div>{content}</div>
  );
});

export default function Notifications() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // 1 min - real-time handles freshness
    refetchOnWindowFocus: true,
    // REMOVED: refetchInterval: 30000 - replaced by real-time subscription below
  });

  // Real-time subscription replaces 30s polling - zero unnecessary requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Append new notification directly to cache (no full refetch)
          qc.setQueryData(['notifications', user.id], (old = []) => {
            if (old.some((n) => n.id === payload.new.id)) return old;
            return [payload.new, ...old]; // Prepend (newest first)
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update notification in-place (e.g., marked as read from another device)
          qc.setQueryData(['notifications', user.id], (old = []) =>
            old.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pendingRequests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const userIds = useMemo(
    () => pendingRequests.map(r => r.from_user_id),
    [pendingRequests]
  );

  const { getProfile } = useProfileBatch(userIds);

  const acceptConn = useMutation({
    mutationFn: async (req) => {
      // Guard: check if already accepted (prevents double-click issues)
      const { data: currentReq } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('id', req.id)
        .single();

      if (currentReq?.status === 'accepted') {
        // Already accepted - just find the existing conversation
        const conversation = await getOrCreateConversation({
          participantIds: [req.from_user_id, req.to_user_id],
          type: 'connection',
        });
        return conversation.id;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', req.id)
        .eq('status', 'pending'); // Optimistic lock: only update if still pending

      if (updateError) throw updateError;

      // Atomic get-or-create conversation: eliminates TOCTOU race condition
      // Even if both users somehow trigger acceptance simultaneously,
      // only one conversation will be created
      const conversation = await getOrCreateConversation({
        participantIds: [req.from_user_id, req.to_user_id],
        type: 'connection',
        threadExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      });

      return conversation.id;
    },
    onSuccess: (convoId) => {
      qc.invalidateQueries({ queryKey: ['pendingRequests'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
  });

  const declineConn = useMutation({
    mutationFn: async (req) => {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'declined' })
        .eq('id', req.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingRequests'] }),
  });

  const markRead = useMutation({
    mutationFn: async (notification) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      if (error) throw error;
    },
    onMutate: async (notification) => {
      const queryKey = ['notifications', user?.id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (current = []) =>
        current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)
      );
      return { previous, queryKey };
    },
    onError: (_error, _notification, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSettled: (_data, _error, _notification, context) => {
      qc.invalidateQueries({ queryKey: context?.queryKey || ['notifications', user?.id] });
    },
  });

  // Stable callback references for memoized children
  const handleAccept = useCallback((req) => acceptConn.mutate(req), [acceptConn]);
  const handleDecline = useCallback((req) => declineConn.mutate(req), [declineConn]);
  const handleMarkRead = useCallback((n) => markRead.mutate(n), [markRead]);

  const hasAnything = pendingRequests.length + notifications.length > 0;

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Notifications</h1>
      <p className="text-sm text-muted-foreground mb-6">Requests and updates</p>

      {!hasAnything && (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-secondary/20 mt-8">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-5 border border-border/50">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">All caught up</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">You'll see requests and updates here.</p>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <Section title="Connection requests">
          {pendingRequests.map((r) => (
            <ConnectionRequestCard
              key={r.id}
              request={r}
              fromProfile={getProfile(r.from_user_id)}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isAccepting={acceptConn.isPending}
            />
          ))}
        </Section>
      )}

      {notifications.length > 0 && (
        <VirtualNotificationSection
          title="Activity"
          notifications={notifications}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/**
 * Virtualized notification list - only renders visible notifications + buffer.
 * Falls back to simple rendering for small lists (<25 items).
 * This is the highest-count list in the app (notifications accumulate over time).
 */
function VirtualNotificationSection({ title, notifications, onMarkRead }) {
  const parentRef = useRef(null);
  const VIRTUAL_THRESHOLD = 25;
  const shouldVirtualize = notifications.length >= VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? notifications.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // ~72px per notification item
    overscan: 8,
    getItemKey: (index) => notifications[index]?.id || index,
  });

  if (!shouldVirtualize) {
    return (
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 18rem)', contain: 'strict' }}
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
                <NotificationItem
                  notification={notifications[virtualRow.index]}
                  onMarkRead={onMarkRead}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}