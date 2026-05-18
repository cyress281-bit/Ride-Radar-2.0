import React, { memo, useState, useRef, useCallback } from 'react';
import { cn, timeAgo } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { Check, ImageOff, Smile } from 'lucide-react';

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
const LONG_PRESS_DELAY = 500; // ms
const MOVE_THRESHOLD = 8; // px

const MessageBubble = memo(function MessageBubble({ message, isMine }) {
  const [showReactions, setShowReactions] = useState(false);
  const [imageError, setImageError] = useState(false);

  const longPressTimer = useRef(null);
  const pointerOrigin = useRef(null);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerOrigin.current = null;
  }, []);

  const handlePointerDown = useCallback((e) => {
    pointerOrigin.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      pointerOrigin.current = null;
      setShowReactions((s) => !s);
    }, LONG_PRESS_DELAY);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (pointerOrigin.current === null) return;
    const dx = e.clientX - pointerOrigin.current.x;
    const dy = e.clientY - pointerOrigin.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  return (
    <div
      className={cn(
        'flex will-change-transform transform-gpu animate-message-in',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <VStack className="max-w-[82%] min-w-0" align={isMine ? 'end' : 'start'}>
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onPointerMove={handlePointerMove}
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

          {/* Image */}
          {message.image_url && (
            <div className={cn('rounded-xl overflow-hidden', message.body && 'mb-2')}>
              {imageError ? (
                <div className="flex items-center justify-center gap-2 w-full max-w-[260px] h-16 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                  <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Photo unavailable</span>
                </div>
              ) : (
                <img
                  src={message.image_url}
                  alt="Attached photo"
                  className="w-full max-w-[260px] rounded-xl object-cover block"
                  loading="lazy"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          )}

          {message.body && <span className={cn(isMine && 'pl-1')}>{message.body}</span>}
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
                className="text-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-surface-elevated rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowReactions(false)}
              aria-label="More reactions"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-surface-elevated rounded-lg transition-colors text-muted-foreground"
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
