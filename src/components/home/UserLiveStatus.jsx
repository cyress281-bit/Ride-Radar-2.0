import { memo } from 'react';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Memoized live status badge - only re-renders when the user's broadcast
 * presence changes (live/offline toggle). Prevents re-render on every
 * feed filter/sort change in Home.jsx.
 */
const UserLiveStatus = memo(function UserLiveStatus({ broadcast }) {
  const isLive = !!broadcast;

  return (
    <div className={cn(
      'relative flex min-h-[64px] items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]',
      isLive
        ? 'border-primary/30 bg-primary/[0.07]'
        : 'border-border/50 bg-black/25'
    )}>
      {/* Live pulse glow */}
      {isLive && (
        <div className="pointer-events-none absolute inset-0 animate-pulse-green opacity-10" aria-hidden="true">
          <div className="absolute inset-0 bg-primary/10" />
        </div>
      )}

      {/* Live left stripe */}
      {isLive && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-primary animate-pulse-green" aria-hidden="true" />
      )}

      <span className={cn(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
        isLive
          ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
          : 'border-border/60 bg-black/30 text-muted-foreground'
      )}>
        <Radio className="h-4 w-4" />
        {/* Live pulse dot */}
        {isLive && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
          </span>
        )}
      </span>
      <div className={cn(
        'text-center text-[11px] font-extrabold uppercase tracking-[0.13em]',
        isLive ? 'text-primary' : 'text-muted-foreground'
      )}>
        {isLive ? 'Live On Radar' : 'Offline'}
      </div>
    </div>
  );
}, function areEqual(prev, next) {
  // Only re-render when live status changes (broadcast presence/absence)
  return !!prev.broadcast === !!next.broadcast;
});

export default UserLiveStatus;
