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
        'flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/82 px-3 py-3 text-center shadow-[0_12px_34px_hsl(0_0%_0%/0.28),inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl transition-all',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45'
      )}
    >
      <div className="mb-2 flex items-center justify-center">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm', style.border, style.bg)}>
          <Icon className={cn('h-3.5 w-3.5', style.text)} strokeWidth={2} />
        </div>
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
