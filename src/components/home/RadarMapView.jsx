import { CalendarClock, MapPin, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RadarMapView({ broadcasts = [] }) {
  const mapItems = broadcasts
    .filter((broadcast) => broadcast.type === 'event' || broadcast.type === 'alert')
    .slice(0, 12);

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-black/35 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
      <div className="absolute inset-0 radar-grid opacity-60" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="rr-kicker text-muted-foreground">Privacy-safe map</div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em]">Events & Alerts</h2>
        </div>
        <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          No rider pins
        </div>
      </div>

      <div className="relative z-10 min-h-[260px] rounded-2xl border border-border/45 bg-background/45 p-3">
        {mapItems.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center text-center">
            <MapPin className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No Events or Alerts to show</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">Solo Ride locations stay off this map for privacy.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {mapItems.map((item) => {
              const isAlert = item.type === 'alert';
              const Icon = isAlert ? ShieldAlert : CalendarClock;
              return (
                <div key={item.id} className={cn(
                  'flex items-start gap-3 rounded-xl border bg-black/35 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]',
                  isAlert ? 'border-alert/35' : 'border-event/35'
                )}>
                  <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                    isAlert ? 'border-alert/40 bg-alert/10 text-alert' : 'border-event/40 bg-event/10 text-event'
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', isAlert ? 'text-alert' : 'text-event')}>
                      {isAlert ? 'Alert area' : 'Event location'}
                    </div>
                    <div className="truncate text-sm font-bold text-foreground">{item.title}</div>
                    {item.exactLocationText && <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.exactLocationText}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}