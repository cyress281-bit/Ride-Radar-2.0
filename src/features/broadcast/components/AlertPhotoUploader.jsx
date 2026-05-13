import { useState, useRef, useCallback } from 'react';
import { Image, Upload, X, AlertCircle } from 'lucide-react';
import { prepareLocalImage } from '@/lib/image-utils.js';
import { cn } from '@/lib/utils.js';
import { MAX_ALERT_PHOTOS } from '@/lib/constants.js';

const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp';

/**
 * AlertPhotoUploader - Drag-and-drop photo upload for alert broadcasts.
 *
 * @param {object} props
 * @param {Array} [props.images=[]]
 * @param {Function} props.onChange
 * @param {boolean} [props.disabled=false]
 */
export default function AlertPhotoUploader({ images = [], onChange, disabled = false }) {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRefs = useRef([]);
  const photos = images.filter(Boolean).slice(0, MAX_ALERT_PHOTOS);
  const slots = photos.length < MAX_ALERT_PHOTOS ? [...photos, null] : photos;
  const canAddMore = photos.length < MAX_ALERT_PHOTOS && !disabled;

  const uploadAt = useCallback(
    async (file, index) => {
      if (!file || uploadingIndex !== null) return;
      setUploadingIndex(index);
      setUploadError('');
      try {
        const localImage = await prepareLocalImage(file, 'alert');
        const next = [...photos];
        next[index] = localImage;
        onChange(next.filter(Boolean).slice(0, MAX_ALERT_PHOTOS));
      } catch (error) {
        const message =
          error?.response?.data?.error || error?.message || 'Image validation failed. Please try another image.';
        setUploadError(message);
      } finally {
        setUploadingIndex(null);
      }
    },
    [photos, onChange, uploadingIndex]
  );

  const removeAt = useCallback(
    (index) => {
      onChange(photos.filter((_, i) => i !== index));
      setUploadError('');
    },
    [photos, onChange]
  );

  const handleDrop = useCallback(
    (e, index) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        uploadAt(file, index);
      } else if (file) {
        setUploadError('Invalid file type. Please drop a JPG, PNG, or WebP image.');
      }
    },
    [uploadAt]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <fieldset className="border-0 p-0 m-0" disabled={disabled}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <legend className="text-xs font-semibold text-muted-foreground">Optional photos</legend>
        <div
          className="rounded-full border border-alert/25 bg-alert/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-alert"
          aria-label={`${photos.length} of ${MAX_ALERT_PHOTOS} photos uploaded`}
        >
          {photos.length}/{MAX_ALERT_PHOTOS} max
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Photo upload slots">
        {slots.map((photo, index) => (
          <div
            key={index}
            className={cn(
              'rounded-2xl border border-border/70 bg-black/30 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] transition-colors',
              dragOver && !photo && 'border-alert/60 bg-alert/10'
            )}
          >
            {photo ? (
              <div className="space-y-2">
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-alert/20 bg-black/45 p-1.5">
                  <img
                    src={photo.previewUrl || photo}
                    className="max-h-28 w-full object-contain"
                    alt={`Alert photo ${index + 1} preview`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Image failed to load';
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={cn(
                      'flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition',
                      'hover:border-alert/50 hover:text-alert',
                      'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
                      uploadingIndex === index && 'opacity-70 pointer-events-none'
                    )}
                  >
                    <input
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      type="file"
                      accept={ACCEPTED_TYPES}
                      onChange={(e) => {
                        uploadAt(e.target.files?.[0], index);
                        e.target.value = '';
                      }}
                      className="sr-only"
                      aria-label={`Replace photo ${index + 1}`}
                      disabled={uploadingIndex !== null || disabled}
                    />
                    {uploadingIndex === index ? 'Preparing...' : 'Replace'}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className={cn(
                      'flex h-11 min-h-[44px] items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition',
                      'hover:border-destructive/50 hover:text-destructive',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                    aria-label={`Remove photo ${index + 1}`}
                    disabled={uploadingIndex !== null || disabled}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={cn(
                  'flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-3 text-center transition',
                  canAddMore
                    ? 'border-alert/30 bg-alert/5 hover:border-alert/60 hover:bg-alert/10'
                    : 'border-border/30 bg-black/20 opacity-50 cursor-not-allowed',
                  'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
                )}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={(e) => {
                    uploadAt(e.target.files?.[0], index);
                    e.target.value = '';
                  }}
                  className="sr-only"
                  disabled={!canAddMore || uploadingIndex !== null}
                  aria-label={`Upload alert photo ${index + 1}`}
                  aria-describedby={uploadError ? 'alert-upload-error' : undefined}
                />
                {uploadingIndex === index ? (
                  <Upload className="mb-2 h-5 w-5 animate-pulse text-alert" aria-hidden="true" />
                ) : (
                  <Image className="mb-2 h-5 w-5 text-alert" aria-hidden="true" />
                )}
                <div className="text-sm font-bold text-foreground">
                  {uploadingIndex === index ? 'Preparing...' : 'Add photo'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {uploadingIndex === index ? 'Validating image...' : 'Hazard, road, or scene context'}
                </div>
              </label>
            )}
          </div>
        ))}
      </div>

      {uploadError && (
        <div
          id="alert-upload-error"
          className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
          <p className="text-sm text-destructive">{uploadError}</p>
        </div>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {uploadingIndex !== null && `Uploading photo ${uploadingIndex + 1}`}
        {uploadingIndex === null && photos.length > 0 && `${photos.length} photo${photos.length > 1 ? 's' : ''} attached`}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Attach up to {MAX_ALERT_PHOTOS} safety photos (JPG, PNG, or WebP). Photos are optional.
      </p>
    </fieldset>
  );
}
