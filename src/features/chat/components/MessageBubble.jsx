import React, { memo, useState } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { Check, Smile, Image as ImageIcon } from 'lucide-react';

/**
 * Single message bubble.
 *
 * Electric neon design:
 * - Own messages: dark surface with neon green border/accent, right-aligned
 * - Other messages: surface-elevated bubble, left-aligned
 * - Timestamps with mono font
 * - Read receipts (neon green when read)
 * - Reactions support
 * - Image support placeholder
 *
 * @param {Object} props
 * @param {object} props.message
 * @param {boolean} props.isMine
 */
const MessageBubble = memo(function MessageBubble({ message, isMine }) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className={cn(
        'flex will-change-transform transform-gpu animate-message-in',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <VStack className="max-w-[82%] min-w-0" align={isMine ? 'end' : 'start'}>
        <div
          onClick={() => setShowReactions((s) => !s)}
          className={cn(
            'relative px-4 py-2.5 text-sm leading-relaxed cursor-pointer select-text',
            'transition-all duration-200',
            isMine
              ? 'bg-surface-elevated text-foreground border border-primary/25 rounded-2xl rounded-br-sm shadow-[0_2px_12px_rgba(57,255,20,0.08)]'
              : 'bg-surface text-foreground border border-white/[0.06] rounded-2xl rounded-bl-sm shadow-depth-1'
          )}
        >
          {/* Neon accent line for own messages */}
          {isMine && (
            <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-primary/60" />
          )}

          {/* Image placeholder */}
          {message.has_image && (
            <div className="mb-2 rounded-xl overflow-hidden bg-black/20 border border-white/5">
              <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
                <ImageIcon className="w-5 h-5" />
                <Text variant="caption" color={isMine ? 'default' : 'muted'}>Image</Text>
              </div>
            </div>
          )}

          <span className={cn(isMine && 'pl-1')}>{message.body}</span>
        </div>

        {/* Meta row: timestamp + read receipts */}
        <HStack align="center" gap={1.5} className="mt-1 px-1">
          <Text variant="micro" color="muted" className="font-mono-data tracking-wide">
            {timeAgo(message.created_at)}
          </Text>
          {isMine && (
            <span className="text-muted-foreground/50">
              <Check className="w-3 h-3" aria-hidden="true" />
            </span>
          )}
        </HStack>

        {/* Reactions */}
        {showReactions && (
          <HStack gap={1} className="mt-1 animate-scale-in">
            {['👍', '❤️', '🔥', '😂', '😮'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => setShowReactions(false)}
                aria-label={`React with ${emoji}`}
                className="text-lg p-1 hover:bg-surface-elevated rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowReactions(false)}
              aria-label="More reactions"
              className="p-1 hover:bg-surface-elevated rounded-lg transition-colors text-muted-foreground"
            >
              <Smile className="w-4 h-4" />
            </button>
          </HStack>
        )}
      </VStack>
    </div>
  );
});

export default MessageBubble;
