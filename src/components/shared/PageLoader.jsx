import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} PageLoaderProps
 * @property {string} [message='Loading...'] - Optional loading message
 * @property {string} [className] - Additional classes for the wrapper
 */

/**
 * PageLoader — Suspense fallback with animated EKG heartbeat.
 *
 * Shows a centered glassmorphism card with an EKG line animation
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
        {/* EKG heartbeat animation */}
        <div className="relative h-14 w-40 flex items-center justify-center">
          <svg
            viewBox="0 0 200 60"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <filter id="ekgGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0 0 0 0 0.22 0 0 0 0 1 0 0 0 0 0.08 0 0 0 0.7 0"
                />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M0 30 H40 L50 30 L55 12 L65 48 L72 30 L80 30 L85 30 L95 30 L100 8 L110 52 L118 30 L128 30 L140 30 L150 30 L155 18 L162 42 L168 30 L200 30"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#ekgGlow)"
              className="animate-ekg"
              style={{ opacity: 0.85 }}
            />
          </svg>
          {/* Pulse dot */}
          <span className="absolute h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))] animate-pulse" />
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
