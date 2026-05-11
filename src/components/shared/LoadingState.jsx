import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import RRLogo from '@/components/RRLogo';

/**
 * Brand-consistent loading state with variants.
 *
 * @param {object} props
 * @param {'page'|'section'|'inline'|'skeleton'} [props.variant='section'] - Visual variant
 * @param {string} [props.message='Loading...'] - Loading message
 * @param {string} [props.className] - Additional classes
 */
export const LoadingState = memo(function LoadingState({
  variant = 'section',
  message = 'Loading...',
  className,
}) {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div
        className={cn(
          'flex min-h-[50vh] flex-col items-center justify-center',
          className
        )}
      >
        <div className="relative flex items-center justify-center">
          <span
            className="absolute h-20 w-20 rounded-full bg-primary/10 animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
          <RRLogo
            size="md"
            className="relative animate-pulse"
            style={{ animationDuration: '2s' }}
          />
        </div>
        <p className="mt-4 text-sm font-bold tracking-wide text-foreground">
          {message}
        </p>
      </div>
    );
  }

  // variant === 'section' (default)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute h-16 w-16 rounded-full bg-primary/10 animate-ping"
          style={{ animationDuration: '2.4s' }}
        />
        <RRLogo
          size="sm"
          className="relative animate-pulse"
          style={{ animationDuration: '2s' }}
        />
      </div>
      <p className="mt-3 text-sm font-bold tracking-wide text-foreground">
        {message}
      </p>
    </div>
  );
});
