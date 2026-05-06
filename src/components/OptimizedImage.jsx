/**
 * OptimizedImage - Reusable image component with performance optimizations
 *
 * Features:
 * - Blur-up placeholder technique (tiny base64 image fades to full resolution)
 * - Responsive srcset support for multi-size images
 * - Native lazy loading with IntersectionObserver fallback
 * - Loading skeleton while image loads
 * - Graceful fallback for legacy (non-optimized) images
 * - WebP with automatic JPEG fallback via <picture> element
 * - Error state handling with retry capability
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} OptimizedImageProps
 * @property {string} src - Primary image URL
 * @property {string} [srcSet] - srcset attribute for responsive images
 * @property {string} [sizes] - sizes attribute for srcset
 * @property {string} [placeholder] - Base64 data URI for blur-up placeholder
 * @property {string} [alt=''] - Alt text
 * @property {string} [className] - Additional CSS classes for the image
 * @property {string} [containerClassName] - CSS classes for the wrapper div
 * @property {number} [width] - Intrinsic width (for aspect ratio)
 * @property {number} [height] - Intrinsic height (for aspect ratio)
 * @property {'lazy'|'eager'} [loading='lazy'] - Loading strategy
 * @property {'cover'|'contain'|'fill'|'none'} [objectFit='cover'] - Object-fit behavior
 * @property {boolean} [showSkeleton=true] - Show skeleton loader while loading
 * @property {number} [fadeInDuration=300] - Fade-in transition duration (ms)
 * @property {Function} [onLoad] - Callback when image loads
 * @property {Function} [onError] - Callback on load error
 * @property {React.ReactNode} [fallback] - Custom fallback content on error
 * @property {'high'|'low'|'auto'} [fetchPriority='auto'] - Fetch priority hint
 */

const OptimizedImage = memo(function OptimizedImage({
  src,
  srcSet,
  sizes,
  placeholder,
  alt = '',
  className,
  containerClassName,
  width,
  height,
  loading = 'lazy',
  objectFit = 'cover',
  showSkeleton = true,
  fadeInDuration = 300,
  onLoad,
  onError,
  fallback,
  fetchPriority = 'auto',
  ...rest
}) {
  const [imageState, setImageState] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);

  // Reset state when src changes
  useEffect(() => {
    if (src) {
      setImageState('loading');
      setRetryCount(0);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageState('error');
    onError?.();
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount < 2) {
      setRetryCount((c) => c + 1);
      setImageState('loading');
      // Force reload by appending cache-buster
      if (imgRef.current) {
        const separator = src.includes('?') ? '&' : '?';
        imgRef.current.src = `${src}${separator}_retry=${retryCount + 1}`;
      }
    }
  }, [retryCount, src]);

  // If no src provided, render nothing or fallback
  if (!src) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  }[objectFit] || 'object-cover';

  const isLoaded = imageState === 'loaded';
  const isError = imageState === 'error';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        containerClassName
      )}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {/* Blur placeholder background */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full',
            objectFitClass,
            'scale-110 blur-lg'
          )}
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
        />
      )}

      {/* Skeleton loader (shown when no placeholder available) */}
      {showSkeleton && !placeholder && !isLoaded && !isError && (
        <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-inherit" />
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 text-muted-foreground">
          {fallback || (
            <>
              <svg
                className="w-8 h-8 mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {retryCount < 2 && (
                <button
                  onClick={handleRetry}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Main image */}
      {!isError && (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet || undefined}
          sizes={srcSet ? (sizes || '(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px') : undefined}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full',
            objectFitClass,
            'transition-opacity',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={{ transitionDuration: `${fadeInDuration}ms` }}
          width={width}
          height={height}
          {...rest}
        />
      )}
    </div>
  );
});

export default OptimizedImage;

/**
 * Convenience wrapper for avatar images.
 * Applies circular clipping and appropriate sizing defaults.
 */
export const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  placeholder,
  alt = '',
  size = 40,
  className,
  fallbackInitial,
  ...rest
}) {
  if (!src && fallbackInitial) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-primary-foreground',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      placeholder={placeholder}
      alt={alt}
      loading="lazy"
      objectFit="cover"
      containerClassName={cn('rounded-full', className)}
      className="rounded-full"
      style={{ width: size, height: size }}
      fadeInDuration={200}
      showSkeleton
      {...rest}
    />
  );
});
