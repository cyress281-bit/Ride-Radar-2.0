import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { CalendarClock, MapPin, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  alert: {
    label: 'Alert',
    Icon: ShieldAlert,
    color: 'bg-alert',
    text: 'text-alert',
    border: 'border-alert/40',
  },
  event: {
    label: 'Event',
    Icon: CalendarClock,
    color: 'bg-event',
    text: 'text-event',
    border: 'border-event/40',
  },
};

function createMarkerIcon(type) {
  const color = type === 'alert' ? '#ef4444' : '#3b82f6';
  return divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #050505;box-shadow:0 0 0 2px rgba(255,255,255,.35),0 0 18px ${color};"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getCenter(items) {
  if (items.length === 0) return [39.8283, -98.5795];
  const lat = items.reduce((sum, item) => sum + Number(item.frozenLat), 0) / items.length;
  const lng = items.reduce((sum, item) => sum + Number(item.frozenLng), 0) / items.length;
  return [lat, lng];
}

export default function RadarMapView({ broadcasts = [] }) {
  const mapItems = broadcasts
    .filter((broadcast) => (broadcast.type === 'event' || broadcast.type === 'alert') && broadcast.frozenLat != null && broadcast.frozenLng != null)
    .slice(0, 50);
  const center = getCenter(mapItems);

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-black/35 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="rr-kicker text-muted-foreground">Map</div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em]">Events & Alerts</h2>
        </div>
        <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Simple view
        </div>
      </div>

      {mapItems.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-border/45 bg-background/45 text-center">
          <MapPin className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No mapped events or alerts</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">New Event and Alert broadcasts with recognizable locations will appear here.</p>
        </div>
      ) : (
        <>
          <div className="h-[320px] overflow-hidden rounded-2xl border border-border/60 bg-background">
            <MapContainer center={center} zoom={mapItems.length === 1 ? 11 : 5} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapItems.map((item) => (
                <Marker key={item.id} position={[Number(item.frozenLat), Number(item.frozenLng)]} icon={createMarkerIcon(item.type)}>
                  <Popup>
                    <div className="min-w-40">
                      <div className="text-xs font-bold uppercase tracking-wide">{typeConfig[item.type]?.label}</div>
                      <div className="font-semibold">{item.title}</div>
                      {item.exactLocationText && <div className="mt-1 text-xs text-slate-600">{item.exactLocationText}</div>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="mt-3 grid gap-2">
            {mapItems.slice(0, 6).map((item) => {
              const config = typeConfig[item.type];
              const Icon = config.Icon;
              return (
                <div key={item.id} className={cn('flex items-start gap-3 rounded-xl border bg-black/35 p-3', config.border)}>
                  <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white', config.color)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>{config.label}</div>
                    <div className="truncate text-sm font-bold text-foreground">{item.title}</div>
                    {item.exactLocationText && <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.exactLocationText}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}