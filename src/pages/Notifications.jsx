import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, X, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/broadcastUtils';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { cn } from '@/lib/utils';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { prefetchBroadcastDetail, prefetchConversationMessages, prefetchRiderProfile } from '@/lib/query-client';
import { normalizeNotification, normalizeNotifications } from '@/lib/notificationNormalizer';

/**
 * Memoized connection request card - prevents re-render when other requests
 * or notifications change but this request's data remains the same.
 */
const ConnectionRequestCard = memo(function ConnectionRequestCard({ request, fromProfile, onAccept, onDecline, isAccepting }) {
  return (
    <div className="p-5 rounded-2xl rr-surface border border-border/60 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        {fromProfile?.avatar_url ? (
          <div className="rr-avatar-ring shrink-0" style={{ padding: '3px' }}>
            <img src={fromProfile.avatar_url} className="w-10 h-10 rounded-full object-cover border border-primary/30" alt="" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold border border-border/50">
            {fromProfile?.display_name?.[0] || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{fromProfile?.display_name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.created_at)}</div>
        </div>
      </div>
      {request.message && <p className="text-sm text-muted-foreground mb-3 pl-13">&ldquo;{request.message}&rdquo;</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onAccept(request)} disabled={isAccepting} className="rounded-full glow-green-sm">
          <Check className="w-3.5 h-3.5 mr-1" /> Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecline(request)} className="rounded-full border-primary/20">
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
const NotificationItem = memo(function NotificationItem({ notification, targetProfile, onMarkRead }) {
  const href =
    notification.related_entity_type === 'conversation' ? `/messages/${notification.related_entity_id}` :
    notification.related_entity_type === 'broadcast' ? `/broadcast/${notification.related_entity_id}` :
    notification.related_entity_type === 'user_profile' && targetProfile?.user_id ? `/profile/${targetProfile.user_id}` : null;

  const content = (
    <div
      className={cn(
        'p-4 rounded-xl flex items-start gap-3 transition-all duration-200 rr-haptic',
        notification.is_read 
          ? 'bg-card/40 border border-border/30 opacity-70' 
          : 'rr-surface border-l-2 border-l-primary border-y border-r border-border/60 cursor-pointer hover:border-primary/40'
      )}
      onClick={() => { if (!notification.is_read) onMarkRead(notification); }}
    >
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
        notification.is_read ? 'bg-secondary/50' : 'bg-primary/10 border border-primary/20'
      )}>
        <Bell className={cn("w-4 h-4", notification.is_read ? 'text-muted-foreground' : 'text-primary')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">{notification.title}</div>
          {!notification.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse-green" />}
        </div>
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
    } else if (notification.related_entity_type === 'user_profile' && targetProfile?.user_id) {
      prefetchRiderProfile(targetProfile.user_id);
    }
  }, [notification.related_entity_type, notification.related_entity_id, targetProfile?.user_id]);

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
      return normalizeNotifications(data || []);
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
            const next = normalizeNotification(payload.new);
            if (old.some((n) => n.id === next.id)) return old;
            return [next, ...old]; // Prepend (newest first)
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
            old.map((n) => (n.id === payload.new.id ? normalizeNotification(payload.new) : n))
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

  const notificationTargetIds = useMemo(
    () => notifications
      .filter((n) => n.related_entity_type === 'user_profile' && n.related_entity_id)
      .map((n) => n.related_entity_id),
    [notifications]
  );

  const profileIds = useMemo(
    () => Array.from(new Set([...userIds, ...notificationTargetIds])),
    [userIds, notificationTargetIds]
  );

  const { getProfile } = useProfileBatch(profileIds);

  const acceptConn = useMutation({
    mutationFn: async (req) => {
      // Guard: check if already accepted (prevents double-click issues)
      const { data: currentReq } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('id', req.id)
        .eq('to_user_id', user.id)
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
        .eq('to_user_id', user.id)
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
        .eq('id', req.id)
        .eq('to_user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingRequests'] }),
  });

  const markRead = useMutation({
    mutationFn: async (notification) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)
        .eq('user_id', user.id);

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
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Header */}
      <div className="mb-5 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3"><Activity className="h-3.5 w-3.5" /> Activity feed</div>
          <h1 className="rr-heading text-4xl mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" />
                {unreadCount} unread
              </span>
            ) : 'Requests and updates'}
          </p>
        </div>
      </div>

      {!hasAnything && (
        <div className="text-center py-20 rounded-3xl border border-dashed border-primary/25 bg-card/40 backdrop-blur-xl mt-4 shadow-2xl relative overflow-hidden rr-scanline">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-10 right-10 top-16 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30 shadow-[0_0_22px_hsl(var(--primary)/0.16)]">
            <Bell className="w-7 h-7 text-primary drop-shadow-[0_0_5px_currentColor]" />
          </div>
          <div className="rr-kicker mb-2 relative z-10">All caught up</div>
          <h3 className="font-display font-bold text-xl mb-2 relative z-10">Channel clear</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10">You&apos;ll see requests and updates here.</p>
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
          getProfile={getProfile}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <div className="rr-kicker text-muted-foreground mb-2 px-1">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * Virtualized notification list - only renders visible notifications + buffer.
 * Falls back to simple rendering for small lists (<25 items).
 * This is the highest-count list in the app (notifications accumulate over time).
 */
function VirtualNotificationSection({ title, notifications, getProfile, onMarkRead }) {
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
        <div className="rr-kicker text-muted-foreground mb-2 px-1">{title}</div>
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              targetProfile={n.related_entity_type === 'user_profile' ? getProfile(n.related_entity_id) : null}
              onMarkRead={onMarkRead}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="rr-kicker text-muted-foreground mb-2 px-1">{title}</div>
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
                  targetProfile={notifications[virtualRow.index]?.related_entity_type === 'user_profile' ? getProfile(notifications[virtualRow.index].related_entity_id) : null}
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
