import React, { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils.js';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants.js';
import { Send, Paperclip } from 'lucide-react';
import { HStack } from '@/components/ui/primitives/Stack';
import { toast } from 'sonner';

/**
 * Auto-resizing message textarea with glassmorphism input bar design.
 *
 * Features:
 * - Rounded-full text input that grows with content
 * - Neon green send button with glow
 * - Attachment button with glassmorphism
 * - Character counter
 * - Glassmorphism container
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
    <div className="p-3 pb-safe bg-background/80 backdrop-blur-xl border-t border-white/[0.06]">
      <HStack align="end" gap={2} className="max-w-xl mx-auto">
        {/* Attachment button */}
        <button
          type="button"
          disabled={disabled || isSending}
          className={cn(
            'shrink-0 h-11 w-11 rounded-full flex items-center justify-center',
            'border border-white/[0.06] bg-surface/80 text-muted-foreground backdrop-blur-md',
            'transition-all duration-200 hover:bg-surface-elevated hover:text-foreground hover:border-primary/15',
            'disabled:opacity-40 disabled:cursor-not-allowed pressable shadow-depth-1'
          )}
          aria-label="Attach file"
          onClick={() => {
            toast.info('Attachments coming soon');
          }}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            id="message-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conversation archived' : 'Type a message...'}
            rows={1}
            disabled={disabled || isSending}
            className={cn(
              'w-full resize-none rounded-full border bg-surface/80 backdrop-blur-md px-5 py-3 text-sm text-foreground',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30',
              'disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
              'border-white/[0.06] hover:border-white/[0.08] shadow-depth-1',
              isOverLimit && 'border-brand-emergency focus-visible:ring-brand-emergency focus-visible:border-brand-emergency'
            )}
            style={{ minHeight: '44px', maxHeight: '160px' }}
          />
          <div
            className={cn(
              'absolute right-4 bottom-3 text-[10px] font-mono-data',
              isOverLimit ? 'text-brand-emergency font-semibold' : 'text-muted-foreground/50'
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
            'bg-primary text-primary-foreground transition-all duration-200',
            'hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(57,255,20,0.35)] pressable',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none',
            'shadow-depth-2'
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </HStack>
    </div>
  );
}
