import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Consistent error state with retry action.
 *
 * @param {object} props
 * @param {string} [props.title='Something went wrong'] - Error title
 * @param {string} [props.message] - Error description
 * @param {() => void} [props.onRetry] - Retry callback
 * @param {string} [props.className] - Additional classes
 */
export const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) {
  return (
    <div
      className={cn(
        'bg-surface border border-destructive/20 rounded-[1rem] p-5',
        'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive animate-pulse" />
      </div>

      <h3 className="font-semibold text-lg text-foreground">{title}</h3>

      {message && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      )}

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4 rounded-full border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <AlertCircle className="mr-1.5 h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
});
