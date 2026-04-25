import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertPriorityStatus({ count }) {
  const hasAlerts = count > 0;

  return (
    <div className={cn(
      'mt-2.5 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]',
      hasAlerts
        ? 'border-alert/35 bg-black/40 text-alert'
        : 'border-border/70 bg-black/25 text-muted-foreground'
    )}>
      <div className="flex items-center gap-2.5">
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border bg-black/30',
          hasAlerts ? 'border-alert/30' : 'border-border/70'
        )}>
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">Safety status</div>
          <div className="text-sm font-extrabold">
            {hasAlerts ? `${count} Active Alert${count === 1 ? '' : 's'} Nearby` : 'No Active Alerts'}
          </div>
        </div>
      </div>
      {hasAlerts && <span className="h-px w-8 bg-alert/60" />}
    </div>
  );
}