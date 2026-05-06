import { useState, useRef, useCallback } from 'react';
import { prepareLocalImage, getImagePreview } from '@/lib/localImageUpload';
import { Button } from '@/components/ui/button';
import { Bike, ImagePlus, X, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp';

/**
 * BikePhotoUploader - Single photo upload for rider's bike.
 *
 * Accessibility:
 * - File input has descriptive aria-label
 * - Processing state announced via aria-live region
 * - Error messages associated via aria-describedby
 * - All buttons meet 44px minimum touch target
 * - Focus management returns to upload trigger after removal
 * - Drag and drop support with visual feedback
 *
 * Edge cases:
 * - Handles rapid re-uploads without stale state
 * - Image load failures show fallback UI with retry option
 * - Clears file input value after each interaction
 * - Prevents double-submission during processing
 */
export default function BikePhotoUploader({ image, onChange, disabled = false }) {
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const preview = getImagePreview(image);

  const handleUpload = useCallback(async (file) => {
    if (!file || processing) return;
    setProcessing(true);
    setUploadError('');
    setImageLoadError(false);
    try {
      const localImage = await prepareLocalImage(file, 'bike');
      onChange(localImage);
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Image validation failed. Please try another image.';
      setUploadError(message);
    } finally {
      setProcessing(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onChange, processing]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    onChange('');
    setUploadError('');
    setImageLoadError(false);
    // Return focus to the upload area
    setTimeout(() => {
      fileInputRef.current?.focus();
    }, 100);
  }, [onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    } else if (file) {
      setUploadError('Invalid file type. Please drop a JPG, PNG, or WebP image.');
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <fieldset className="border-0 p-0 m-0" disabled={disabled}>
      <div
        className={cn(
          'rounded-2xl border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] transition-colors',
          dragOver && !preview && 'border-primary/60 bg-primary/10'
        )}
      >
        {preview && !imageLoadError ? (
          <div className="space-y-3">
            {/* Image preview */}
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-secondary/30">
              <img
                src={preview}
                className="h-36 w-full object-cover"
                alt="Your bike photo preview"
                loading="lazy"
                onError={() => setImageLoadError(true)}
              />
              <div
                className="absolute left-3 top-3 rounded-full border border-primary/30 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur-md"
                aria-hidden="true"
              >
                Bike photo
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <label
                className={cn(
                  'flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition',
                  'hover:border-primary/50 hover:text-primary',
                  'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
                  processing && 'opacity-70 pointer-events-none'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Replace bike photo"
                  disabled={processing || disabled}
                />
                {processing ? (
                  <span className="flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                    Preparing...
                  </span>
                ) : (
                  'Replace'
                )}
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={processing || disabled}
                className="h-11 min-h-[44px] rounded-full text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Remove bike photo"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </Button>
            </div>
          </div>
        ) : preview && imageLoadError ? (
          /* Image load error state */
          <div className="space-y-3">
            <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5">
              <AlertCircle className="mb-2 h-6 w-6 text-destructive" aria-hidden="true" />
              <p className="text-xs font-semibold text-foreground">Image failed to load</p>
              <p className="mt-1 text-xs text-muted-foreground">The preview may be corrupted</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={cn(
                  'flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition gap-1.5',
                  'hover:border-primary/50 hover:text-primary',
                  'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Upload a different bike photo"
                  disabled={processing || disabled}
                />
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Try another
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                disabled={processing || disabled}
                className="h-11 min-h-[44px] rounded-full text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                aria-label="Remove broken photo"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          /* Empty state - upload trigger */
          <label
            className={cn(
              'flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition',
              !disabled
                ? 'border-primary/25 bg-primary/5 hover:border-primary/50 hover:bg-primary/10'
                : 'border-border/30 bg-black/20 opacity-50 cursor-not-allowed',
              'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload bike photo"
              aria-describedby={uploadError ? 'bike-upload-error' : 'bike-upload-help'}
              disabled={processing || disabled}
            />
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              {processing ? (
                <ImagePlus className="h-4 w-4 animate-pulse" aria-hidden="true" />
              ) : (
                <Bike className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <div className="text-sm font-bold text-foreground">
              {processing ? 'Preparing preview...' : 'Add one bike photo'}
            </div>
            <div id="bike-upload-help" className="mt-1 text-xs text-muted-foreground">
              {processing ? 'Validating image...' : 'Optional. JPG, PNG, or WebP up to 10MB.'}
            </div>
          </label>
        )}

        {/* Error message */}
        {uploadError && (
          <div
            id="bike-upload-error"
            className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}

        {/* Screen reader status */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {processing && 'Processing bike photo upload'}
          {!processing && preview && !imageLoadError && 'Bike photo uploaded successfully'}
        </div>
      </div>
    </fieldset>
  );
}
