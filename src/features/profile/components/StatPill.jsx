import { memo } from 'react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';

const BRAND_STYLES = {
  green: { border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary' },
  radar: { border: 'border-brand-radar/20', bg: 'bg-brand-radar/10', text: 'text-brand-radar' },
  amber: { border: 'border-brand-amber/20', bg: 'bg-brand-amber/10', text: 'text-brand-amber' },
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
        'flex-1 surface-card p-3 text-center',
        interactive && 'cursor-pointer transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45'
      )}
    >
      <div className="flex items-center justify-center mb-1.5">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', style.border, style.bg)}>
          <Icon className={cn('h-3.5 w-3.5', style.text)} strokeWidth={2} />
        </div>
      </div>
      <Text variant="bodySm" className={cn('block font-bold truncate', style.text)}>
        {displayValue}
      </Text>
      <Text variant="micro" color="muted" className="block">{label}</Text>
    </Component>
  );
});

export default StatPill;
