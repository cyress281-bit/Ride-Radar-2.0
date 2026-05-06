import { memo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Memoized alert priority badge - only re-renders when alert count changes.
 * In Home.jsx this sits in the header area and would otherwise re-render
 * on every feed filter/sort interaction.
 */
const AlertPriorityStatus = memo(function AlertPriorityStatus({ count }) {
  const hasAlerts = count > 0;

  return (
    <div className={cn(
      'flex min-h-[64px] items-center justify-between gap-2 rounded-xl border px-2.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]',
      hasAlerts
        ? 'border-alert/28 bg-alert/5 text-alert'
        : 'border-border/60 bg-black/22 text-muted-foreground'
    )}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-black/30',
          hasAlerts ? 'border-alert/30' : 'border-border/70'
        )}>
          <ShieldAlert className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.13em] opacity-75">Safety Status</div>
          <div className="truncate text-[11px] font-extrabold">
            {hasAlerts ? `${count} Active Alert${count === 1 ? '' : 's'}` : 'No Active Alerts'}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AlertPriorityStatus;