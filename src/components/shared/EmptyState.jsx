import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { Button } from './Button';

/**
 * Consistent empty state with icon, title, description, and optional action.
 *
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {{ label: string, onClick: () => void }} [props.action]
 * @param {string} [props.className]
 */
export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <VStack
      align="center"
      justify="center"
      gap={4}
      className={cn(
        'w-full rounded-[1rem] border border-border bg-surface p-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-primary/10">
          <Icon className="h-7 w-7 text-primary/80" aria-hidden="true" />
        </div>
      )}

      <VStack gap={1} align="center">
        <Text as="h3" variant="h3" color="default">
          {title}
        </Text>
        {description && (
          <Text variant="bodySm" color="muted" className="max-w-xs">
            {description}
          </Text>
        )}
      </VStack>

      {action && (
        <Button variant="outline" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </VStack>
  );
});
