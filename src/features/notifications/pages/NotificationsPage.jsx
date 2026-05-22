/**
 * Notifications feed page for Ride Radar 2.0.
 *
 * Displays pending connection requests at the top, followed by
 * grouped notifications (Today / Yesterday / Earlier).
 * Uses virtualization for large lists (>25 items).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Activity, Bell, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import RRLogo from '@/components/RRLogo';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/features/notifications/hooks/use-notifications.js';
import {
  useConnectionRequests,
  useAcceptConnectionRequest,
  useDeclineConnectionRequest,
} from '@/features/connections/hooks/use-connection-requests.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { groupNotificationsByDate } from '@/lib/date-grouping.js';
import VirtualList from '@/components/shared/VirtualList';
import NotificationItem from '@/features/notifications/components/NotificationItem.jsx';
import ConnectionRequestCard from '@/features/notifications/components/ConnectionRequestCard.jsx';
import NotificationSection from '@/features/notifications/components/NotificationSection.jsx';

// ------------------------------------------------------------------
// Virtualized notification list
// ------------------------------------------------------------------

function VirtualNotificationList({ notifications, onMarkRead, onDelete }) {
  const renderItem = useCallback(
    (n) => <NotificationItem notification={n} onMarkRead={onMarkRead} onDelete={onDelete} />,
    [onMarkRead, onDelete]
  );
  const getItemKey = useCallback((index) => notifications[index]?.id ?? index, [notifications]);

  return (
    <VirtualList
      items={notifications}
      renderItem={renderItem}
      estimateSize={80}
      overscan={8}
      gap={8}
      height="calc(100dvh - 18rem)"
      getItemKey={getItemKey}
    />
  );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function NotificationHeader({ unreadCount }) {
  return (
    <div className="relative mb-3 overflow-hidden rounded-[20px] border border-primary/10 bg-surface/80 backdrop-blur-xl p-4">
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/10" />
      <div className="absolute bottom-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          <Activity className="h-3.5 w-3.5 text-primary" /> Activity feed
        </div>
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground rr-heading">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
              <span className="text-primary font-medium">{unreadCount} unread</span>
            </span>
          ) : (
            'Requests and updates'
          )}
        </p>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[20px] border border-primary/10 bg-surface/60 p-5 space-y-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-muted" />
              <Skeleton className="h-3 w-20 bg-muted" />
            </div>
          </div>
          <Skeleton className="h-8 w-full bg-muted" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full bg-muted" />
            <Skeleton className="h-10 w-20 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationEmptyState() {
  return (
    <div className="relative mt-4 overflow-hidden rounded-[20px] border border-dashed border-primary/20 bg-surface/60 py-20 text-center backdrop-blur-sm">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-16 right-10 left-10 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        <Bell className="h-7 w-7 text-primary" />
      </div>
      <div className="relative z-10 flex items-center justify-center gap-2 mb-2">
        <RRLogo size="sm" className="opacity-70" />
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">All caught up</div>
      </div>
      <h3 className="relative z-10 mb-2 text-xl font-bold text-foreground">Channel clear</h3>
      <p className="relative z-10 mx-auto max-w-xs text-sm text-muted-foreground">
        You&apos;ll see requests and updates here.
      </p>
    </div>
  );
}

function ErrorState() {
  const queryClient = useQueryClient();
  return (
    <div className="px-5 pt-5 pb-8">
      <div className="rounded-[20px] border border-primary/10 bg-surface/80 p-6 text-center backdrop-blur-xl">
        <WifiOff className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h2 className="mb-2 text-xl font-bold text-brand-emergency">Signal lost</h2>
        <p className="mb-4 text-sm text-muted-foreground">Unable to load notifications. Please try again.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })} variant="outline" className="rounded-full border-primary/20 bg-background text-foreground hover:bg-surface hover:text-foreground">
          Retry
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------

export default function NotificationsPage() {
  const { user } = useAuthState();
  const navigate = useNavigate();

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useNotifications(user?.id);

  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markAllRead } = useMarkAllAsRead();
  const { mutate: deleteNotif } = useDeleteNotification();

  const handleMarkRead = useCallback((notification) => markRead(notification.id), [markRead]);
  const handleMarkAllRead = useCallback(() => {
    if (user?.id) markAllRead(user.id);
  }, [markAllRead, user?.id]);
  const handleDelete = useCallback((notification) => deleteNotif(notification.id), [deleteNotif]);

  // Connection requests (use shared hook)
  const { data: pendingRequests = [] } = useConnectionRequests();
  const { mutate: acceptConn, isPending: isAccepting } = useAcceptConnectionRequest();
  const { mutate: declineConn, isPending: isDeclining } = useDeclineConnectionRequest();

  const userIds = useMemo(() => pendingRequests.map((r) => r.from_user_id), [pendingRequests]);
  const { getProfile } = useProfileBatch(userIds);

  const handleAccept = useCallback(
    (req) => {
      acceptConn(req.id, {
        onSuccess: (conversation) => {
          navigate(`/messages/${conversation.id}`);
        },
      });
    },
    [acceptConn, navigate]
  );

  const handleDecline = useCallback(
    (req) => declineConn(req.id),
    [declineConn]
  );

  const visibleNotifications = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return notifications.filter((n) => new Date(n.created_at).getTime() > cutoff);
  }, [notifications]);

  const unreadCount = visibleNotifications.filter((n) => !(n.is_read || n.isRead)).length;
  const hasAnything = pendingRequests.length + visibleNotifications.length > 0;

  const { today, yesterday, earlier } = groupNotificationsByDate(visibleNotifications);
  const shouldVirtualize = visibleNotifications.length >= VIRTUALIZATION_THRESHOLD;

  if (notificationsError) return <ErrorState />;

  return (
    <div className="px-5 pt-3 pb-8 bg-background min-h-dvh">
      <NotificationHeader unreadCount={unreadCount} />

      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="min-h-[44px] rounded-full text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/40">
            <Check className="mr-1 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      )}

      {notificationsLoading && notifications.length === 0 && <NotificationSkeleton />}

      {!hasAnything && !notificationsLoading && <NotificationEmptyState />}

      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-primary">Connection requests</div>
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <ConnectionRequestCard
                key={r.id}
                request={r}
                fromProfile={getProfile(r.from_user_id)}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isAccepting={isAccepting}
                isDeclining={isDeclining}
              />
            ))}
          </div>
        </div>
      )}

      {visibleNotifications.length > 0 && !shouldVirtualize && (
        <>
          {today.length > 0 && (
            <NotificationSection title="Today" notifications={today} onMarkRead={handleMarkRead} onDelete={handleDelete} />
          )}
          {yesterday.length > 0 && (
            <NotificationSection title="Yesterday" notifications={yesterday} onMarkRead={handleMarkRead} onDelete={handleDelete} />
          )}
          {earlier.length > 0 && (
            <NotificationSection title="Earlier" notifications={earlier} onMarkRead={handleMarkRead} onDelete={handleDelete} />
          )}
        </>
      )}

      {visibleNotifications.length > 0 && shouldVirtualize && (
        <div className="mb-6">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-primary">Activity</div>
          <VirtualNotificationList notifications={visibleNotifications} onMarkRead={handleMarkRead} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}
