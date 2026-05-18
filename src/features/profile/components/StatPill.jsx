import { memo } from 'react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';

const BRAND_STYLES = {
  green: { border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary' },
  radar: { border: 'border-brand-radar/20', bg: 'bg-brand-radar/10', text: 'text-brand-radar' },
  amber: { border: 'border-brand-amber/20', bg: 'bg-brand-amber/10', text: 'text-brand-amber' },
};

const StatPill = memo(function StatPill({ icon: Icon, label, value, isLoading, brand = 'green' }) {
  const style = BRAND_STYLES[brand];
  return (
    <div className="flex-1 surface-card p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', style.border, style.bg)}>
          <Icon className={cn('h-3.5 w-3.5', style.text)} />
        </div>
      </div>
      <Text variant="bodySm" className={cn('block font-bold truncate', style.text)}>
        {isLoading ? '—' : value}
      </Text>
      <Text variant="micro" color="muted" className="block">{label}</Text>
    </div>
  );
});

export default StatPill;
