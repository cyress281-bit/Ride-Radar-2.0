import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Button } from './Button';

/**
 * Section title with optional subtitle and action.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {{ label: string, onClick: () => void }} [props.action]
 * @param {string} [props.className]
 */
export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  action,
  className,
}) {
  return (
    <HStack align="start" justify="between" className={cn('w-full', className)}>
      <VStack gap={0.5}>
        <Text as="h2" variant="h2" color="default">
          {title}
        </Text>
        {subtitle && (
          <Text variant="bodySm" color="muted">
            {subtitle}
          </Text>
        )}
      </VStack>
      {action && (
        <Button variant="ghost" size="sm" onClick={action.onClick} className="shrink-0 mt-0.5">
          {action.label}
        </Button>
      )}
    </HStack>
  );
});
