import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Crosshair,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { getMarkerIcon, getRiderMarkerIcon, getSelfMarkerIcon } from './MapMarker';
import MapPopup from './MapPopup';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';

import 'leaflet/dist/leaflet.css';

const US_CENTER = [39.8283, -98.5795];
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const typeConfig = {
  alert: { label: 'Alert', Icon: ShieldAlert, text: 'text-alert', border: 'border-alert/45', bg: 'bg-alert/10', leftStripe: 'bg-alert', glow: 'shadow-[0_0_20px_hsl(var(--alert)/0.35)]' },
  solo_ride: { label: 'Rider', Icon: OfficialMotorcycleIcon, text: 'text-solo', border: 'border-solo/45', bg: 'bg-solo/10', leftStripe: 'bg-solo', glow: 'shadow-[0_0_20px_hsl(var(--solo)/0.3)]' },
  iso: { label: 'ISO', Icon: Search, text: 'text-iso', border: 'border-iso/45', bg: 'bg-iso/10', leftStripe: 'bg-iso', glow: 'shadow-[0_0_20px_hsl(var(--iso)/0.3)]' },
  event: { label: 'Event', Icon: CalendarClock, text: 'text-event', border: 'border-event/45', bg: 'bg-event/10', leftStripe: 'bg-event', glow: 'shadow-[0_0_20px_hsl(var(--event)/0.3)]' },
  rider_presence: { label: 'Rider', Icon: OfficialMotorcycleIcon, text: 'text-cyan-300', border: 'border-cyan-400/40', bg: 'bg-cyan-400/10', leftStripe: 'bg-cyan-400', glow: 'shadow-[0_0_20px_hsl(195_100%_60%/0.3)]' },
};

function firstNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isValidCoordinate(lat, lng) {
  return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function getBroadcastPoint(broadcast) {
  const lat = firstNumber(broadcast.frozen_lat, broadcast.lat);
  const lng = firstNumber(broadcast.frozen_lng, broadcast.lng);
  if (!isValidCoordinate(lat, lng)) return null;
  return { lat, lng };
}

function getPresencePoint(presence) {
  const lat = firstNumber(presence.lat, presence.frozen_lat);
  const lng = firstNumber(presence.lng, presence.frozen_lng);
  if (!isValidCoordinate(lat, lng)) return null;
  return { lat, lng };
}

function getCenter(items, userLat, userLng) {
  if (isValidCoordinate(userLat, userLng)) return [userLat, userLng];
  if (items.length === 0) return US_CENTER;
  const lat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
  const lng = items.reduce((sum, item) => sum + item.lng, 0) / items.length;
  return [lat, lng];
}

function FitMapToItems({ items, userLat, userLng, variant, disabled, focusUserLocation }) {
  const map = useMap();
  const boundsKey = useMemo(
    () => items.map((item) => `${item.id}:${item.lat.toFixed(4)},${item.lng.toFixed(4)}`).join('|'),
    [items]
  );

  useEffect(() => {
    if (disabled) return;
    window.requestAnimationFrame(() => map.invalidateSize());

    if (focusUserLocation && isValidCoordinate(userLat, userLng)) {
      map.setView([userLat, userLng], 15, { animate: false });
      return;
    }
    if (items.length === 0) {
      map.setView(getCenter(items, userLat, userLng), variant === 'full' ? 4 : 12);
      return;
    }
    if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], variant === 'full' ? 12 : 10);
      return;
    }
    map.fitBounds(
      items.map((item) => [item.lat, item.lng]),
      {
        paddingTopLeft: variant === 'full' ? [34, 34] : [24, 24],
        paddingBottomRight: variant === 'full' ? [34, 34] : [24, 24],
        maxZoom: variant === 'full' ? 12 : 13,
      }
    );
  }, [boundsKey, disabled, focusUserLocation, items, map, userLat, userLng, variant]);

  return null;
}

function CenterOnUserButton({ userLat, userLng }) {
  const map = useMap();
  if (!isValidCoordinate(userLat, userLng)) return null;
  return (
    <button
      type="button"
      onClick={() => map.setView([userLat, userLng], 15, { animate: true, duration: 0.45 })}
      className="rr-haptic absolute bottom-3 right-3 z-[430] flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_0_24px_hsl(var(--primary)/0.18),0_18px_45px_rgba(0,0,0,0.5)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label="Center map on my location"
    >
      <Crosshair className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function formatSnapshotAge(timestamp) {
  if (!timestamp) return 'cached';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function OfflineMapOverlay({ snapshotAt, tileIssue }) {
  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-[440] flex justify-center">
      <div className="max-w-[21rem] rounded-[18px] bg-black/78 px-3 py-2.5 text-left shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_18px_42px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.16)]">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Offline radar</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {tileIssue ? 'Map tiles are weak. Showing cached signals and any tiles already saved.' : `Showing cached signals from ${formatSnapshotAge(snapshotAt)}.`}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className }) {
  return (
    <div className="rounded-xl border border-border/45 bg-white/[0.03] px-2 py-1.5">
      <div className={cn('font-display text-base font-extrabold leading-none', className)}>{value}</div>
      <div className="mt-0.5 truncate">{label}</div>
    </div>
  );
}

function MapSummary({ items, userLat, userLng, variant }) {
  if (variant === 'radar') return null;
  const alertCount = items.filter((i) => i.type === 'alert').length;
  const riderCount = items.filter((i) => i.type === 'solo_ride').length;
  const eventCount = items.filter((i) => i.type === 'event').length;
  const isoCount = items.filter((i) => i.type === 'iso').length;
  const presenceCount = items.filter((i) => i.type === 'rider_presence').length;

  return (
    <div className={cn('pointer-events-none absolute left-3 top-3 z-[420] rounded-2xl border border-border/65 bg-black/72 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl', variant === 'full' ? 'right-3 sm:right-auto sm:min-w-72' : 'right-3')}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="rr-kicker text-muted-foreground">Live map</div>
          <div className="font-display text-2xl font-extrabold">{items.length} {items.length === 1 ? 'signal' : 'signals'}</div>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          {isValidCoordinate(userLat, userLng) ? 'Nearby' : 'Network'}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <Stat label="Alerts" value={alertCount} className="text-alert" />
        <Stat label="Riders" value={riderCount} className="text-solo" />
        <Stat label="ISO" value={isoCount} className="text-iso" />
        <Stat label="Events" value={eventCount} className="text-event" />
      </div>
      {presenceCount > 0 && (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          +{presenceCount} live rider {presenceCount === 1 ? 'presence' : 'presences'}
        </div>
      )}
    </div>
  );
}

function LoadingState({ variant }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-border/45 bg-black/30', variant === 'full' ? 'min-h-[520px]' : variant === 'radar' ? 'h-full min-h-0 rounded-[28px] border-primary/25 bg-black/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_0_30px_hsl(var(--primary)/0.16)]' : 'h-[300px]')} role="status" aria-label="Loading map data">
      {variant === 'radar' ? (
        <>
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/20" />
            <div className="absolute inset-0 animate-radar rounded-full border-t-2 border-primary/60" />
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
          </div>
          <p className="text-sm font-semibold text-foreground">Initializing radar...</p>
          <p className="mt-1 text-xs text-muted-foreground">Acquiring location lock and syncing signals</p>
        </>
      ) : (
        <>
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-foreground">Loading live map...</p>
          <p className="mt-1 text-xs text-muted-foreground">Syncing broadcasts and rider markers</p>
        </>
      )}
    </div>
  );
}

function ErrorState({ onRetry, variant }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-destructive/35 bg-destructive/5 p-6 text-center', variant === 'full' ? 'min-h-[520px]' : variant === 'radar' ? 'h-full min-h-0 rounded-[28px] border-alert/30 bg-alert/[0.04]' : 'h-[300px]')} role="alert">
      <AlertTriangle className={cn('mb-3', variant === 'radar' ? 'h-9 w-9 text-alert animate-pulse-alert' : 'h-8 w-8 text-destructive')} aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">Map tiles failed to load</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-secondary/30 px-4 py-2 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

function SignalList({ items, userLat, userLng, variant }) {
  const maxItems = variant === 'full' ? 18 : 6;
  const visible = items.slice(0, maxItems);
  return (
    <div id={variant === 'full' ? 'live-map-list' : 'map-legend'} className={cn('grid gap-2', variant === 'full' ? 'max-h-[520px] overflow-y-auto pr-1 scroll-hide' : 'mt-3')} role="list" aria-label="Mapped signals and rider list">
      {visible.map((item) => (
        <SignalListItem key={item.id} item={item} userLat={userLat} userLng={userLng} />
      ))}
      {items.length > maxItems && (
        <p className="py-1 text-center text-xs text-muted-foreground">+{items.length - maxItems} more {items.length - maxItems === 1 ? 'signal' : 'signals'} on map</p>
      )}
    </div>
  );
}

function SignalListItem({ item, userLat, userLng }) {
  const config = typeConfig[item.type] || typeConfig.solo_ride;
  const distance = isValidCoordinate(userLat, userLng) ? formatDistance(haversineMiles(userLat, userLng, item.lat, item.lng)) : null;
  const signalAge = item.created_at ? timeAgo(item.created_at) : 'live';
  const isPresence = item.type === 'rider_presence';
  const title = isPresence ? item.display_name || 'Live rider' : item.title || BROADCAST_META[item.type]?.label || 'Broadcast';
  const detail = isPresence ? item.vehicle_label || null : item.exact_location_text || null;
  const riderPrecision = isPresence ? item.location_precision || 'approximate' : null;

  return (
    <Link
      to={isPresence ? `/profile/${item.user_id}` : `/broadcast/${item.id}`}
      className={cn('group relative flex min-h-[62px] items-start gap-3 overflow-hidden rounded-2xl border bg-black/35 p-3 transition-all duration-200 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', config.border, config.glow, 'border-l-[3px]')}
      role="listitem"
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', config.leftStripe)} />
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', config.bg, config.border, config.text)}>
        {config.Icon ? <config.Icon className="h-4 w-4" aria-hidden="true" /> : <span className="text-xs font-bold">{title?.[0] || '?'}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>
          {config.label}
          {!isPresence && item.author?.display_name ? ` / ${item.author.display_name}` : ''}
        </span>
        <span className="block truncate text-sm font-bold text-foreground" title={title}>{title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground font-mono tracking-tight">
          {distance && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <LocateFixed className="h-3 w-3 opacity-60" aria-hidden="true" />{distance}
            </span>
          )}
          {detail && <span className="truncate">{detail}</span>}
          {riderPrecision && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-black/25 px-2 py-0.5 text-[10px] font-sans uppercase tracking-[0.12em]">{riderPrecision}</span>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3 opacity-60" aria-hidden="true" />{signalAge}
          </span>
        </span>
      </span>
    </Link>
  );
}

/**
 * LiveMap - Leaflet map with dark CARTO tiles.
 *
 * Variants: `full`, `radar`, `compact`
 */
export default function LiveMap({
  broadcasts = [],
  presenceMarkers = [],
  getProfile,
  userLat,
  userLng,
  userAccuracyMeters,
  isLoading = false,
  variant = 'full',
  className,
  fitKey,
  focusUserLocation = false,
  showSelfLocation = false,
  offlineMode = false,
  offlineSnapshotAt,
}) {
  const [mapError, setMapError] = useState(false);
  const [autoFitDisabled, setAutoFitDisabled] = useState(false);

  const broadcastItems = useMemo(() => {
    return broadcasts
      .map((broadcast) => {
        if (!typeConfig[broadcast.type]) return null;
        const point = getBroadcastPoint(broadcast);
        if (!point) return null;
        return {
          ...broadcast,
          ...point,
          author: getProfile && broadcast.author_id ? getProfile(broadcast.author_id) : null,
        };
      })
      .filter(Boolean)
      .slice(0, variant === 'full' || variant === 'radar' ? 250 : 75);
  }, [broadcasts, getProfile, variant]);

  const livePresenceItems = useMemo(() => {
    return presenceMarkers
      .map((presence) => {
        const point = getPresencePoint(presence);
        if (!point) return null;
        return {
          ...presence,
          ...point,
          id: presence.user_id,
          type: 'rider_presence',
          title: presence.display_name || 'Live rider',
          body: presence.vehicle_label || null,
          created_at: presence.last_seen_at || presence.updated_at || null,
          expires_at: presence.expires_at || null,
          exact_location_text: presence.location_precision === 'precise' ? 'Precise live location' : 'Approximate live location',
        };
      })
      .filter(Boolean)
      .slice(0, variant === 'full' || variant === 'radar' ? 150 : 50);
  }, [presenceMarkers, variant]);

  const items = useMemo(() => [...broadcastItems, ...livePresenceItems], [broadcastItems, livePresenceItems]);

  const hasUserLocation = isValidCoordinate(userLat, userLng);
  const center = useMemo(() => getCenter(items, userLat, userLng), [items, userLat, userLng]);
  const handleTileError = useCallback(() => setMapError(true), []);
  const handleRetry = useCallback(() => setMapError(false), []);
  const handleMapInteraction = useCallback(() => {
    if (variant === 'radar') setAutoFitDisabled(true);
  }, [variant]);

  useEffect(() => {
    if (variant === 'radar') setAutoFitDisabled(false);
  }, [fitKey, variant]);

  if (isLoading) return <LoadingState variant={variant} />;
  if (mapError && variant !== 'radar') return <ErrorState onRetry={handleRetry} variant={variant} />;

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        variant === 'radar'
          ? 'h-full w-full'
          : 'rr-map-shell rounded-[1.35rem] border border-border/70 bg-black/35 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.42),inset_0_1px_0_hsl(0_0%_100%/0.045)]',
        variant === 'full' ? 'lg:p-4' : variant !== 'radar' ? 'p-4' : '',
        className
      )}
      aria-label="Live map of active rider broadcasts"
    >
      {variant !== 'full' && variant !== 'radar' && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="rr-kicker text-muted-foreground">Map</div>
            <h2 className="font-display text-xl font-extrabold">Live Signals</h2>
          </div>
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{items.length} mapped</div>
        </div>
      )}

      <div className={cn('grid gap-3', variant === 'full' && 'lg:grid-cols-[minmax(0,1fr)_20rem]')}>
        <div
          className={cn('relative overflow-hidden rounded-[1.1rem] border border-border/60 bg-background', variant === 'full' ? 'min-h-[560px] h-[calc(100svh-15rem)] max-h-[760px]' : variant === 'radar' ? 'h-full min-h-0 rounded-[24px] border-2 border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_0_32px_hsl(var(--primary)/0.2),inset_0_0_28px_hsl(var(--primary)/0.07)]' : 'h-[320px]')}
          role="application"
          aria-label={`Interactive map showing ${items.length} active ${items.length === 1 ? 'broadcast' : 'broadcasts'}`}
        >
          {variant === 'radar' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[435] h-[2px] overflow-hidden">
              <div className="h-full w-full animate-ekg bg-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
            </div>
          )}

          <a href={variant === 'full' ? '#live-map-list' : '#map-legend'} className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[500] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg">Skip map</a>

          {(offlineMode || (mapError && variant === 'radar')) && <OfflineMapOverlay snapshotAt={offlineSnapshotAt} tileIssue={mapError} />}
          <MapSummary items={items} userLat={userLat} userLng={userLng} variant={variant} />

          {variant !== 'radar' && items.length === 0 && (
            <div className={cn('pointer-events-none absolute inset-x-4 z-[430] flex justify-center', variant === 'radar' ? 'bottom-24' : 'bottom-4')}>
              <div className={cn('max-w-sm rounded-2xl border border-border/65 bg-black/78 text-center shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl', variant === 'radar' ? 'px-4 py-3' : 'p-4')}>
                <MapPin className={cn('mx-auto text-muted-foreground', variant === 'radar' ? 'mb-1 h-5 w-5' : 'mb-2 h-6 w-6')} aria-hidden="true" />
                <h2 className={cn('font-display font-bold', variant === 'radar' ? 'text-base' : 'text-lg')}>No mapped broadcasts</h2>
                {variant !== 'radar' && <p className="mt-1 text-xs text-muted-foreground">Active broadcasts with recognizable locations will appear here as soon as they hit the network.</p>}
              </div>
            </div>
          )}

          <MapContainer
            center={center}
            zoom={hasUserLocation ? 11 : 4}
            minZoom={3}
            maxZoom={19}
            scrollWheelZoom={variant === 'full' || variant === 'radar'}
            className="h-full w-full"
            preferCanvas
            zoomControl={variant === 'full'}
            eventHandlers={{ dragstart: handleMapInteraction, zoomstart: handleMapInteraction }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={DARK_TILE_URL}
              keepBuffer={4}
              updateWhenIdle
              updateWhenZooming={false}
              eventHandlers={{ tileerror: handleTileError, tileload: () => setMapError(false) }}
            />
            <FitMapToItems items={items} userLat={userLat} userLng={userLng} variant={variant} disabled={variant === 'radar' && autoFitDisabled} focusUserLocation={focusUserLocation} />
            {showSelfLocation && hasUserLocation && (
              <Marker position={[userLat, userLng]} icon={getSelfMarkerIcon()}>
                <Popup>
                  <div className="min-w-48 text-foreground">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Private location</div>
                    <div className="mt-1 font-display text-base font-bold leading-tight">You are here</div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">This exact pin is only shown on your device.</p>
                    {Number.isFinite(Number(userAccuracyMeters)) && (
                      <div className="mt-2 text-xs text-muted-foreground font-mono tracking-tight">Accuracy ~{Math.round(Number(userAccuracyMeters))}m</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
            {items.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={item.type === 'rider_presence' ? getRiderMarkerIcon(item) : getMarkerIcon(item.type)}
              >
                <Popup>
                  <MapPopup item={item} userLat={userLat} userLng={userLng} />
                </Popup>
              </Marker>
            ))}
            {variant === 'radar' && <CenterOnUserButton userLat={userLat} userLng={userLng} />}
          </MapContainer>
        </div>
        {variant !== 'radar' && <SignalList items={items} userLat={userLat} userLng={userLng} variant={variant} />}
      </div>
    </section>
  );
}
