import React, { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils.js';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants.js';
import { Send, Paperclip } from 'lucide-react';
import { HStack } from '@/components/ui/primitives/Stack';

/**
 * Auto-resizing message textarea with modern input bar design.
 *
 * Features:
 * - Rounded-full text input that grows with content
 * - Send button (Kawasaki Green circle)
 * - Attachment button placeholder
 * - Character counter
 *
 * Enter sends; Shift+Enter inserts a newline.
 *
 * @param {Object} props
 * @param {Function} props.onSend
 * @param {boolean} props.isSending
 * @param {boolean} [props.disabled]
 */
export default function MessageInput({ onSend, isSending, disabled = false }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const length = text.length;
  const isOverLimit = length > MAX_MESSAGE_LENGTH;
  const canSend = !isSending && !isOverLimit && text.trim().length > 0 && !disabled;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isOverLimit || disabled || isSending) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isOverLimit, disabled, isSending, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.repeat && !e.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="p-3 pb-safe bg-background/80 backdrop-blur-xl border-t border-border/30">
      <HStack align="end" gap={2} className="max-w-2xl mx-auto">
        {/* Attachment button */}
        <button
          type="button"
          disabled={disabled || isSending}
          className={cn(
            'shrink-0 h-11 w-11 rounded-full flex items-center justify-center',
            'border border-border/40 bg-surface text-muted-foreground',
            'transition-colors hover:bg-surface-elevated hover:text-foreground',
            'disabled:opacity-40 disabled:cursor-not-allowed pressable'
          )}
          aria-label="Attach file"
          onClick={() => { /* placeholder */ }}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conversation archived' : 'Type a message...'}
            rows={1}
            disabled={disabled || isSending}
            className={cn(
              'w-full resize-none rounded-full border bg-surface-elevated/80 px-5 py-3 text-sm text-foreground',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/40',
              'disabled:cursor-not-allowed disabled:opacity-50 transition-all',
              isOverLimit && 'border-brand-honda focus-visible:ring-brand-honda focus-visible:border-brand-honda'
            )}
            style={{ minHeight: '44px', maxHeight: '160px' }}
          />
          <div
            className={cn(
              'absolute right-4 bottom-3 text-[10px]',
              isOverLimit ? 'text-brand-honda font-semibold' : 'text-muted-foreground/60'
            )}
          >
            {length}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'shrink-0 h-11 w-11 rounded-full flex items-center justify-center',
            'bg-brand-kawasaki text-primary-foreground transition-all duration-200',
            'hover:bg-brand-kawasaki/90 pressable',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100',
            'glow-kawasaki-sm'
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </HStack>
    </div>
  );
}
