import { useState, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { prepareLocalImage, revokeLocalImage } from '@/lib/image-utils.js';
import { useCreatePost } from '@/features/profile/hooks/use-user-posts';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock.js';

const MAX_PHOTOS = 6;
const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp';

/**
 * PostCreateSheet — full-screen overlay for creating a new post (1–6 photos + caption).
 *
 * @param {{ open: boolean, onClose: () => void, userId: string }} props
 */
const PostCreateSheet = memo(function PostCreateSheet({ open, onClose, userId }) {
  useBodyScrollLock(open);

  const [photos, setPhotos] = useState([]);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const createPost = useCreatePost();

  const handleClose = useCallback(() => {
    photos.forEach(revokeLocalImage);
    setPhotos([]);
    setCaption('');
    setError('');
    onClose();
  }, [photos, onClose]);

  const addPhoto = useCallback(async (file) => {
    if (!file || photos.length >= MAX_PHOTOS || preparing) return;
    setPreparing(true);
    setError('');
    try {
      const localImage = await prepareLocalImage(file, 'post');
      setPhotos((prev) => [...prev, localImage]);
    } catch (err) {
      setError(err?.message || 'Image validation failed. Please try another image.');
    } finally {
      setPreparing(false);
    }
  }, [photos.length, preparing]);

  const removePhoto = useCallback((idx) => {
    setPhotos((prev) => {
      revokeLocalImage(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (photos.length === 0) {
      setError('Add at least one photo to create a shot.');
      return;
    }
    setError('');
    try {
      await createPost.mutateAsync({ userId, caption: caption.trim() || undefined, photos });
      handleClose();
    } catch (err) {
      setError(err?.message || 'Failed to create shot. Please try again.');
    }
  }, [photos, caption, userId, createPost, handleClose]);

  if (!open) return null;

  const busy = preparing || createPost.isPending;
  const canAdd = photos.length < MAX_PHOTOS && !busy;
  const canSubmit = photos.length > 0 && !busy;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Create shot"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
        <button
          onClick={handleClose}
          disabled={createPost.isPending}
          className="flex items-center justify-center h-11 w-11 rounded-full hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
        <Text variant="bodySm" className="font-bold">New Shot</Text>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-bold transition-all active:scale-95',
            canSubmit
              ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)] hover:bg-primary/90'
              : 'bg-primary/30 text-primary-foreground/50 cursor-not-allowed'
          )}
        >
          {createPost.isPending ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Sharing…
            </span>
          ) : 'Share'}
        </button>
      </div>

      <VStack gap={4} className="p-4 max-w-2xl mx-auto">
        {/* Photo grid */}
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-surface border border-white/[0.06]">
              <img
                src={photo.previewUrl}
                alt={`Photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                disabled={busy}
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add slot */}
          {canAdd && (
            <label className="aspect-square rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1">
              <input
                type="file"
                accept={ACCEPTED}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) addPhoto(f);
                }}
                disabled={!canAdd}
                aria-label="Add photo"
              />
              {preparing ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  <Text variant="micro" color="muted">{photos.length === 0 ? 'Add photos' : 'Add more'}</Text>
                </>
              )}
            </label>
          )}
        </div>

        {/* Photo count */}
        <Text variant="micro" color="muted" className="block text-right tabular-nums">
          {photos.length} / {MAX_PHOTOS}
        </Text>

        {/* Caption */}
        <div>
          <textarea
            aria-label="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption… (optional)"
            maxLength={500}
            rows={3}
            disabled={busy}
            className={cn(
              'w-full rounded-xl border border-white/[0.06] bg-surface/60 px-4 py-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'resize-none outline-none focus:border-primary/40 transition-colors',
              'disabled:opacity-50'
            )}
          />
          <Text variant="micro" color="muted" className="block text-right mt-1 tabular-nums">
            {caption.length}/500
          </Text>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
            <Text variant="caption" className="text-destructive">{error}</Text>
          </div>
        )}
      </VStack>
    </div>,
    document.body
  );
});

export default PostCreateSheet;
