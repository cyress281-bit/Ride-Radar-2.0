/**
 * Single notification row component.
 *
 * Displays an icon based on notification type, title, body, timestamp,
 * and an unread indicator. Supports click-to-navigate and swipe-to-dismiss.
 */

import { memo, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  UserPlus,
  UserCheck,
  MessageSquare,
  Megaphone,
  AlertTriangle,
  CalendarClock,
  ShieldCheck,
  Info,
  X,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { timeAgo } from '@/lib/utils.js';

// Type-specific color scheme for unread notifications.
const TYPE_COLORS = {
  // emergency
  alert:               { border: 'border-l-brand-emergency', icon: 'bg-brand-emergency/15 border border-brand-emergency/30', text: 'text-brand-emergency' },
  bike_down:           { border: 'border-l-brand-emergency', icon: 'bg-brand-emergency/15 border border-brand-emergency/30', text: 'text-brand-emergency' },
  // conversational
  new_message:         { border: 'border-l-brand-radar',     icon: 'bg-brand-radar/15 border border-brand-radar/30',         text: 'text-brand-radar' },
  message:             { border: 'border-l-brand-radar',     icon: 'bg-brand-radar/15 border border-brand-radar/30',         text: 'text-brand-radar' },
  broadcast_comment:   { border: 'border-l-brand-radar',     icon: 'bg-brand-radar/15 border border-brand-radar/30',         text: 'text-brand-radar' },
  post_comment:        { border: 'border-l-brand-radar',     icon: 'bg-brand-radar/15 border border-brand-radar/30',         text: 'text-brand-radar' },
  // social/connections — keep primary green
  connection_request:  { border: 'border-l-primary',         icon: 'bg-primary/10 border border-primary/20',                 text: 'text-primary' },
  connection_accepted: { border: 'border-l-primary',         icon: 'bg-primary/10 border border-primary/20',                 text: 'text-primary' },
  // profile like — red
  profile_like:        { border: 'border-l-destructive',     icon: 'bg-destructive/10 border border-destructive/20',         text: 'text-destructive' },
  // event/rsvp — amber
  rsvp:                { border: 'border-l-amber-500',       icon: 'bg-amber-500/15 border border-amber-500/30',             text: 'text-amber-500' },
  event_reminder:      { border: 'border-l-amber-500',       icon: 'bg-amber-500/15 border border-amber-500/30',             text: 'text-amber-500' },
  // system/announcement — neutral
  system:              { border: 'border-l-border',          icon: 'bg-muted/20 border border-border/40',                    text: 'text-muted-foreground' },
  announcement:        { border: 'border-l-border',          icon: 'bg-muted/20 border border-border/40',                    text: 'text-muted-foreground' },
};

function getTypeColors(type) {
  if (type === 'official_event_review_request') return TYPE_COLORS.rsvp;
  return TYPE_COLORS[type] ?? TYPE_COLORS.connection_request;
}

/**
 * Icon mapping per notification type.
 * @param {string} type
 * @returns {React.ComponentType<{className?: string}>}
 */
function getIconForType(type) {
  switch (type) {
    case 'connection_request':
      return UserPlus;
    case 'connection_accepted':
      return UserCheck;
    case 'message':
    case 'new_message':
      return MessageSquare;
    case 'broadcast_comment':
    case 'post_comment':
      return MessageSquare;
    case 'broadcast':
    case 'announcement':
      return Megaphone;
    case 'rsvp':
    case 'event_reminder':
      return CalendarClock;
    case 'profile_like':
      return Heart;
    case 'official_event_review_request':
      return ShieldCheck;
    case 'bike_down':
    case 'sos':
    case 'alert':
      return AlertTriangle;
    case 'system':
      return Info;
    default:
      return Bell;
  }
}

/** Types that require emergency visual treatment. */
const EMERGENCY_TYPES = new Set(['bike_down', 'sos', 'alert']);

/**
 * Derive a navigation path from a notification.
 *
 * @param {object} notification
 * @returns {string|null}
 */
function getNotificationHref(notification) {
  const { type, data } = notification;

  if (type === 'post_comment') {
    const postOwnerId = data?.post_owner_id;
    const postId = data?.post_id;
    if (postOwnerId && postId) return `/profile/${postOwnerId}?openPost=${postId}`;
    return null;
  }

  if (type === 'broadcast_comment') {
    const broadcastId = data?.broadcast_id ?? notification.related_entity_id;
    if (broadcastId) return `/broadcast/${broadcastId}#comments`;
    return null;
  }

  if (type === 'profile_like') {
    const actorId = data?.actor_id ?? notification.actor_id;
    if (actorId) return `/profile/${actorId}`;
    return null;
  }

  if (type === 'connection_request') {
    const fromUserId = data?.from_user_id;
    return fromUserId ? `/profile/${fromUserId}` : null;
  }

  if (type === 'connection_accepted') {
    // to_user_id is the rider who accepted — the actor the requester wants to see
    const accepterId = data?.to_user_id;
    return accepterId ? `/profile/${accepterId}` : null;
  }

  if (type === 'new_message' || type === 'message') {
    const convId = data?.conversation_id;
    return convId ? `/messages/${convId}` : null;
  }

  if (type === 'official_event_review_request') {
    return '/admin/events';
  }

  const type2 = notification.related_entity_type;
  const id = notification.related_entity_id;

  if (!type2 || !id) return null;

  if (type2 === 'conversation' || type2 === 'message' || type2 === 'new_message') return `/messages/${id}`;
  if (type2 === 'broadcast' || type2 === 'event' || type2 === 'rsvp') return `/broadcast/${id}`;
  if (type2 === 'user_profile' || type2 === 'user' || type2 === 'connection_request' || type2 === 'friend_request') return `/profile/${id}`;
  if (type2 === 'alert') return `/home`;

  return null;
}

/**
 * @typedef {object} NotificationItemProps
 * @property {object} notification
 * @property {() => void} [onMarkRead]
 * @property {() => void} [onDelete]
 */

/**
 * Single notification row.
 *
 * @param {NotificationItemProps} props
 */
const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}) {
  const navigate = useNavigate();
  const href = getNotificationHref(notification);
  const isUnread = !notification.is_read;

  const Icon = getIconForType(notification.type);
  const typeColors = getTypeColors(notification.type);
  const isEmergency = EMERGENCY_TYPES.has(notification.type);

  // px left to trigger the reveal; how far the card sits when revealed
  const SWIPE_THRESHOLD = 60;
  const SWIPE_REVEAL_OFFSET = -80;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const touchStartX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Base offset accounts for already-revealed state so swiping right closes it
    const baseOffset = isDeleteRevealed ? SWIPE_REVEAL_OFFSET : 0;
    const newOffset = baseOffset + diff;
    if (newOffset <= 0) {
      setSwipeOffset(Math.max(newOffset, -100));
    }
  }, [isDeleteRevealed, SWIPE_REVEAL_OFFSET]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (swipeOffset < -SWIPE_THRESHOLD) {
      // Past threshold: hold card open so the delete button is visible
      setIsDeleteRevealed(true);
      setSwipeOffset(SWIPE_REVEAL_OFFSET);
    } else {
      // Under threshold: snap back and hide delete zone
      setIsDeleteRevealed(false);
      setSwipeOffset(0);
    }
  }, [swipeOffset, SWIPE_THRESHOLD, SWIPE_REVEAL_OFFSET]);

  const handleDelete = useCallback(() => {
    onDelete?.(notification);
    setSwipeOffset(0);
    setIsDeleteRevealed(false);
  }, [onDelete, notification]);

  const handleClick = useCallback(() => {
    // When delete is revealed, a tap on the card closes it rather than navigating
    if (isDeleteRevealed) {
      setIsDeleteRevealed(false);
      setSwipeOffset(0);
      return;
    }
    if (isUnread && onMarkRead) {
      onMarkRead(notification);
    }
    if (href) {
      navigate(href);
    }
  }, [isDeleteRevealed, isUnread, onMarkRead, notification, href, navigate]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete zone — rendered only when the card has moved so it never bleeds through at rest.
          Fixed width matches the reveal offset so the X is fully exposed when held open. */}
      {onDelete && (swipeOffset < 0 || isDeleteRevealed) && (
        <button
          onClick={handleDelete}
          aria-label="Delete notification"
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-brand-emergency"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 rounded-[20px] border p-4 transition-all duration-200 active:scale-95',
          isUnread
            ? `cursor-pointer border-l-4 ${typeColors.border} border-y border-r border-primary/10 hover:border-primary/30`
            : 'border-border/40 opacity-70',
          isEmergency && 'bg-brand-emergency/15'
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            isUnread
              ? typeColors.icon
              : 'bg-muted/50'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              isUnread ? typeColors.text : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold', isEmergency ? 'text-brand-emergency' : 'text-foreground')}>{notification.title}</span>
            {isUnread && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
                New
              </span>
            )}
          </div>

          {notification.body && (
            <p className={cn(
              'mt-0.5 line-clamp-2 text-sm text-muted-foreground',
              isEmergency && 'font-semibold text-foreground'
            )}>
              {notification.body}
            </p>
          )}

          {(notification.type === 'new_message' || notification.type === 'message') && notification.messagePreview && (
            <p className="text-xs text-muted-foreground/75 truncate mt-0.5 italic leading-snug">
              &ldquo;{notification.messagePreview}&rdquo;
            </p>
          )}

          <div className="mt-1 text-xs text-foreground/70">
            {timeAgo(notification.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default NotificationItem;
