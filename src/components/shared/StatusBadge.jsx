import { memo } from 'react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  online: {
    dot: 'bg-primary',
    glow: 'shadow-[0_0_6px_hsl(var(--primary)/0.6)]',
    label: 'Online',
  },
  away: {
    dot: 'bg-amber',
    glow: 'shadow-[0_0_6px_hsl(var(--amber)/0.5)]',
    label: 'Away',
  },
  offline: {
    dot: 'bg-muted-foreground',
    glow: '',
    label: 'Offline',
  },
  busy: {
    dot: 'bg-destructive',
    glow: 'shadow-[0_0_6px_hsl(var(--destructive)/0.6)]',
    label: 'Busy',
  },
};

/**
 * StatusBadge — Online/offline/away indicator with neon glow.
 *
 * @param {object} props
 * @param {'online'|'away'|'offline'|'busy'} [props.status='offline']
 * @param {boolean} [props.showLabel=false]
 * @param {'sm'|'md'} [props.size='sm']
 * @param {string} [props.className]
 */
export const StatusBadge = memo(function StatusBadge({
  status = 'offline',
  showLabel = false,
  size = 'sm',
  className,
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const dotSize = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        showLabel && 'bg-surface-elevated border border-border px-2 py-0.5',
        className
      )}
    >
      <span
        className={cn(
          'rounded-full',
          dotSize,
          config.dot,
          config.glow,
          status === 'online' && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-[11px] font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </span>
  );
});
