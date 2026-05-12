import React, { memo, useState } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { Check, CheckCheck, Smile, Image as ImageIcon } from 'lucide-react';

/**
 * Single message bubble.
 *
 * Modern design:
 * - Own messages: Kawasaki Green bubble, rounded-2xl, right-aligned
 * - Other messages: surface-elevated bubble, rounded-2xl, left-aligned
 * - Timestamps below
 * - Read receipts (placeholder)
 * - Reactions placeholder
 * - Image support placeholder
 *
 * @param {Object} props
 * @param {object} props.message
 * @param {boolean} props.isMine
 */
const MessageBubble = memo(function MessageBubble({ message, isMine }) {
  const [showReactions, setShowReactions] = useState(false);

  // Placeholder: simulate read status based on created_at age
  const isRead = isMine && new Date(message.created_at).getTime() < Date.now() - 5000;

  return (
    <div
      className={cn(
        'flex will-change-transform transform-gpu animate-message-in',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <VStack className="max-w-[82%]" align={isMine ? 'end' : 'start'}>
        <div
          onClick={() => setShowReactions((s) => !s)}
          className={cn(
            'relative px-4 py-2.5 text-sm leading-relaxed border cursor-pointer select-text',
            'transition-colors duration-150',
            isMine
              ? 'bg-brand-kawasaki text-primary-foreground border-brand-kawasaki/30 rounded-2xl rounded-br-sm shadow-depth-1'
              : 'bg-surface-elevated text-foreground border-border/30 rounded-2xl rounded-bl-sm shadow-depth-1'
          )}
        >
          {/* Image placeholder */}
          {message.has_image && (
            <div className="mb-2 rounded-xl overflow-hidden bg-black/20 border border-white/5">
              <div className="flex items-center justify-center h-32 gap-2 text-foreground/50">
                <ImageIcon className="w-5 h-5" />
                <Text variant="caption" color={isMine ? 'white' : 'muted'}>Image</Text>
              </div>
            </div>
          )}

          {message.body}
        </div>

        {/* Meta row: timestamp + read receipts */}
        <HStack align="center" gap={1} className="mt-1 px-1">
          <Text variant="micro" color="muted">
            {timeAgo(message.created_at)}
          </Text>
          {isMine && (
            <span className="text-muted-foreground/60">
              {isRead ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </HStack>

        {/* Reactions placeholder */}
        {showReactions && (
          <HStack gap={1} className="mt-1 animate-scale-in">
            {['👍', '❤️', '🔥', '😂', '😮'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => setShowReactions(false)}
                className="text-lg p-1 hover:bg-surface-elevated rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowReactions(false)}
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
