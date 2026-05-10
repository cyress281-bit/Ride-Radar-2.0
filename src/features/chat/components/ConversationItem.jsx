import React, { memo } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';

/**
 * Single conversation row item.
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
        'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left',
        'bg-card hover:bg-accent hover:border-primary/25 hover:-translate-y-0.5',
        'shadow-sm hover:shadow-md'
      )}
    >
      <div className="relative shrink-0">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-12 h-12 rounded-full object-cover border border-border/50"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-base text-foreground border border-border/50">
            {profile?.display_name?.[0] || '?'}
          </div>
        )}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm truncate">
            {profile?.display_name || 'Rider'}
          </div>
          {hasUnread && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {lastMessage || 'Start a conversation'}
        </div>
      </div>

      <div className="shrink-0 text-[11px] text-muted-foreground text-right">
        {conversation.last_message_at ? timeAgo(conversation.last_message_at) : ''}
      </div>
    </button>
  );
});

export default ConversationItem;
