import { useState, useMemo, useCallback } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { CalendarClock, MapPin, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Leaflet CSS — co-located with the component that needs it.
// This CSS is only loaded when RadarMapView is lazy-loaded (i.e., user opens map tab).
import 'leaflet/dist/leaflet.css';

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
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #050505;box-shadow:0 0 0 2px rgba(255,255,255,.35),0 0 18px ${color};" role="img" aria-label="${type === 'alert' ? 'Alert' : 'Event'} marker"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getCenter(items) {
  if (items.length === 0) return [39.8283, -98.5795]; // US center fallback
  // CRITICAL FIX: Use snake_case fields from Supabase
  const lat = items.reduce((sum, item) => sum + Number(item.frozen_lat || item.frozenLat || 0), 0) / items.length;
  const lng = items.reduce((sum, item) => sum + Number(item.frozen_lng || item.frozenLng || 0), 0) / items.length;
  // Guard against NaN from invalid coordinates
  if (isNaN(lat) || isNaN(lng)) return [39.8283, -98.5795];
  return [lat, lng];
}

/**
 * RadarMapView - Displays events and alerts on an interactive map.
 *
 * Accessibility:
 * - Map section has proper aria-label and role
 * - Legend items below map are semantically structured
 * - Empty state provides helpful guidance
 * - Error state with retry for map loading failures
 * - Skip link available for keyboard users to bypass the map
 *
 * Edge cases:
 * - Invalid lat/lng coordinates are filtered out
 * - Very large datasets are capped at 50 markers
 * - Handles graceful fallback when Leaflet fails to load
 * - Empty broadcasts array renders empty state
 */
export default function RadarMapView({ broadcasts = [], isLoading = false }) {
  const [mapError, setMapError] = useState(false);

  const mapItems = useMemo(() => {
    return broadcasts
      .filter((broadcast) => {
        if (broadcast.type !== 'event' && broadcast.type !== 'alert') return false;
        // CRITICAL FIX: Use snake_case fields from Supabase
        const lat = Number(broadcast.frozen_lat || broadcast.frozenLat || 0);
        const lng = Number(broadcast.frozen_lng || broadcast.frozenLng || 0);
        // Validate coordinates are real numbers within valid range
        return (
          !isNaN(lat) && !isNaN(lng) &&
          lat >= -90 && lat <= 90 &&
          lng >= -180 && lng <= 180
        );
      })
      .slice(0, 50);
  }, [broadcasts]);

  const center = useMemo(() => getCenter(mapItems), [mapItems]);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setMapError(false);
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-black/35 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
      aria-label="Map showing nearby events and alerts"
    >
      {/* Header */}
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="rr-kicker text-muted-foreground">Map</div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em]">Events & Alerts</h2>
        </div>
        <div className="flex items-center gap-2">
          {mapItems.length > 0 && (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {mapItems.length} {mapItems.length === 1 ? 'location' : 'locations'}
            </span>
          )}
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary" aria-hidden="true">
            Simple view
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-border/45 bg-background/45" role="status" aria-label="Loading map data">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-foreground">Loading map data...</p>
          <p className="mt-1 text-xs text-muted-foreground">Finding nearby events and alerts</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && mapError && (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 text-center" role="alert">
          <AlertTriangle className="mb-3 h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Map failed to load</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">Check your connection and try again.</p>
          <button
            onClick={handleRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/30 px-4 py-2 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Retry loading map"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !mapError && mapItems.length === 0 && (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-border/45 bg-background/45 text-center" role="status">
          <MapPin className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">No mapped events or alerts</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            New Event and Alert broadcasts with recognizable locations will appear here.
          </p>
        </div>
      )}

      {/* Map with items */}
      {!isLoading && !mapError && mapItems.length > 0 && (
        <>
          {/* Skip link for keyboard users */}
          <a
            href="#map-legend"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
          >
            Skip map, go to legend
          </a>

          <div
            className="h-[320px] overflow-hidden rounded-2xl border border-border/60 bg-background"
            role="application"
            aria-label={`Interactive map showing ${mapItems.length} ${mapItems.length === 1 ? 'location' : 'locations'}`}
          >
            <MapContainer
              center={center}
              zoom={mapItems.length === 1 ? 11 : 5}
              scrollWheelZoom={false}
              className="h-full w-full"
              whenReady={() => setMapError(false)}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={{ tileerror: handleMapError }}
              />
              {mapItems.map((item) => (
                <Marker
                  key={item.id}
                  position={[Number(item.frozen_lat || item.frozenLat), Number(item.frozen_lng || item.frozenLng)]}
                  icon={createMarkerIcon(item.type)}
                >
                  <Popup>
                    <div className="min-w-40">
                      <div className="text-xs font-bold uppercase tracking-wide">{typeConfig[item.type]?.label}</div>
                      <div className="font-semibold break-words">{item.title || 'Untitled'}</div>
                      {/* CRITICAL FIX: Use snake_case field */}
                      {(item.exact_location_text || item.exactLocationText) && (
                        <div className="mt-1 text-xs text-slate-600 break-words">{item.exact_location_text || item.exactLocationText}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Legend list */}
          <div id="map-legend" className="mt-3 grid gap-2" role="list" aria-label="Map locations list">
            {mapItems.slice(0, 6).map((item) => {
              const config = typeConfig[item.type];
              if (!config) return null;
              const Icon = config.Icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border bg-black/35 p-3 min-h-[44px]',
                    config.border
                  )}
                  role="listitem"
                >
                  <span
                    className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white', config.color)}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>
                      {config.label}
                    </div>
                    <div className="truncate text-sm font-bold text-foreground" title={item.title || 'Untitled'}>
                      {item.title || 'Untitled'}
                    </div>
                    {item.exactLocationText && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground" title={item.exactLocationText}>
                        {item.exactLocationText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {mapItems.length > 6 && (
              <p className="text-center text-xs text-muted-foreground py-1">
                +{mapItems.length - 6} more {mapItems.length - 6 === 1 ? 'location' : 'locations'} on map
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
