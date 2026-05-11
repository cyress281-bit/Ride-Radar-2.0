import { memo } from 'react';
import { cn } from '@/lib/utils';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

/**
 * @typedef {object} PageLoaderProps
 * @property {string} [message='Loading...'] - Optional loading message
 * @property {string} [className] - Additional classes for the wrapper
 */

/**
 * PageLoader — Suspense fallback with brand logo pulse.
 *
 * Shows a centered glassmorphism card with the Ride Radar logo
 * and pulsing dots. Used as the default fallback for React.lazy()
 * routes wrapped in `<Suspense>`.
 *
 * @param {PageLoaderProps} props
 * @returns {JSX.Element}
 */
const PageLoader = memo(function PageLoader({
  message = 'Loading...',
  className,
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6 z-50',
        className
      )}
    >
      <div
        className={cn(
          'flex w-full max-w-[320px] flex-col items-center gap-5 rounded-[24px] p-8 text-center',
          'rr-surface'
        )}
      >
        {/* Brand logo with pulse glow */}
        <div className="relative flex items-center justify-center">
          <span className="absolute h-20 w-20 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2.4s' }} />
          <img
            src={RIDE_RADAR_LOGO_URL}
            alt="Ride Radar"
            className="relative h-16 w-auto object-contain drop-shadow-[0_0_16px_hsl(var(--primary)/0.45)] animate-pulse"
            style={{ animationDuration: '2s' }}
          />
        </div>

        {/* Message + pulsing dots */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold tracking-wide text-foreground">
            {message}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="h-1 w-1 rounded-full bg-primary/40 animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1 w-1 rounded-full bg-primary/40 animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1 w-1 rounded-full bg-primary/40 animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PageLoader;
