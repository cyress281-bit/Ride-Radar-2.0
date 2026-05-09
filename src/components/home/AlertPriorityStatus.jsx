import { memo } from 'react';
import { ShieldAlert, Zap } from 'lucide-react';
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
      'relative flex min-h-[64px] items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]',
      hasAlerts
        ? 'border-alert/35 bg-alert/[0.07] text-alert'
        : 'border-border/60 bg-black/22 text-muted-foreground'
    )}>
      {/* Urgency pulse glow */}
      {hasAlerts && (
        <div className="pointer-events-none absolute inset-0 animate-pulse-alert opacity-20" aria-hidden="true">
          <div className="absolute inset-0 bg-alert/10" />
        </div>
      )}

      {/* Left urgency stripe */}
      {hasAlerts && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-alert animate-pulse-alert" aria-hidden="true" />
      )}

      <div className="relative flex min-w-0 items-center gap-2.5">
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          hasAlerts
            ? 'border-alert/40 bg-alert/15 text-alert shadow-[0_0_16px_hsl(var(--alert)/0.3)]'
            : 'border-border/70 bg-black/30'
        )}>
          {hasAlerts ? <Zap className="h-4 w-4" /> : <ShieldAlert className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <div className={cn(
            'text-[9px] font-bold uppercase tracking-[0.13em]',
            hasAlerts ? 'text-alert/75' : 'opacity-75'
          )}>
            Safety Status
          </div>
          <div className={cn(
            'truncate text-[11px] font-extrabold',
            hasAlerts && 'text-alert'
          )}>
            {hasAlerts ? `${count} Active Alert${count === 1 ? '' : 's'}` : 'No Active Alerts'}
          </div>
        </div>
      </div>

      {/* Urgency indicator dot */}
      {hasAlerts && (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-alert shadow-[0_0_8px_hsl(var(--alert)/0.8)]" />
        </span>
      )}
    </div>
  );
});

export default AlertPriorityStatus;
