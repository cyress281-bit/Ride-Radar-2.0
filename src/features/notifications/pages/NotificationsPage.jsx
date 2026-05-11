/**
 * Notifications feed page for Ride Radar 2.0.
 *
 * Displays pending connection requests at the top, followed by
 * grouped notifications (Today / Yesterday / Earlier).
 * Uses virtualization for large lists (>25 items).
 */

import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, X, Activity } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { timeAgo } from '@/lib/utils.js';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/features/notifications/hooks/use-notifications.js';
import NotificationItem from '@/features/notifications/components/NotificationItem.jsx';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { useProfileBatch } from '@/features/profile/hooks/use-profile-batch';

// ------------------------------------------------------------------
// Date grouping helpers
// ------------------------------------------------------------------

function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isYesterday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

function groupNotificationsByDate(notifications) {
  const groups = { today: [], yesterday: [], earlier: [] };
  for (const n of notifications) {
    if (isToday(n.created_at)) groups.today.push(n);
    else if (isYesterday(n.created_at)) groups.yesterday.push(n);
    else groups.earlier.push(n);
  }
  return groups;
}

// ------------------------------------------------------------------
// Connection request card
// ------------------------------------------------------------------

function ConnectionRequestCard({ request, fromProfile, onAccept, onDecline, isAccepting }) {
  return (
    <div className="rr-surface rounded-2xl border border-border/60 p-5 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-center gap-3">
        {fromProfile?.avatar_url ? (
          <div className="rr-avatar-ring shrink-0" style={{ padding: '3px' }}>
            <img
              src={fromProfile.avatar_url}
              className="h-10 w-10 rounded-full border border-primary/30 object-cover"
              alt=""
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary font-semibold">
            {fromProfile?.display_name?.[0] || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{fromProfile?.display_name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.created_at)}</div>
        </div>
      </div>

      {request.message && (
        <p className="mb-3 pl-[52px] text-sm text-muted-foreground">
          &ldquo;{request.message}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onAccept(request)}
          disabled={isAccepting}
          className="glow-green-sm rounded-full min-h-[44px]"
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(request)}
          className="rounded-full border-primary/20"
        >
          <X className="mr-1 h-3.5 w-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Notification list sections
// ------------------------------------------------------------------

function NotificationSection({ title, notifications, onMarkRead }) {
  return (
    <div className="mb-6">
      <div className="rr-kicker mb-2 px-1 text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>
    </div>
  );
}

function VirtualNotificationList({ notifications, onMarkRead }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 8,
    getItemKey: (index) => notifications[index]?.id || index,
  });

  return (
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
            <div className="pb-2">
              <NotificationItem
                notification={notifications[virtualRow.index]}
                onMarkRead={onMarkRead}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------

export default function NotificationsPage() {
  const { user } = useSupabaseAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useNotifications(user?.id);

  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markAllRead } = useMarkAllAsRead();

  const handleMarkRead = useCallback(
    (notification) => markRead(notification.id),
    [markRead]
  );

  const handleMarkAllRead = useCallback(() => {
    if (user?.id) markAllRead(user.id);
  }, [markAllRead, user?.id]);

  // Connection requests
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
    () => pendingRequests.map((r) => r.from_user_id),
    [pendingRequests]
  );
  const { getProfile } = useProfileBatch(userIds);

  const acceptConn = useMutation({
    mutationFn: async (req) => {
      const { data: currentReq } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('id', req.id)
        .eq('to_user_id', user.id)
        .single();

      if (currentReq?.status === 'accepted') {
        const conversation = await getOrCreateConversation({
          participantIds: [req.from_user_id, req.to_user_id],
          type: 'connection',
        });
        return conversation.id;
      }

      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', req.id)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

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

  const handleAccept = useCallback(
    (req) => acceptConn.mutate(req),
    [acceptConn]
  );
  const handleDecline = useCallback(
    (req) => declineConn.mutate(req),
    [declineConn]
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasAnything = pendingRequests.length + notifications.length > 0;

  const { today, yesterday, earlier } = groupNotificationsByDate(notifications);
  const shouldVirtualize = notifications.length >= VIRTUALIZATION_THRESHOLD;

  if (notificationsError) {
    return (
      <div className="px-5 pt-5 pb-8">
        <div className="rr-surface-strong rounded-[1.45rem] p-6 text-center">
          <h2 className="font-display mb-2 text-xl font-bold text-destructive">
            Notifications unavailable
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Unable to load notifications. Please try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="rounded-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Header */}
      <div className="rr-surface-strong relative mb-5 overflow-hidden rounded-[1.45rem] p-5">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3">
            <Activity className="h-3.5 w-3.5" /> Activity feed
          </div>
          <h1 className="rr-heading mb-1 text-4xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {unreadCount} unread
              </span>
            ) : (
              'Requests and updates'
            )}
          </p>
        </div>
      </div>

      {/* Mark all as read */}
      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="rounded-full text-xs"
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!hasAnything && !notificationsLoading && (
        <div className="relative mt-4 overflow-hidden rounded-3xl border border-dashed border-primary/25 bg-card/40 py-20 text-center shadow-2xl backdrop-blur-xl">
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute top-16 right-10 left-10 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
          <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_22px_hsl(var(--primary)/0.16)]">
            <Bell className="h-7 w-7 text-primary drop-shadow-[0_0_5px_currentColor]" />
          </div>
          <div className="relative z-10 flex items-center justify-center gap-2 mb-2">
            <RRLogo size="sm" className="opacity-70" />
            <div className="rr-kicker">All caught up</div>
          </div>
          <h3 className="relative z-10 mb-2 font-display text-xl font-bold">Channel clear</h3>
          <p className="relative z-10 mx-auto max-w-xs text-sm text-muted-foreground">
            You&apos;ll see requests and updates here.
          </p>
        </div>
      )}

      {/* Connection requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <div className="rr-kicker mb-2 px-1 text-muted-foreground">Connection requests</div>
          <div className="space-y-3">
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
          </div>
        </div>
      )}

      {/* Notifications by date */}
      {notifications.length > 0 && !shouldVirtualize && (
        <>
          {today.length > 0 && (
            <NotificationSection title="Today" notifications={today} onMarkRead={handleMarkRead} />
          )}
          {yesterday.length > 0 && (
            <NotificationSection title="Yesterday" notifications={yesterday} onMarkRead={handleMarkRead} />
          )}
          {earlier.length > 0 && (
            <NotificationSection title="Earlier" notifications={earlier} onMarkRead={handleMarkRead} />
          )}
        </>
      )}

      {notifications.length > 0 && shouldVirtualize && (
        <div className="mb-6">
          <div className="rr-kicker mb-2 px-1 text-muted-foreground">Activity</div>
          <VirtualNotificationList notifications={notifications} onMarkRead={handleMarkRead} />
        </div>
      )}
    </div>
  );
}
