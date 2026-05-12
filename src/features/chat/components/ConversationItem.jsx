import React, { memo } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Badge } from '@/components/ui/badge';

/**
 * Single conversation row item.
 *
 * Modern design: large avatar with online status, name + preview,
 * timestamp, unread count badge.
 *
 * @param {Object} props
 * @param {object} props.conversation
 * @param {object|null} props.profile
 * @param {number} props.unreadCount
 * @param {Function} props.onClick
 */
const ConversationItem = memo(function ConversationItem({
  conversation,
  profile,
  unreadCount,
  onClick,
}) {
  const hasUnread = unreadCount > 0;
  const lastMessage = conversation.last_message?.body || conversation.last_message_preview || '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left pressable',
        'surface-card p-3.5 transition-colors duration-200',
        'hover:surface-card-elevated active:surface-card-pressed'
      )}
    >
      <HStack align="center" gap={3.5}>
        {/* Avatar with status */}
        <div className="relative shrink-0">
          <AvatarWithStatus
            url={profile?.avatar_url}
            name={profile?.display_name}
            status={profile?.is_online ? 'online' : 'offline'}
            size="lg"
            className={cn(hasUnread && 'ring-2 ring-brand-honda/40 ring-offset-2 ring-offset-background rounded-full')}
          />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-brand-honda border-2 border-background animate-pulse" />
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
            <Text variant="micro" color="muted" className="shrink-0">
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
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] shrink-0">
                {unreadCount}
              </Badge>
            )}
          </HStack>
        </VStack>
      </HStack>
    </button>
  );
});

export default ConversationItem;
