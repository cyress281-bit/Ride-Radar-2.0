import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';

/**
 * Enhanced loading state with spinner, skeleton, and shimmer variants.
 * Electric neon edition.
 *
 * @param {object} props
 * @param {'spinner'|'skeleton'|'shimmer'} [props.variant='spinner']
 * @param {string} [props.message]
 * @param {string} [props.className]
 */
export const LoadingState = memo(function LoadingState({
  variant = 'spinner',
  message,
  className,
}) {
  if (variant === 'skeleton') {
    return (
      <div className={cn('w-full space-y-3 animate-fade-in', className)}>
        <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (variant === 'shimmer') {
    return (
      <div className={cn('w-full space-y-3 animate-fade-in', className)}>
        <div
          className="h-32 w-full rounded-xl animate-shimmer"
          style={{
            backgroundImage:
              'linear-gradient(90deg, hsl(var(--muted)), hsl(var(--primary)/0.12), hsl(var(--muted)))',
            backgroundSize: '200% 100%',
          }}
        />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
      </div>
    );
  }

  // spinner — neon green radar spinner
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div className="relative" role="status" aria-label="Loading">
        <div
          className="h-10 w-10 rounded-full border-2 border-primary/20"
          style={{
            borderTopColor: 'hsl(var(--primary))',
            animation: 'radar-sweep 1s linear infinite',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 12px hsl(var(--primary) / 0.3)',
            animation: 'glow-pulse 2s ease-in-out infinite',
          }}
        />
      </div>
      {message && (
        <Text variant="bodySm" color="muted">
          {message}
        </Text>
      )}
    </div>
  );
});
