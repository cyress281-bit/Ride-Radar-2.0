/**
 * Notifications feed page for Ride Radar 2.0.
 *
 * Displays pending connection requests at the top, followed by
 * grouped notifications (Today / Yesterday / Earlier).
 * Uses virtualization for large lists (>25 items).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import RRLogo from '@/components/RRLogo';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
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

function VirtualNotificationList({ notifications, onMarkRead }) {
  const renderItem = useCallback(
    (n) => <NotificationItem notification={n} onMarkRead={onMarkRead} />,
    [onMarkRead]
  );
  const getItemKey = useCallback((index) => notifications[index]?.id ?? index, [notifications]);

  return (
    <VirtualList
      items={notifications}
      renderItem={renderItem}
      estimateSize={80}
      overscan={8}
      gap={8}
      height="calc(100vh - 18rem)"
      getItemKey={getItemKey}
    />
  );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function NotificationHeader({ unreadCount }) {
  return (
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
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rr-surface rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationEmptyState() {
  return (
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
  );
}

function ErrorState() {
  return (
    <div className="px-5 pt-5 pb-8">
      <div className="rr-surface-strong rounded-[1.45rem] p-6 text-center">
        <h2 className="font-display mb-2 text-xl font-bold text-destructive">Notifications unavailable</h2>
        <p className="mb-4 text-sm text-muted-foreground">Unable to load notifications. Please try again.</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full">
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

  const handleMarkRead = useCallback((notification) => markRead(notification.id), [markRead]);
  const handleMarkAllRead = useCallback(() => {
    if (user?.id) markAllRead(user.id);
  }, [markAllRead, user?.id]);

  // Connection requests (use shared hook)
  const { data: pendingRequests = [] } = useConnectionRequests();
  const { mutate: acceptConn, isPending: isAccepting } = useAcceptConnectionRequest();
  const { mutate: declineConn } = useDeclineConnectionRequest();

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
    <div className="px-5 pt-5 pb-8">
      <NotificationHeader unreadCount={unreadCount} />

      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="rounded-full text-xs">
            <Check className="mr-1 h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      )}

      {notificationsLoading && notifications.length === 0 && <NotificationSkeleton />}

      {!hasAnything && !notificationsLoading && <NotificationEmptyState />}

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
                isAccepting={isAccepting}
              />
            ))}
          </div>
        </div>
      )}

      {visibleNotifications.length > 0 && !shouldVirtualize && (
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

      {visibleNotifications.length > 0 && shouldVirtualize && (
        <div className="mb-6">
          <div className="rr-kicker mb-2 px-1 text-muted-foreground">Activity</div>
          <VirtualNotificationList notifications={visibleNotifications} onMarkRead={handleMarkRead} />
        </div>
      )}
    </div>
  );
}
