import { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { Button } from '@/components/ui/primitives/Button';

/**
 * ErrorState — Redesigned error UI with emergency red accents.
 *
 * @param {object} props
 * @param {string} [props.title='Something went wrong']
 * @param {string} [props.description]
 * @param {() => void} [props.onRetry]
 * @param {string} [props.className]
 */
export const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}) {
  return (
    <VStack
      align="center"
      justify="center"
      gap={4}
      className={cn(
        'w-full rounded-[1rem] border border-destructive/20 bg-surface p-8 text-center relative overflow-hidden',
        className
      )}
    >
      {/* Subtle emergency glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 30%, hsl(var(--destructive) / 0.06), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
        <AlertCircle
          className="h-7 w-7 text-destructive animate-pulse rr-neon-red"
          aria-hidden="true"
        />
      </div>

      <VStack gap={1} align="center" className="relative z-10">
        <Text as="h3" variant="h3" color="default">
          {title}
        </Text>
        {description && (
          <Text variant="bodySm" color="muted" className="max-w-xs">
            {description}
          </Text>
        )}
      </VStack>

      {onRetry && (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          leftIcon={AlertCircle}
        >
          Retry
        </Button>
      )}
    </VStack>
  );
});
