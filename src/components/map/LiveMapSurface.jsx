import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';

import 'leaflet/dist/leaflet.css';

const US_CENTER = [39.8283, -98.5795];
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const typeConfig = {
  alert: {
    label: 'Alert',
    Icon: ShieldAlert,
    markerClass: 'rr-map-marker-alert',
    text: 'text-alert',
    border: 'border-alert/45',
    bg: 'bg-alert/10',
  },
  solo_ride: {
    label: 'Rider',
    Icon: OfficialMotorcycleIcon,
    markerClass: 'rr-map-marker-solo',
    text: 'text-solo',
    border: 'border-solo/45',
    bg: 'bg-solo/10',
  },
  iso: {
    label: 'ISO',
    Icon: Search,
    markerClass: 'rr-map-marker-iso',
    text: 'text-iso',
    border: 'border-iso/45',
    bg: 'bg-iso/10',
  },
  event: {
    label: 'Event',
    Icon: CalendarClock,
    markerClass: 'rr-map-marker-event',
    text: 'text-event',
    border: 'border-event/45',
    bg: 'bg-event/10',
  },
  rider_presence: {
    label: 'Rider',
    Icon: OfficialMotorcycleIcon,
    markerClass: 'rr-map-marker-rider',
    text: 'text-cyan-300',
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-400/10',
  },
};

const markerIconCache = new Map();
const riderMarkerIconCache = new Map();

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
  const lat = firstNumber(broadcast.frozenLat, broadcast.frozen_lat, broadcast.lat);
  const lng = firstNumber(broadcast.frozenLng, broadcast.frozen_lng, broadcast.lng);
  if (!isValidCoordinate(lat, lng)) return null;
  return { lat, lng };
}

function getPresencePoint(presence) {
  const lat = firstNumber(presence.lat, presence.frozenLat, presence.frozen_lat);
  const lng = firstNumber(presence.lng, presence.frozenLng, presence.frozen_lng);
  if (!isValidCoordinate(lat, lng)) return null;
  return { lat, lng };
}

function getAuthorId(broadcast) {
  return broadcast.authorId || broadcast.author_id;
}

function getMarkerIcon(type) {
  const config = typeConfig[type] || typeConfig.solo_ride;
  if (!markerIconCache.has(type)) {
    markerIconCache.set(
      type,
      divIcon({
        className: 'rr-map-marker-wrapper',
        html: `<span class="rr-map-marker ${config.markerClass}" aria-hidden="true"><span></span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      })
    );
  }
  return markerIconCache.get(type);
}

function getRiderMarkerIcon(presence) {
  const displayName = String(presence.displayName || presence.display_name || 'Rider').trim();
  const label = displayName.charAt(0).toUpperCase() || 'R';
  const cacheKey = `${presence.userId || presence.user_id}:${presence.locationPrecision || presence.location_precision}:${label}`;

  if (!riderMarkerIconCache.has(cacheKey)) {
    riderMarkerIconCache.set(
      cacheKey,
      divIcon({
        className: 'rr-map-marker-wrapper',
        html: `<span class="rr-map-marker rr-map-marker-rider" aria-hidden="true"><span>${label}</span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      })
    );
  }

  return riderMarkerIconCache.get(cacheKey);
}

function getCenter(items, userLat, userLng) {
  if (isValidCoordinate(userLat, userLng)) return [userLat, userLng];
  if (items.length === 0) return US_CENTER;
  const lat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
  const lng = items.reduce((sum, item) => sum + item.lng, 0) / items.length;
  return [lat, lng];
}

function FitMapToItems({ items, userLat, userLng, variant, disabled }) {
  const map = useMap();
  const boundsKey = useMemo(
    () => items.map((item) => `${item.id}:${item.lat.toFixed(4)},${item.lng.toFixed(4)}`).join('|'),
    [items]
  );

  useEffect(() => {
    if (disabled) return;

    window.requestAnimationFrame(() => map.invalidateSize());

    if (items.length === 0) {
      map.setView(getCenter(items, userLat, userLng), variant === 'full' ? 4 : 3);
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
        maxZoom: variant === 'full' ? 12 : 9,
      }
    );
  }, [boundsKey, disabled, items, map, userLat, userLng, variant]);

  return null;
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

  const alertCount = items.filter((item) => item.type === 'alert').length;
  const riderCount = items.filter((item) => item.type === 'solo_ride').length;
  const eventCount = items.filter((item) => item.type === 'event').length;
  const isoCount = items.filter((item) => item.type === 'iso').length;
  const presenceCount = items.filter((item) => item.type === 'rider_presence').length;

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-3 top-3 z-[420] rounded-2xl border border-border/65 bg-black/72 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl',
        variant === 'full' ? 'right-3 sm:right-auto sm:min-w-72' : 'right-3'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="rr-kicker text-muted-foreground">Live map</div>
          <div className="font-display text-2xl font-extrabold">
            {items.length} {items.length === 1 ? 'signal' : 'signals'}
          </div>
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
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-border/45 bg-black/30',
        variant === 'full' ? 'min-h-[520px]' : 'h-[300px]'
      )}
      role="status"
      aria-label="Loading map data"
    >
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm font-semibold text-foreground">Loading live map...</p>
      <p className="mt-1 text-xs text-muted-foreground">Syncing broadcasts and rider markers</p>
    </div>
  );
}

function ErrorState({ onRetry, variant }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-destructive/35 bg-destructive/5 p-6 text-center',
        variant === 'full' ? 'min-h-[520px]' : 'h-[300px]'
      )}
      role="alert"
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">Map tiles failed to load</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-secondary/30 px-4 py-2 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function SignalList({ items, userLat, userLng, variant }) {
  const maxItems = variant === 'full' ? 18 : 6;
  const visible = items.slice(0, maxItems);

  return (
    <div
      id={variant === 'full' ? 'live-map-list' : 'map-legend'}
      className={cn(
        'grid gap-2',
        variant === 'full' ? 'max-h-[520px] overflow-y-auto pr-1 scroll-hide' : 'mt-3'
      )}
      role="list"
      aria-label="Mapped signals and rider list"
    >
      {visible.map((item) => (
        <SignalListItem key={item.id} item={item} userLat={userLat} userLng={userLng} />
      ))}
      {items.length > maxItems && (
        <p className="py-1 text-center text-xs text-muted-foreground">
          +{items.length - maxItems} more {items.length - maxItems === 1 ? 'signal' : 'signals'} on map
        </p>
      )}
    </div>
  );
}

function SignalListItem({ item, userLat, userLng }) {
  const config = typeConfig[item.type] || typeConfig.solo_ride;
  const Icon = config.Icon;
  const distance = isValidCoordinate(userLat, userLng)
    ? formatDistance(haversineMiles(userLat, userLng, item.lat, item.lng))
    : null;
  const signalAge = item.createdAt ? timeAgo(item.createdAt) : 'live';
  const isPresence = item.type === 'rider_presence';
  const title = isPresence
    ? item.displayName || item.display_name || 'Live rider'
    : item.title || BROADCAST_META[item.type]?.label || 'Broadcast';
  const detail = isPresence
    ? item.vehicleLabel || item.vehicle_label || null
    : item.exactLocationText || item.exact_location_text || null;
  const riderPrecision = isPresence
    ? item.locationPrecision || item.location_precision || 'approximate'
    : null;

  return (
    <Link
      to={isPresence ? `/profile/${item.userId || item.user_id}` : `/broadcast/${item.id}`}
      className={cn(
        'group flex min-h-[62px] items-start gap-3 rounded-2xl border bg-black/30 p-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        config.border
      )}
      role="listitem"
    >
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border', config.bg, config.border, config.text)}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>
          {config.label}
          {!isPresence && item.author?.displayName ? ` / ${item.author.displayName}` : ''}
        </span>
        <span className="block truncate text-sm font-bold text-foreground" title={title}>
          {title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {distance && (
            <span className="inline-flex items-center gap-1">
              <LocateFixed className="h-3 w-3" aria-hidden="true" />
              {distance}
            </span>
          )}
          {detail && (
            <span className="truncate">{detail}</span>
          )}
          {riderPrecision && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-black/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
              {riderPrecision}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {signalAge}
          </span>
        </span>
      </span>
    </Link>
  );
}

function SignalPopup({ item, userLat, userLng }) {
  const config = typeConfig[item.type] || typeConfig.solo_ride;
  const distance = isValidCoordinate(userLat, userLng)
    ? formatDistance(haversineMiles(userLat, userLng, item.lat, item.lng))
    : null;
  const signalAge = item.createdAt ? timeAgo(item.createdAt) : 'live';
  const isPresence = item.type === 'rider_presence';
  const title = isPresence
    ? item.displayName || item.display_name || 'Live rider'
    : item.title || BROADCAST_META[item.type]?.label || 'Broadcast';
  const detail = isPresence
    ? item.vehicleLabel || item.vehicle_label || null
    : item.exactLocationText || item.exact_location_text || null;
  const riderPrecision = isPresence
    ? item.locationPrecision || item.location_precision || 'approximate'
    : null;

  return (
    <div className="min-w-56 max-w-72 text-foreground">
      <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>
        {config.label}
        {!isPresence && item.author?.displayName ? ` / ${item.author.displayName}` : ''}
      </div>
      <div className="mt-1 break-words font-display text-base font-bold leading-tight">
        {title}
      </div>
      {!isPresence && item.body && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.body}</p>}
      {detail && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{detail}</span>
        </div>
      )}
      {riderPrecision && (
        <div className="mt-2 inline-flex rounded-full border border-border/50 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {riderPrecision} location
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {distance && <span>{distance}</span>}
        <span>{signalAge}</span>
        {item.expiresAt && <span>{timeUntilExpiry(item.expiresAt)}</span>}
      </div>
      <Link
        to={isPresence ? `/profile/${item.userId || item.user_id}` : `/broadcast/${item.id}`}
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {isPresence ? 'Open profile' : 'Open signal'}
      </Link>
    </div>
  );
}

export default function LiveMapSurface({
  broadcasts = [],
  presenceMarkers = [],
  getProfile,
  userLat,
  userLng,
  isLoading = false,
  variant = 'full',
  className,
  fitKey,
}) {
  const [mapError, setMapError] = useState(false);
  const [autoFitDisabled, setAutoFitDisabled] = useState(false);

  const broadcastItems = useMemo(() => {
    return broadcasts
      .map((broadcast) => {
        if (!typeConfig[broadcast.type]) return null;
        const point = getBroadcastPoint(broadcast);
        if (!point) return null;
        const authorId = getAuthorId(broadcast);
        return {
          ...broadcast,
          ...point,
          authorId,
          author: getProfile && authorId ? getProfile(authorId) : null,
          createdAt: broadcast.createdAt || broadcast.created_at || broadcast.created_date,
          expiresAt: broadcast.expiresAt || broadcast.expires_at,
          exactLocationText: broadcast.exactLocationText || broadcast.exact_location_text,
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
          id: presence.userId || presence.user_id,
          type: 'rider_presence',
          title: presence.displayName || presence.display_name || 'Live rider',
          body: presence.vehicleLabel || presence.vehicle_label || null,
          createdAt: presence.lastSeenAt || presence.last_seen_at || presence.updatedAt || presence.updated_at || null,
          expiresAt: presence.expiresAt || presence.expires_at || null,
          exactLocationText: presence.locationPrecision === 'precise' ? 'Precise live location' : 'Approximate live location',
        };
      })
      .filter(Boolean)
      .slice(0, variant === 'full' || variant === 'radar' ? 150 : 50);
  }, [presenceMarkers, variant]);

  const items = useMemo(() => [...broadcastItems, ...livePresenceItems], [broadcastItems, livePresenceItems]);

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
  if (mapError) return <ErrorState onRetry={handleRetry} variant={variant} />;

  return (
    <section
      className={cn(
        'rr-map-shell relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-black/35 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.42),inset_0_1px_0_hsl(0_0%_100%/0.045)]',
        variant === 'full' ? 'lg:p-4' : variant === 'radar' ? 'p-0' : 'p-4',
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
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {items.length} mapped
          </div>
        </div>
      )}

      <div className={cn('grid gap-3', variant === 'full' && 'lg:grid-cols-[minmax(0,1fr)_20rem]')}>
        <div
          className={cn(
            'relative overflow-hidden rounded-[1.1rem] border border-border/60 bg-background',
            variant === 'full'
              ? 'min-h-[560px] h-[calc(100svh-15rem)] max-h-[760px]'
              : variant === 'radar'
                ? 'h-full min-h-[560px] rounded-none border-0'
                : 'h-[320px]'
          )}
          role="application"
          aria-label={`Interactive map showing ${items.length} active ${items.length === 1 ? 'broadcast' : 'broadcasts'}`}
        >
          <a
            href={variant === 'full' ? '#live-map-list' : '#map-legend'}
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[500] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
          >
            Skip map
          </a>
          <MapSummary items={items} userLat={userLat} userLng={userLng} variant={variant} />
          {items.length === 0 && (
            <div className={cn(
              'pointer-events-none absolute inset-x-4 z-[430] flex justify-center',
              variant === 'radar' ? 'bottom-24' : 'bottom-4'
            )}>
              <div className={cn(
                'max-w-sm rounded-2xl border border-border/65 bg-black/78 text-center shadow-[0_18px_50px_rgba(0,0,0,0.42)] backdrop-blur-xl',
                variant === 'radar' ? 'px-4 py-3' : 'p-4'
              )}>
                <MapPin className={cn('mx-auto text-muted-foreground', variant === 'radar' ? 'mb-1 h-5 w-5' : 'mb-2 h-6 w-6')} aria-hidden="true" />
                <h2 className={cn('font-display font-bold', variant === 'radar' ? 'text-base' : 'text-lg')}>No mapped broadcasts</h2>
                {variant !== 'radar' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Active broadcasts with recognizable locations will appear here as soon as they hit the network.
                  </p>
                )}
              </div>
            </div>
          )}
          <MapContainer
            center={center}
            zoom={isValidCoordinate(userLat, userLng) ? 11 : 4}
            minZoom={3}
            maxZoom={19}
            scrollWheelZoom={variant === 'full' || variant === 'radar'}
            className="h-full w-full"
            preferCanvas
            zoomControl={variant === 'full'}
            eventHandlers={{
              dragstart: handleMapInteraction,
              zoomstart: handleMapInteraction,
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={DARK_TILE_URL}
              keepBuffer={4}
              updateWhenIdle={false}
              updateWhenZooming={false}
              eventHandlers={{ tileerror: handleTileError, tileload: () => setMapError(false) }}
            />
            <FitMapToItems
              items={items}
              userLat={userLat}
              userLng={userLng}
              variant={variant}
              disabled={variant === 'radar' && autoFitDisabled}
            />
            {items.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={item.type === 'rider_presence' ? getRiderMarkerIcon(item) : getMarkerIcon(item.type)}
              >
                <Popup>
                  <SignalPopup item={item} userLat={userLat} userLng={userLng} />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {variant !== 'radar' && <SignalList items={items} userLat={userLat} userLng={userLng} variant={variant} />}
      </div>
    </section>
  );
}
