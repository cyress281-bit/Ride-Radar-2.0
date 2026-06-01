import React, { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils.js';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants.js';
import { Send, ImagePlus, X } from 'lucide-react';
import { HStack } from '@/components/ui/primitives/Stack';
import { toast } from 'sonner';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Auto-resizing message textarea with image attachment support.
 *
 * onSend receives { body, imageFile } — at least one must be non-empty.
 * Enter sends; Shift+Enter inserts a newline.
 *
 * @param {Object} props
 * @param {Function} props.onSend
 * @param {boolean} props.isSending
 * @param {boolean} [props.disabled]
 */
export default function MessageInput({ onSend, isSending, disabled = false }) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // File
  const [previewUrl, setPreviewUrl] = useState(null);       // Object URL
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const length = text.length;
  const isOverLimit = length > MAX_MESSAGE_LENGTH;
  const canSend = !isSending && !isOverLimit && (text.trim().length > 0 || !!selectedImage) && !disabled;

  // Revoke preview URL whenever it changes or component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type', { description: 'Please select a JPG, PNG, or WebP image.' });
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large', { description: 'Maximum size is 5MB.' });
      e.target.value = '';
      return;
    }

    // Setting new previewUrl triggers cleanup of the old one via useEffect
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = ''; // Reset so the same file can be re-selected
  }, []);

  const handleRemoveImage = useCallback(() => {
    // Setting previewUrl to null triggers revoke via useEffect
    setSelectedImage(null);
    setPreviewUrl(null);
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend({ body: text.trim(), imageFile: selectedImage || null });
    setText('');
    setSelectedImage(null);
    setPreviewUrl(null); // revoke via useEffect
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, selectedImage, canSend, onSend]);

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
    <div className="p-3 bg-background/80 backdrop-blur-xl border-t border-white/[0.06]">
      {/* Image preview thumbnail */}
      {previewUrl && (
        <div className="mb-2 max-w-xl mx-auto">
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Selected"
              className="h-20 w-20 object-cover rounded-xl border border-white/[0.08]"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full bg-surface-elevated border border-white/[0.12] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <HStack align="end" gap={2} className="max-w-xl mx-auto">
        {/* Hidden file input — no capture attribute so users can choose gallery or camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          aria-label="Select image"
          tabIndex={-1}
        />

        {/* Photo attachment button */}
        <button
          type="button"
          disabled={disabled || isSending}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'shrink-0 h-11 w-11 rounded-full flex items-center justify-center',
            'border backdrop-blur-md transition-all duration-200',
            'pressable shadow-depth-1',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            selectedImage
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              : 'bg-surface/80 border-white/[0.06] text-muted-foreground hover:bg-surface-elevated hover:text-foreground hover:border-primary/15',
          )}
          aria-label="Attach photo"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            id="message-input"
            aria-label="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Conversation archived' : 'Type a message...'}
            rows={1}
            disabled={disabled || isSending}
            className={cn(
              'w-full resize-none rounded-full border bg-surface/80 backdrop-blur-md px-5 py-3 text-foreground',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30',
              'disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
              'border-white/[0.06] hover:border-white/[0.08] shadow-depth-1',
              isOverLimit && 'border-brand-emergency focus-visible:ring-brand-emergency focus-visible:border-brand-emergency'
            )}
            style={{ minHeight: '44px', maxHeight: '160px', fontSize: '16px' }}
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
