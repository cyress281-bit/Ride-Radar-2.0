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
  const type = notification.related_entity_type;
  const id = notification.related_entity_id;

  if (!type || !id) return null;

  if (type === 'conversation' || type === 'message' || type === 'new_message') return `/messages/${id}`;
  if (type === 'broadcast' || type === 'event' || type === 'rsvp') return `/broadcast/${id}`;
  if (type === 'user_profile' || type === 'user' || type === 'connection_request' || type === 'friend_request') return `/profile/${id}`;
  if (type === 'alert') return `/home`;

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
        <div className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-[#E30613]/10 pr-4">
          <X className="h-5 w-5 text-[#E30613]" />
        </div>
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 rounded-[20px] border p-4 transition-all duration-200 active:scale-95',
          isUnread
            ? 'cursor-pointer border-l-2 border-l-[#6BBF00] border-y border-r border-[hsl(220_12%_16%)] bg-[hsl(220_20%_7%)] hover:border-[#6BBF00]/30'
            : 'border-[hsl(220_12%_16%)]/50 bg-[hsl(220_20%_7%)]/40 opacity-70'
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
              ? 'border border-[#6BBF00]/20 bg-[#6BBF00]/10'
              : 'bg-[hsl(220_12%_16%)]/50'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              isUnread ? 'text-[#6BBF00]' : 'text-[hsl(220_8%_52%)]'
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[hsl(0_0%_96%)]">{notification.title}</span>
            {isUnread && (
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#6BBF00]" />
            )}
          </div>

          {notification.body && (
            <p className="mt-0.5 line-clamp-2 text-sm text-[hsl(220_8%_52%)]">
              {notification.body}
            </p>
          )}

          <div className="mt-1 text-[11px] text-[hsl(220_8%_52%)]">
            {timeAgo(notification.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default NotificationItem;
