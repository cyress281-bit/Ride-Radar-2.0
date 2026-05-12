import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';

const PILL_COLORS = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  cyan: 'text-cyan bg-cyan/10 border-cyan/20',
  red: 'text-pulse bg-pulse/10 border-pulse/20',
  amber: 'text-amber bg-amber/10 border-amber/20',
};

const VALUE_COLORS = {
  primary: 'text-primary',
  cyan: 'text-cyan',
  red: 'text-pulse',
  amber: 'text-amber',
};

/**
 * Compact metric pill with icon, value, and label.
 *
 * @param {object} props
 * @param {string|number} props.value
 * @param {string} props.label
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {'primary'|'cyan'|'red'|'amber'} [props.color='primary']
 * @param {string} [props.className]
 */
export const StatPill = memo(function StatPill({
  value,
  label,
  icon: Icon,
  color = 'primary',
  className,
}) {
  const pillColor = PILL_COLORS[color] || PILL_COLORS.primary;
  const valueColor = VALUE_COLORS[color] || VALUE_COLORS.primary;

  return (
    <HStack
      align="center"
      gap={2}
      className={cn('inline-flex rounded-full border px-3 py-1.5', pillColor, className)}
    >
      {Icon && <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />}
      <Text variant="bodySm" className={cn('font-bold', valueColor)}>
        {value}
      </Text>
      <Text variant="micro" color="muted" className="opacity-80">
        {label}
      </Text>
    </HStack>
  );
});
