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
  MessageCircle,
  Megaphone,
  AlertTriangle,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { timeAgo } from '@/lib/utils.js';

/**
 * Icon mapping per notification type.
 * @param {string} type
 * @returns {React.ComponentType<{className?: string}>}
 */
function getIconForType(type) {
  switch (type) {
    case 'connection_request':
      return UserPlus;
    case 'message':
    case 'new_message':
      return MessageCircle;
    case 'broadcast_comment':
    case 'post_comment':
      return MessageCircle;
    case 'broadcast':
    case 'rsvp':
    case 'event_reminder':
      return Megaphone;
    case 'alert':
      return AlertTriangle;
    case 'system':
    case 'announcement':
      return Settings;
    default:
      return Bell;
  }
}

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
    if (broadcastId) return `/broadcast/${broadcastId}`;
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

  // Swipe-to-dismiss state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Only allow left swipe
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -100));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (swipeOffset < -60) {
      onDelete?.();
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
  }, [swipeOffset, onDelete]);

  const handleClick = useCallback(() => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification);
    }
    if (href) {
      navigate(href);
    }
  }, [isUnread, onMarkRead, notification, href, navigate]);

  return (
    <div className="relative overflow-hidden">
      {/* Swipe background */}
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-brand-emergency/10 pr-4">
          <X className="h-5 w-5 text-brand-emergency" />
        </div>
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 rounded-[20px] border p-4 transition-all duration-200 active:scale-95',
          isUnread
            ? 'cursor-pointer border-l-2 border-l-primary border-y border-r border-primary/10 bg-surface/80 hover:border-primary/30 backdrop-blur-sm'
            : 'border-border/40 bg-surface/40 opacity-70'
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
              ? 'border border-primary/20 bg-primary/10'
              : 'bg-muted/50'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              isUnread ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{notification.title}</span>
            {isUnread && (
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
            )}
          </div>

          {notification.body && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {notification.body}
            </p>
          )}

          <div className="mt-1 text-[11px] text-muted-foreground">
            {timeAgo(notification.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default NotificationItem;
