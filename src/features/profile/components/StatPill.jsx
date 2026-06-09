import { memo } from 'react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';

const BRAND_STYLES = {
  green: { border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary' },
  radar: { border: 'border-brand-radar/20', bg: 'bg-brand-radar/10', text: 'text-brand-radar' },
  amber: { border: 'border-brand-amber/20', bg: 'bg-brand-amber/10', text: 'text-brand-amber' },
  blue: { border: 'border-event/20', bg: 'bg-event/10', text: 'text-event' },
};

const StatPill = memo(function StatPill({ icon: Icon, label, value, isLoading, brand = 'green', onClick }) {
  const style = BRAND_STYLES[brand];
  const interactive = typeof onClick === 'function';
  const Component = interactive ? 'button' : 'div';
  const displayValue = isLoading ? '---' : value;

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={interactive ? `${label}: ${displayValue}` : undefined}
      className={cn(
        'flex-1 text-center transition-all',
        interactive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45'
      )}
    >
      <div className="mb-2 flex items-center justify-center">
        <Icon className={cn('h-4 w-4', style.text)} strokeWidth={2} />
      </div>
      <Text variant="bodySm" className={cn('block truncate font-bold tracking-tight', style.text)}>
        {displayValue}
      </Text>
      <Text variant="micro" color="muted" className="block">
        {label}
      </Text>
    </Component>
  );
});

export default StatPill;
