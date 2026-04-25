import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AlertPriorityStatus({ count }) {
  const hasAlerts = count > 0;

  return (
    <div className={cn(
      'mt-2.5 flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]',
      hasAlerts
        ? 'border-alert/45 bg-alert/10 text-alert shadow-[0_0_26px_hsl(var(--alert)/0.14)]'
        : 'border-border/70 bg-black/25 text-muted-foreground'
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl border',
          hasAlerts ? 'border-alert/35 bg-alert/10' : 'border-border/70 bg-secondary/20'
        )}>
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Safety status</div>
          <div className="text-sm font-extrabold">
            {hasAlerts ? `${count} Active Alert${count === 1 ? '' : 's'} Nearby` : 'No Active Alerts'}
          </div>
        </div>
      </div>
      {hasAlerts && <span className="h-2 w-2 rounded-full bg-alert animate-pulse" />}
    </div>
  );
}