import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WifiOff, ServerCrash, RotateCcw } from 'lucide-react';

/**
 * @typedef {object} QueryErrorProps
 * @property {Error|null} error - The error object from the query
 * @property {() => void} [onRetry] - Callback to retry the failed query
 * @property {string} [className] - Additional classes for the wrapper
 */

/**
 * QueryError — Consistent error UI for query / data-fetching failures.
 *
 * Distinguishes between network errors (offline / unreachable) and server errors
 * (5xx, bad response) to show context-appropriate messaging and styling.
 *
 * @param {QueryErrorProps} props
 * @returns {JSX.Element}
 */
const QueryError = memo(function QueryError({ error, onRetry, className }) {
  const message = error?.message || 'Something went wrong';
  const isNetworkError =
    !navigator.onLine ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('fetch') ||
    message.toLowerCase().includes('timeout');

  const Icon = isNetworkError ? WifiOff : ServerCrash;
  const title = isNetworkError ? 'Connection Issue' : 'Server Error';
  const description = isNetworkError
    ? 'Check your connection and try again.'
    : 'Our servers are having trouble. Please retry in a moment.';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-[20px] p-8',
          'rr-surface-strong',
          'border',
          isNetworkError ? 'border-destructive/20' : 'border-primary/15'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            isNetworkError
              ? 'bg-destructive/10 text-destructive shadow-[0_0_24px_hsl(var(--destructive)/0.16)]'
              : 'bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.18)]'
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 className="font-display text-lg font-extrabold text-foreground mb-1">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-1">{description}</p>
        <p className="text-xs text-muted-foreground/60 mb-5 font-mono">
          {message}
        </p>

        {/* Retry */}
        {onRetry && (
          <Button
            onClick={onRetry}
            className={cn(
              'font-bold tracking-wide gap-2',
              isNetworkError
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
            )}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
});

export default QueryError;
