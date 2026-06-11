import { memo, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { archiveConversation } from '@/features/chat/api/chat-api.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { toast } from 'sonner';
import { withRoutePreload, preloadConversation } from '@/lib/routePreload.js';
import { prefetchConversationMessages } from '@/lib/query-client.js';

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
  const [confirming, setConfirming] = useState(false);
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  const { mutate: archive, isPending: isArchiving } = useMutation({
    mutationFn: () => archiveConversation(conversation.id),
    onSuccess: () => {
      queryClient.setQueryData(['conversations', user?.id], (old = []) =>
        old.filter((c) => c.id !== conversation.id)
      );
    },
    onError: () => {
      setConfirming(false);
      toast.error('Could not delete chat', { description: 'Please try again.' });
    },
  });

  const handleClick = useCallback(() => {
    if (onNavigate && conversationId) {
      onNavigate(conversationId);
    } else if (onClick) {
      onClick();
    }
  }, [onNavigate, conversationId, onClick]);

  const hasUnread = unreadCount > 0;
  const lastPreview = conversation.last_message?.body || conversation.last_message_preview;
  const hasPhotoPreview = !lastPreview && !!conversation.last_message_at;
  const lastMessage = lastPreview || (hasPhotoPreview ? 'Photo' : '');
  // True when the current user sent the latest message — show a "You:" prefix so
  // they can tell at a glance they were the last to respond (awaiting a reply).
  const isOwnLastMessage = !!conversation.last_message?.from_user_id && conversation.last_message.from_user_id === user?.id;

  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 px-3.5 py-3.5 transition-all duration-200',
        hasUnread && 'bg-primary/[0.03]'
      )}
    >
        {/* Main navigation button — covers avatar + content */}
        <button
          type="button"
          onClick={handleClick}
          className="flex flex-1 items-center gap-3.5 min-w-0 text-left pressable active:opacity-80"
          aria-label={`Open conversation with ${profile?.display_name || 'Rider'}`}
          {...withRoutePreload(preloadConversation, () => {
            if (user?.id && conversation?.id) {
              prefetchConversationMessages(queryClient, conversation.id, user.id);
            }
          })}
        >
          {/* Avatar with status */}
          <div className="relative shrink-0">
            <div className={cn(
              'rounded-full transition-shadow duration-300',
              hasUnread && 'shadow-[0_0_18px_rgba(57,255,20,0.18)]'
            )}>
              <AvatarWithStatus
                url={profile?.avatar_url}
                name={profile?.display_name}
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
              <VStack gap={0} className="min-w-0 flex-1">
                <Text
                  variant="bodySm"
                  className={cn('font-semibold truncate', hasUnread ? 'text-foreground' : 'text-foreground/92')}
                >
                  {profile?.display_name || 'Rider'}
                </Text>
                {profile?.username && (
                  <Text variant="micro" color="muted" className="truncate">
                    @{profile.username}
                  </Text>
                )}
              </VStack>
              <Text
                variant="micro"
                color={hasUnread ? 'default' : 'muted'}
                className={cn('shrink-0 font-mono-data tracking-wide', hasUnread && 'text-primary')}
              >
                {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ''}
              </Text>
            </HStack>

            <HStack align="center" justify="between" gap={2}>
              <HStack align="center" gap={1.5} className="min-w-0">
                {hasPhotoPreview && (
                  <ImageIcon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      hasUnread ? 'text-foreground' : 'text-muted-foreground'
                    )}
                    aria-hidden="true"
                  />
                )}
                <Text
                  variant="caption"
                  color={hasUnread ? 'default' : 'muted'}
                  truncate
                  className={cn(hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground/85')}
                >
                  {lastMessage
                    ? (isOwnLastMessage ? `You: ${lastMessage}` : lastMessage)
                    : 'Start a conversation'}
                </Text>
              </HStack>
              {hasUnread && (
                <span
                  className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0 shadow-[0_0_12px_rgba(57,255,20,0.38)]"
                  aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
                >
                  {unreadCount}
                </span>
              )}
            </HStack>
          </VStack>
        </button>

        {/* Inline confirmation or 3-dot overflow menu */}
        {confirming ? (
          <HStack gap={1.5} align="center" className="shrink-0">
            <Text variant="micro" color="muted" className="whitespace-nowrap">Delete?</Text>
            <button
              type="button"
              onClick={() => archive()}
              disabled={isArchiving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-emergency/10 border border-brand-emergency/30 text-brand-emergency hover:bg-brand-emergency/20 disabled:opacity-50 transition-colors"
            >
              {isArchiving && <Loader2 className="w-3 h-3 animate-spin" />}
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isArchiving}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </HStack>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem
                onClick={() => setConfirming(true)}
                className="text-brand-emergency focus:text-brand-emergency focus:bg-brand-emergency/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
    </div>
  );
});

export default ConversationItem;
