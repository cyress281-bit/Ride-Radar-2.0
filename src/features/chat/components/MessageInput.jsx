import React, { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils.js';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants.js';
import { Send } from 'lucide-react';

/**
 * Auto-resizing message textarea with send button.
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
    <div className="p-3 pb-safe border-t border-border/60 bg-background/90 backdrop-blur">
      <div className="flex gap-2 items-end">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled || isSending}
            className={cn(
              'w-full resize-none rounded-2xl border bg-input px-4 py-2.5 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isOverLimit && 'border-destructive focus-visible:ring-destructive'
            )}
            style={{ minHeight: '40px', maxHeight: '160px' }}
          />
          <div
            className={cn(
              'absolute right-3 bottom-2 text-[10px]',
              isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'
            )}
          >
            {length}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'shrink-0 h-11 w-11 rounded-full flex items-center justify-center',
            'bg-primary text-primary-foreground transition-all duration-200',
            'hover:bg-primary/90 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
