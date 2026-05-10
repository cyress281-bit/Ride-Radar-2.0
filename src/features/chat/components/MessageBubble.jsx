import React, { memo } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';

/**
 * Single message bubble.
 *
 * Own messages are green and right-aligned.
 * Other messages are dark surface and left-aligned.
 *
 * @param {Object} props
 * @param {object} props.message
 * @param {boolean} props.isMine
 */
const MessageBubble = memo(function MessageBubble({ message, isMine }) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[80%]">
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed border',
            isMine
              ? 'bg-primary/10 text-foreground border-primary/25 rounded-br-md'
              : 'bg-secondary/70 text-secondary-foreground border-border/40 rounded-bl-md'
          )}
        >
          {message.body}
        </div>
        <div
          className={cn(
            'text-[10px] text-muted-foreground mt-1 px-1',
            isMine ? 'text-right' : 'text-left'
          )}
        >
          {timeAgo(message.created_at)}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
