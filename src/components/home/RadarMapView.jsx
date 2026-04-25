import { CalendarClock, MapPin, Route, Search, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  alert: { label: 'Alert area', Icon: ShieldAlert, classes: 'border-alert/40 bg-alert/10 text-alert', dot: 'bg-alert' },
  event: { label: 'Event location', Icon: CalendarClock, classes: 'border-event/40 bg-event/10 text-event', dot: 'bg-event' },
  solo_ride: { label: 'Approx. solo signal', Icon: Route, classes: 'border-solo/40 bg-solo/10 text-solo', dot: 'bg-solo' },
  iso: { label: 'Approx. ISO signal', Icon: Search, classes: 'border-iso/40 bg-iso/10 text-iso', dot: 'bg-iso' },
};

function getPoint(item, index) {
  if (item.frozenLat != null && item.frozenLng != null) {
    const latOffset = Math.max(-1, Math.min(1, Number(item.frozenLat) % 1));
    const lngOffset = Math.max(-1, Math.min(1, Number(item.frozenLng) % 1));
    return { left: 50 + lngOffset * 34, top: 50 - latOffset * 34 };
  }
  return { left: 18 + ((index * 29) % 64), top: 20 + ((index * 23) % 58) };
}

export default function RadarMapView({ broadcasts = [] }) {
  const mapItems = broadcasts.slice(0, 12);

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-black/35 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
      <div className="absolute inset-0 radar-grid opacity-60" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="rr-kicker text-muted-foreground">Privacy-safe map</div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em]">Live Signals</h2>
        </div>
        <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
Approximate pins
        </div>
      </div>

      <div className="relative z-10 min-h-[260px] rounded-2xl border border-border/45 bg-background/45 p-3">
        {mapItems.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center text-center">
            <MapPin className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No signals to show</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">Broadcasts will appear here with privacy-safe approximate placement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative h-[260px] overflow-hidden rounded-xl border border-primary/15 bg-black/40">
              <div className="absolute inset-0 radar-grid opacity-70" />
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary glow-green-sm" />
              {mapItems.map((item, index) => {
                const config = typeConfig[item.type] || typeConfig.event;
                const point = getPoint(item, index);
                return (
                  <div
                    key={item.id}
                    className={cn('absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-[0_0_16px_currentColor]', config.dot)}
                    style={{ left: `${point.left}%`, top: `${point.top}%` }}
                    title={item.title}
                  />
                );
              })}
            </div>
            <div className="grid gap-2">
              {mapItems.map((item) => {
                const config = typeConfig[item.type] || typeConfig.event;
                const Icon = config.Icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/50 bg-black/35 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', config.classes)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{config.label}</div>
                      <div className="truncate text-sm font-bold text-foreground">{item.title}</div>
                      {item.exactLocationText && <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.exactLocationText}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}