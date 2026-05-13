import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

const MAX_RETRIES = 3;
const DEFAULT_FADE_MS = 300;

// Shared IntersectionObserver to avoid spawning dozens/hundreds of observers
const observerCallbacks = new Map();
let sharedObserver = null;

function getSharedObserver() {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cb = observerCallbacks.get(entry.target);
          if (cb && entry.isIntersecting) {
            cb();
            observerCallbacks.delete(entry.target);
            if (observerCallbacks.size === 0) {
              sharedObserver?.disconnect();
              sharedObserver = null;
            }
          }
        });
      },
      { rootMargin: '200px' }
    );
  }
  return sharedObserver;
}

function observeElement(el, callback) {
  observerCallbacks.set(el, callback);
  getSharedObserver().observe(el);
}

function unobserveElement(el) {
  observerCallbacks.delete(el);
  sharedObserver?.unobserve(el);
}

/**
 * @typedef {object} OptimizedImageProps
 * @property {string} src - Primary image URL
 * @property {string} [alt=''] - Alt text for accessibility
 * @property {string} [className] - Additional CSS classes for the image
 * @property {string} [containerClassName] - CSS classes for the wrapper div
 * @property {string} [sizes] - Sizes attribute for responsive images
 * @property {string} [placeholder] - Base64 data URI or tiny image URL for blur-up effect
 * @property {'lazy'|'eager'} [loading='lazy'] - Native loading strategy
 * @property {'cover'|'contain'|'fill'|'none'} [objectFit='cover'] - Object-fit behavior
 * @property {number} [fadeInDuration=300] - Fade-in transition duration in ms
 * @property {boolean} [disableAnimation=false] - When true, uses a plain <img> with CSS transition instead of Framer Motion (reduces JS overhead in long lists)
 * @property {() => void} [onLoad] - Callback when image successfully loads
 * @property {() => void} [onError] - Callback on load error
 * @property {string} [fallbackSrc] - Fallback image URL on error
 * @property {number} [width] - Intrinsic width for aspect ratio
 * @property {number} [height] - Intrinsic height for aspect ratio
 */

/**
 * OptimizedImage — Memoized image component with lazy loading, skeleton, blur-up,
 * retry logic, and graceful error fallback.
 *
 * @param {OptimizedImageProps} props
 * @returns {JSX.Element | null}
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt = '',
  className,
  containerClassName,
  sizes,
  placeholder,
  loading = 'lazy',
  objectFit = 'cover',
  _fadeInDuration = DEFAULT_FADE_MS,
  disableAnimation = false,
  onLoad,
  onError,
  fallbackSrc,
  width,
  height,
  ...rest
}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(loading !== 'lazy');

  // Intersection Observer for lazy loading (shared module-level observer)
  useEffect(() => {
    if (loading !== 'lazy') return;
    const el = containerRef.current;
    if (!el) return;

    observeElement(el, () => setIsIntersecting(true));
    return () => unobserveElement(el);
  }, [loading]);

  // Reset state when src changes
  useEffect(() => {
    if (src) {
      setStatus('loading');
      setRetryCount(0);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setStatus('error');
    onError?.();
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      const nextCount = retryCount + 1;
      setRetryCount(nextCount);
      setStatus('loading');
      if (imgRef.current) {
        const separator = src.includes('?') ? '&' : '?';
        imgRef.current.src = `${src}${separator}_retry=${nextCount}`;
      }
    }
  }, [retryCount, src]);

  if (!src) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden flex items-center justify-center bg-secondary/40',
          containerClassName
        )}
        style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
      >
        <ImageIcon className="w-6 h-6 text-muted-foreground/40" aria-hidden="true" />
      </div>
    );
  }

  const objectFitClass =
    {
      cover: 'object-cover',
      contain: 'object-contain',
      fill: 'object-fill',
      none: 'object-none',
    }[objectFit] || 'object-cover';

  const isLoaded = status === 'loaded';
  const isError = status === 'error';
  const shouldLoad = isIntersecting || loading === 'eager';

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', containerClassName)}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {/* Blur-up placeholder */}
      {placeholder && !isLoaded && !isError && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full',
            objectFitClass,
            'blur-lg scale-110 transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
        />
      )}

      {/* Skeleton loader */}
      {!placeholder && !isLoaded && !isError && (
        <div className="absolute inset-0 animate-pulse bg-primary/10" />
      )}

      {/* Error fallback */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/50 text-muted-foreground">
          <ImageIcon className="w-8 h-8 opacity-40" aria-hidden="true" />
          {retryCount < MAX_RETRIES && (
            <button
              onClick={handleRetry}
              className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main image */}
      {shouldLoad && !isError && (
        disableAnimation ? (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            sizes={sizes}
            loading={loading}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'w-full h-full',
              objectFitClass,
              className
            )}
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'scale(1)' : 'scale(1.02)',
              transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
            }}
            width={width}
            height={height}
            {...rest}
          />
        ) : (
          <motion.img
            ref={imgRef}
            src={src}
            alt={alt}
            sizes={sizes}
            loading={loading}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={isLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={cn(
              'w-full h-full',
              objectFitClass,
              className
            )}
            width={width}
            height={height}
            {...rest}
          />
        )
      )}

      {/* Fallback source swap on final error */}
      {isError && fallbackSrc && (
        <img
          src={fallbackSrc}
          alt={alt}
          className={cn('w-full h-full', objectFitClass, className)}
          loading={loading}
          width={width}
          height={height}
        />
      )}
    </div>
  );
});

export default OptimizedImage;

/**
 * OptimizedAvatar — Convenience wrapper for circular avatar images.
 *
 * @param {Object} props
 * @param {string} [props.src] - Avatar image URL
 * @param {string} [props.alt=''] - Alt text
 * @param {string} [props.placeholder] - Blur-up placeholder
 * @param {number} [props.size=40] - Diameter in px
 * @param {string} [props.className] - Extra classes
 * @param {string} [props.fallbackInitial] - Initial to show when no image
 * @returns {JSX.Element}
 */
export const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  alt = '',
  placeholder,
  size = 40,
  className,
  fallbackInitial,
  ...rest
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-primary-foreground',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitial || '?'}
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
      onError={() => setHasError(true)}
      {...rest}
    />
  );
});
