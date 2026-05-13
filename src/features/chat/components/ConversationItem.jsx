import React, { memo, useCallback } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';

/**
 * Single conversation row item.
 *
 * Electric neon design: large avatar with online status glow, name + preview,
 * timestamp, neon green unread count badge. Glassmorphism card with
 * subtle border and depth shadow.
 *
 * Accepts either `onClick` (legacy) or `conversationId` + `onNavigate` (preferred).
 * Using `conversationId` + `onNavigate` avoids creating a new inline arrow on
 * every parent render, which is important for keeping React.memo effective.
 *
 * @param {Object} props
 * @param {object} props.conversation
 * @param {object|null} props.profile
 * @param {number} props.unreadCount
 * @param {Function} [props.onClick] - Legacy: direct click handler
 * @param {string} [props.conversationId] - Preferred: stable id for navigation
 * @param {Function} [props.onNavigate] - Preferred: stable navigate(id) callback
 */
const ConversationItem = memo(function ConversationItem({
  conversation,
  profile,
  unreadCount,
  onClick,
  conversationId,
  onNavigate,
}) {
  const handleClick = useCallback(() => {
    if (onNavigate && conversationId) {
      onNavigate(conversationId);
    } else if (onClick) {
      onClick();
    }
  }, [onNavigate, conversationId, onClick]);

  const hasUnread = unreadCount > 0;
  const lastMessage = conversation.last_message?.body || conversation.last_message_preview || '';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full text-left pressable group',
        'p-3.5 transition-all duration-200',
        'rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md',
        'hover:bg-surface-elevated/80 hover:border-white/[0.08] hover:shadow-depth-2',
        'active:bg-surface active:shadow-depth-1',
        hasUnread && 'border-primary/10 bg-surface-elevated/40'
      )}
    >
      <HStack align="center" gap={3.5}>
        {/* Avatar with status */}
        <div className="relative shrink-0">
          <div className={cn(
            'rounded-full transition-shadow duration-300',
            hasUnread && 'shadow-[0_0_16px_rgba(57,255,20,0.18)]'
          )}>
            <AvatarWithStatus
              url={profile?.avatar_url}
              name={profile?.display_name}
              status={profile?.is_online ? 'online' : 'offline'}
              size="lg"
              className={cn(
                hasUnread && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background rounded-full'
              )}
            />
          </div>
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.6)]" />
          )}
        </div>

        {/* Content */}
        <VStack flex className="min-w-0">
          <HStack align="center" justify="between" gap={2}>
            <Text
              variant="bodySm"
              className={cn('font-semibold truncate', hasUnread && 'text-foreground')}
            >
              {profile?.display_name || 'Rider'}
            </Text>
            <Text
              variant="micro"
              color={hasUnread ? 'default' : 'muted'}
              className={cn('shrink-0 font-mono-data tracking-wide', hasUnread && 'text-primary')}
            >
              {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ''}
            </Text>
          </HStack>

          <HStack align="center" justify="between" gap={2}>
            <Text
              variant="caption"
              color={hasUnread ? 'default' : 'muted'}
              truncate
              className={cn(hasUnread && 'text-foreground/80 font-medium')}
            >
              {lastMessage || 'Start a conversation'}
            </Text>
            {hasUnread && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 shadow-[0_0_10px_rgba(57,255,20,0.35)]">
                {unreadCount}
              </span>
            )}
          </HStack>
        </VStack>
      </HStack>
    </button>
  );
});

export default ConversationItem;
