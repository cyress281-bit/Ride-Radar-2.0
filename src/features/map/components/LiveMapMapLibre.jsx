import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import ReactDOM, { flushSync } from 'react-dom/client';
import { Link } from 'react-router-dom';

import {
  AlertTriangle,
  CalendarClock,
  Clock,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Siren,
  Wrench,
  WifiOff,
} from 'lucide-react';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import MapPopup from './MapPopup';
import { getMarkerElement, getRiderMarkerElement, getSelfMarkerElement, getClusterElement } from './MapMarker';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';


// MapLibre imports
import { Map as MapLibreMap, useMap as useMapLibre } from 'react-map-gl/maplibre';
import { Marker as MaplibreMarker, Popup as MaplibrePopup } from 'maplibre-gl';

const US_CENTER = [39.8283, -98.5795];
let lastRadarViewport = null;

const typeConfig = {
  alert: { label: 'Road Warning', Icon: ShieldAlert, text: 'text-alert', border: 'border-alert/45', bg: 'bg-alert/10', leftStripe: 'bg-alert', glow: 'shadow-[0_0_20px_hsl(var(--alert)/0.35)]' },
  bike_down: { label: 'Bike Down', Icon: Siren, text: 'text-destructive', border: 'border-destructive/45', bg: 'bg-destructive/10', leftStripe: 'bg-destructive', glow: 'shadow-[0_0_20px_hsl(var(--destructive)/0.35)]' },
  solo_ride: { label: 'Rider', Icon: OfficialMotorcycleIcon, text: 'text-solo', border: 'border-solo/45', bg: 'bg-solo/10', leftStripe: 'bg-solo', glow: 'shadow-[0_0_20px_hsl(var(--solo)/0.3)]' },
  iso: { label: 'Help', Icon: Wrench, text: 'text-iso', border: 'border-iso/45', bg: 'bg-iso/10', leftStripe: 'bg-iso', glow: 'shadow-[0_0_20px_hsl(var(--iso)/0.3)]' },
  event: { label: 'Event', Icon: CalendarClock, text: 'text-event', border: 'border-event/45', bg: 'bg-event/10', leftStripe: 'bg-event', glow: 'shadow-[0_0_20px_hsl(var(--event)/0.3)]' },
  rider_presence: { label: 'Rider', Icon: OfficialMotorcycleIcon, text: 'text-cyan', border: 'border-cyan/40', bg: 'bg-cyan/10', leftStripe: 'bg-cyan', glow: 'shadow-[0_0_20px_hsl(var(--cyan)/0.3)]' },
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

function formatSnapshotAge(timestamp) {
  if (!timestamp) return 'cached';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

const OfflineMapOverlay = memo(function OfflineMapOverlay({ snapshotAt, tileIssue }) {
  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-[440] flex justify-center">
      <div className="max-w-[21rem] rounded-[18px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] px-3 py-2.5 text-left shadow-[0_0_20px_hsl(var(--brand-radar)/0.15)]">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-radar/10 text-brand-radar shadow-[0_0_18px_hsl(var(--brand-radar)/0.16)]">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-radar">
              {tileIssue ? 'Map unavailable' : 'Offline radar'}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {tileIssue
                ? 'Map unavailable offline. Cached signals still visible.'
                : `Showing cached signals from ${formatSnapshotAge(snapshotAt)}.`}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});

const Stat = memo(function Stat({ label, value, className }) {
  return (
    <div className="rounded-xl border border-border/45 bg-white/[0.03] px-2 py-1.5">
      <div className={cn('font-display text-base font-extrabold leading-none', className)}>{value}</div>
      <div className="mt-0.5 truncate">{label}</div>
    </div>
  );
});

const MapSummary = memo(function MapSummary({ items, userLat, userLng, variant }) {
  if (variant === 'radar') return null;
  let alertCount = 0, riderCount = 0, eventCount = 0, isoCount = 0, presenceCount = 0;
  for (const i of items) {
    if (i.type === 'alert') alertCount++;
    else if (i.type === 'solo_ride') riderCount++;
    else if (i.type === 'event') eventCount++;
    else if (i.type === 'iso') isoCount++;
    else if (i.type === 'rider_presence') presenceCount++;
  }

  return (
    <div className={cn('pointer-events-none absolute left-3 top-3 z-[420] rounded-2xl border border-white/[0.06] bg-surface/80 p-3 rr-shadow-lg backdrop-blur-xl', variant === 'full' ? 'right-3 sm:right-auto sm:min-w-72' : 'right-3')}>
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
        <Stat label="Warnings" value={alertCount} className="text-alert" />
        <Stat label="Riders" value={riderCount} className="text-solo" />
        <Stat label="Help" value={isoCount} className="text-iso" />
        <Stat label="Events" value={eventCount} className="text-event" />
      </div>
      {presenceCount > 0 && (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          +{presenceCount} live rider {presenceCount === 1 ? 'presence' : 'presences'}
        </div>
      )}
    </div>
  );
});

const LoadingState = memo(function LoadingState({ variant }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-border/45 bg-black/30', variant === 'full' ? 'min-h-[520px]' : variant === 'radar' ? 'h-full min-h-0 rounded-[28px] border-primary/25 bg-black/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.1),0_0_30px_hsl(var(--primary)/0.16)]' : 'h-[300px]')} role="status" aria-label="Loading map data">
      {variant === 'radar' ? (
        <>
          <div className="relative mb-4 flex h-12 w-12 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/20" />
            <div className="absolute inset-0 animate-radar rounded-full border-t-2 border-primary/60" />
            <div className="absolute inset-0 rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.4)] animate-glow-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
          </div>
          <p className="text-sm font-semibold text-foreground">Initializing radar...</p>
          <p className="mt-1 text-xs text-muted-foreground">Acquiring location lock and syncing signals</p>
        </>
      ) : (
        <>
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-semibold text-foreground">Loading live map...</p>
          <p className="mt-1 text-xs text-muted-foreground">Syncing signals and rider markers</p>
        </>
      )}
    </div>
  );
});

const TileLoadingOverlay = memo(function TileLoadingOverlay({ variant }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-[1100] flex flex-col items-center justify-center transition-opacity duration-700',
        variant === 'radar' ? 'bg-background' : 'bg-background/35 backdrop-blur-[1px]',
        variant === 'radar' ? 'rounded-none' : 'rounded-[1.1rem]'
      )}
    >
      <div className="flex flex-col items-center gap-2.5">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-primary/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-primary/70" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_16px_hsl(var(--primary)/0.35)] animate-glow-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
        </div>
        <span className="text-xs font-semibold text-foreground">Loading map tiles…</span>
      </div>
    </div>
  );
});

const ErrorState = memo(function ErrorState({ onRetry, variant }) {
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
});

const SignalList = memo(function SignalList({ items, userLat, userLng, variant }) {
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
});

const SignalListItem = memo(function SignalListItem({ item, userLat, userLng }) {
  const config = (item.alert_type === 'bike_down' ? typeConfig.bike_down : typeConfig[item.type]) || typeConfig.solo_ride;
  const distance = isValidCoordinate(userLat, userLng) ? formatDistance(haversineMiles(userLat, userLng, item.lat, item.lng)) : null;
  const signalAge = item.created_at ? timeAgo(item.created_at) : 'live';
  const isPresence = item.type === 'rider_presence';
  const title = isPresence ? item.display_name || 'Live rider' : item.title || BROADCAST_META[item.type]?.label || 'Signal';
  const detail = isPresence ? item.vehicle_label || null : item.location_name || null;
  const riderPrecision = isPresence ? item.location_precision || 'approximate' : null;

  return (
    <Link
      to={isPresence ? `/profile/${item.user_id}` : `/broadcast/${item.id}`}
      className={cn('group relative flex min-h-[62px] items-start gap-3 overflow-hidden rounded-2xl border bg-background/35 p-3 transition-all duration-200 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', config.border, config.glow, 'border-l-[3px]')}
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
});

const CARTO_DARK_VECTOR_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Persists the radar viewport to lastRadarViewport on every move/zoom.
 * Replaces Leaflet's RadarViewportPersistence — uses MapLibre public APIs only.
 * No private _loaded or _mapPane internals.
 */
const MapLibreViewportPersistence = memo(function MapLibreViewportPersistence() {
  const map = useMapLibre().current;

  useEffect(() => {
    if (!map) return;

    const syncViewport = () => {
      try {
        if (!map.loaded()) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        if (!center || !Number.isFinite(zoom)) return;
        lastRadarViewport = {
          center: [center.lat, center.lng],
          zoom,
        };
      } catch {
        // Map may be mid-teardown during route transitions — skip silently
      }
    };

    map.on('moveend', syncViewport);
    map.on('zoomend', syncViewport);

    // Sync immediately if map is already loaded
    if (map.loaded()) syncViewport();

    return () => {
      map.off('moveend', syncViewport);
      map.off('zoomend', syncViewport);
    };
  }, [map]);

  return null;
});

/**
 * Auto-fits the MapLibre viewport to items on mount and when fitKey changes.
 * Replaces Leaflet's FitMapToItems — uses MapLibre public APIs with correct
 * [lng, lat] coordinate order throughout.
 */
const MapLibreFitToItems = memo(function MapLibreFitToItems({
  items,
  userLat,
  userLng,
  variant,
  disabled,
  focusUserLocation,
  fitKey,
  preserveViewportOnMount,
}) {
  const map = useMapLibre().current;
  const lastAppliedFitKeyRef = useRef(null);
  const userLatRef = useRef(userLat);
  const userLngRef = useRef(userLng);
  userLatRef.current = userLat;
  userLngRef.current = userLng;

  useEffect(() => {
    if (!map || disabled) return;

    // Trigger a resize so MapLibre recalculates its canvas dimensions
    window.requestAnimationFrame(() => map.resize());

    if (preserveViewportOnMount && lastAppliedFitKeyRef.current === null) {
      lastAppliedFitKeyRef.current = fitKey;
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (focusUserLocation && isValidCoordinate(userLatRef.current, userLngRef.current)) {
      map.flyTo({
        center: [userLngRef.current, userLatRef.current], // MapLibre: [lng, lat]
        zoom: 15,
        animate: !prefersReducedMotion,
        duration: prefersReducedMotion ? 0 : 600,
      });
      lastAppliedFitKeyRef.current = fitKey;
      return;
    }

    if (items.length === 0) {
      const hasRealLocation = isValidCoordinate(userLatRef.current, userLngRef.current);
      const center = getCenter(items, userLatRef.current, userLngRef.current);
      map.flyTo({
        center: [center[1], center[0]], // flip: getCenter returns [lat, lng], MapLibre needs [lng, lat]
        zoom: variant === 'full' ? 4 : hasRealLocation ? 12 : 4,
        animate: false,
      });
      lastAppliedFitKeyRef.current = fitKey;
      return;
    }

    if (items.length === 1) {
      map.flyTo({
        center: [items[0].lng, items[0].lat], // MapLibre: [lng, lat]
        zoom: variant === 'full' ? 12 : 10,
        animate: !prefersReducedMotion,
      });
      lastAppliedFitKeyRef.current = fitKey;
      return;
    }

    if (fitKey !== lastAppliedFitKeyRef.current) {
      const padding = variant === 'full' ? 34 : 24;
      // MapLibre fitBounds expects [[minLng, minLat], [maxLng, maxLat]]
      const lngs = items.map((i) => i.lng);
      const lats = items.map((i) => i.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        {
          padding,
          maxZoom: variant === 'full' ? 12 : 13,
          animate: !prefersReducedMotion,
        }
      );
      lastAppliedFitKeyRef.current = fitKey;
    }
  }, [fitKey, disabled, focusUserLocation, items.length, map, variant, preserveViewportOnMount]);

  return null;
});

/**
 * Renders broadcast markers with MapLibre built-in GeoJSON clustering.
 * Replaces Leaflet's BroadcastClusterLayer + L.markerClusterGroup.
 * Uses MapLibre's cluster source to group markers, then renders
 * individual DOM markers via MaplibreMarker for full CSS styling.
 */
const MapLibreBroadcastMarkerLayer = memo(function MapLibreBroadcastMarkerLayer({
  items,
  userLat,
  userLng,
  onMarkerClick,
}) {
  const map = useMapLibre().current;
  const markersRef = useRef(new Map()); // id -> MaplibreMarker instance
  const handlersRef = useRef(new Map()); // markerId -> { el, handler }
  const sourceId = 'rr-broadcasts';
  const clusterLayerId = 'rr-cluster-circles';
  const unclusteredLayerId = 'rr-unclustered-points';
  const [styleReady, setStyleReady] = useState(false);

  // Wait for map style to finish loading before adding sources/layers
  useEffect(() => {
    if (!map) return;
    const mapInstance = map.getMap();
    if (!mapInstance) return;
    if (mapInstance.isStyleLoaded()) {
      setStyleReady(true);
      return;
    }
    const onLoad = () => setStyleReady(true);
    mapInstance.once('load', onLoad);
    return () => { mapInstance.off('load', onLoad); };
  }, [map]);

  useEffect(() => {
    if (!map || !styleReady) return;
    const mapInstance = map.getMap();
    if (!mapInstance) return;

    // Build GeoJSON from items
    const geojson = {
      type: 'FeatureCollection',
      features: items.map((item) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
        properties: {
          id: item.id,
          type: item.type,
          markerType: item.markerType || item.type,
          alertType: item.alert_type || null,
          isBikeDown: item.type === 'alert' && item.alert_type === 'bike_down',
          isWarning: item.type === 'alert' || item.type === 'iso',
        },
      })),
    };

    // Add or update source
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojson);
    } else {
      mapInstance.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 60,
        clusterProperties: {
          hasBikeDown: ['any', ['get', 'isBikeDown']],
          hasWarning: ['any', ['get', 'isWarning']],
        },
      });

      // Invisible cluster layer so we can query clusters via querySourceFeatures
      mapInstance.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: { 'circle-radius': 0, 'circle-opacity': 0 },
      });

      // Invisible unclustered layer for querying
      mapInstance.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 0, 'circle-opacity': 0 },
      });
    }

    // Render DOM markers after source update
    const renderMarkers = () => {
      if (!map.isSourceLoaded(sourceId)) return;
      const seen = new Set();

      // Get cluster features from the current viewport
      const clusterFeatures = map.querySourceFeatures(sourceId, {
        filter: ['has', 'point_count']
      });

      // Render cluster markers
      clusterFeatures.forEach((feature) => {
        const props = feature.properties;
        const markerId = `cluster-${props.cluster_id}`;
        const coordinates = feature.geometry.coordinates;
        if (seen.has(markerId)) return;
        seen.add(markerId);

        if (!markersRef.current.has(markerId)) {
          const count = props.point_count;
          const hasBikeDown = props.hasBikeDown === true || props.hasBikeDown === 'true';
          const hasWarning = props.hasWarning === true || props.hasWarning === 'true';
          const el = getClusterElement(count, hasBikeDown, hasWarning);
          el.style.cursor = 'pointer';
          const handler = () => {
            map.getSource(sourceId).getClusterExpansionZoom(
              props.cluster_id,
              (err, zoom) => {
                if (err) return;
                map.easeTo({ center: coordinates, zoom: zoom + 0.5 });
              }
            );
          };
          el.addEventListener('click', handler);
          handlersRef.current.set(markerId, { el, handler });
          const marker = new MaplibreMarker({ element: el, anchor: 'center' })
            .setLngLat(coordinates)
            .addTo(mapInstance);
          markersRef.current.set(markerId, marker);
        } else {
          markersRef.current.get(markerId).setLngLat(coordinates);
        }
      });

      // Render ALL individual item markers (not just visible ones)
      items.forEach((item) => {
        const markerId = `item-${item.id}`;
        seen.add(markerId);
        if (!markersRef.current.has(markerId)) {
          // Check if this item is currently unclustered
          const unclusteredFeatures = map.querySourceFeatures(sourceId, {
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], item.id]]
          });
          if (unclusteredFeatures.length === 0) return; // hidden in cluster
          const coordinates = unclusteredFeatures[0].geometry.coordinates;
          const el = getMarkerElement(item.markerType || item.type);
          el.style.cursor = 'pointer';
          const handler = () => {
            onMarkerClick?.(item, coordinates);
          };
          el.addEventListener('click', handler);
          handlersRef.current.set(markerId, { el, handler });
          const marker = new MaplibreMarker({ element: el, anchor: 'center' })
            .setLngLat(coordinates)
            .addTo(mapInstance);
          markersRef.current.set(markerId, marker);
        } else {
          // Check if still unclustered
          const unclusteredFeatures = map.querySourceFeatures(sourceId, {
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], item.id]]
          });
          if (unclusteredFeatures.length === 0) {
            // Now in a cluster — remove individual marker
            const entry = handlersRef.current.get(markerId);
            if (entry) { entry.el.removeEventListener('click', entry.handler); handlersRef.current.delete(markerId); }
            markersRef.current.get(markerId).remove();
            markersRef.current.delete(markerId);
          } else {
            markersRef.current.get(markerId).setLngLat(unclusteredFeatures[0].geometry.coordinates);
          }
        }
      });

      // Remove stale cluster markers only
      markersRef.current.forEach((marker, id) => {
        if (id.startsWith('cluster-') && !seen.has(id)) {
          const entry = handlersRef.current.get(id);
          if (entry) { entry.el.removeEventListener('click', entry.handler); handlersRef.current.delete(id); }
          marker.remove();
          markersRef.current.delete(id);
        }
      });
    };

    map.on('idle', renderMarkers);
    map.on('sourcedata', renderMarkers);

    return () => {
      map.off('idle', renderMarkers);
      map.off('sourcedata', renderMarkers);
    };
  }, [items, map, onMarkerClick, styleReady]);

  // Cleanup all markers and layers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      handlersRef.current.forEach(({ el, handler }) => el.removeEventListener('click', handler));
      handlersRef.current.clear();
      try {
        const mapInstance = map?.getMap();
        if (!mapInstance) return;
        if (mapInstance.getLayer(clusterLayerId)) mapInstance.removeLayer(clusterLayerId);
        if (mapInstance.getLayer(unclusteredLayerId)) mapInstance.removeLayer(unclusteredLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      } catch {
        // Map may already be destroyed
      }
    };
  }, [map]);

  return null;
});

/**
 * Renders individual presence and self-location markers.
 * These are NOT clustered — each rider gets their own DOM marker.
 */
const MapLibrePresenceMarkerLayer = memo(function MapLibrePresenceMarkerLayer({
  presenceItems,
  userLat,
  userLng,
  showSelfLocation,
  hasUserLocation,
  isLiveMapVisible,
  userAccuracyMeters,
  onPresenceClick,
}) {
  const map = useMapLibre().current;
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (!map) return;

    const seen = new Set();

    // Self-location marker
    if (showSelfLocation && hasUserLocation) {
      const selfId = 'self';
      seen.add(selfId);
      if (!markersRef.current.has(selfId)) {
        const el = getSelfMarkerElement(isLiveMapVisible);
        const marker = new MaplibreMarker({ element: el, anchor: 'center' })
          .setLngLat([userLng, userLat])
          .addTo(map.getMap());
        markersRef.current.set(selfId, marker);
      } else {
        markersRef.current.get(selfId).setLngLat([userLng, userLat]);
      }
    }

    // Presence markers
    presenceItems.forEach((item) => {
      const markerId = `presence-${item.user_id}`;
      seen.add(markerId);
      if (!markersRef.current.has(markerId)) {
        const el = getRiderMarkerElement(item);
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => onPresenceClick?.(item));
        const marker = new MaplibreMarker({ element: el, anchor: 'center' })
          .setLngLat([item.lng, item.lat])
          .addTo(map.getMap());
        markersRef.current.set(markerId, marker);
      } else {
        markersRef.current.get(markerId).setLngLat([item.lng, item.lat]);
      }
    });

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [map, presenceItems, showSelfLocation, hasUserLocation, isLiveMapVisible, userLat, userLng, onPresenceClick]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [map]);

  return null;
});

/**
 * Popup state manager — renders MapPopup content into a MaplibrePopup
 * using React createRoot() so full React context is preserved.
 */
function useMapLibrePopup(map) {
  const popupRef = useRef(null);
  const rootRef = useRef(null);

  const showPopup = useCallback((item, coordinates, userLat, userLng) => {
    if (!map) return;

    // Close existing popup
    if (popupRef.current) {
      popupRef.current.remove();
      rootRef.current?.unmount();
      popupRef.current = null;
      rootRef.current = null;
    }

    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);
    flushSync(() => {
      root.render(<MapPopup item={item} userLat={userLat} userLng={userLng} />);
    });

    const popup = new MaplibrePopup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '288px',
      className: 'rr-map-popup',
      offset: 18,
    })
      .setLngLat(coordinates)
      .setDOMContent(container)
      .addTo(map.getMap());

    popupRef.current = popup;
    rootRef.current = root;

    popup.on('close', () => {
      if (rootRef.current === root) {
        root.unmount();
        popupRef.current = null;
        rootRef.current = null;
      } else {
        root.unmount();
      }
    });
  }, [map]);

  const closePopup = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.remove();
      rootRef.current?.unmount();
      popupRef.current = null;
      rootRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        rootRef.current?.unmount();
      }
    };
  }, []);

  return { showPopup, closePopup };
}

/**
 * LiveMapMapLibre — MapLibre GL JS implementation of LiveMap.
 * Drop-in replacement for LiveMap (Leaflet) with identical props.
 * Gated by USE_MAPLIBRE feature flag.
 */
function LiveMapMapLibre({
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
  isLiveMapVisible = false,
  resizeKey = 0,
}) {
  const [mapError, setMapError] = useState(false);
  const [autoFitDisabled, setAutoFitDisabled] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [hasLoadedAnyTile, setHasLoadedAnyTile] = useState(false);
  const mapRef = useRef(null);

  const getProfileRef = useRef(getProfile);
  getProfileRef.current = getProfile;

  const broadcastItems = useMemo(() => {
    return broadcasts
      .map((broadcast) => {
        if (!typeConfig[broadcast.type]) return null;
        const point = getBroadcastPoint(broadcast);
        if (!point) return null;
        return {
          ...broadcast,
          ...point,
          markerType: broadcast.type === 'alert' && broadcast.alert_type === 'bike_down' ? 'bike_down' : broadcast.type,
          author: getProfileRef.current && broadcast.author_id ? getProfileRef.current(broadcast.author_id) : null,
        };
      })
      .filter(Boolean)
      .slice(0, variant === 'full' || variant === 'radar' ? 250 : 75);
  }, [broadcasts, variant]);

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
  const initialRadarViewportRef = useRef(variant === 'radar' ? lastRadarViewport : null);
  const initialRadarViewport = initialRadarViewportRef.current;
  const initialMapCenter = variant === 'radar' && initialRadarViewport?.center
    ? initialRadarViewport.center
    : center;
  const initialMapZoom = variant === 'radar' && Number.isFinite(Number(initialRadarViewport?.zoom))
    ? initialRadarViewport.zoom
    : hasUserLocation ? 11 : 4;

  const handleMapInteraction = useCallback(() => {
    if (variant === 'radar') setAutoFitDisabled(true);
  }, [variant]);

  const handleRetry = useCallback(() => {
    setMapError(false);
    setTilesLoading(true);
    setHasLoadedAnyTile(false);
  }, []);

  useEffect(() => {
    if (variant === 'radar') setAutoFitDisabled(false);
  }, [fitKey, variant]);

  // Trigger resize when resizeKey changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.resize();
    }
  }, [resizeKey]);

  const { showPopup, closePopup } = useMapLibrePopup(mapRef.current);

  const handleMarkerClick = useCallback((item, coordinates) => {
    showPopup(item, coordinates, userLat, userLng);
  }, [showPopup, userLat, userLng]);

  const handlePresenceClick = useCallback((item) => {
    showPopup(item, [item.lng, item.lat], userLat, userLng);
  }, [showPopup, userLat, userLng]);

  const showFatalError = mapError && variant !== 'radar' && items.length === 0 && !offlineMode;

  if (isLoading) return <LoadingState variant={variant} />;
  if (showFatalError) return <ErrorState onRetry={handleRetry} variant={variant} />;

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        variant === 'radar'
          ? 'h-full w-full'
          : 'rr-map-shell rounded-[1.35rem] border border-border/70 bg-background/35 p-3 rr-shadow-xl shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]',
        variant === 'full' ? 'lg:p-4' : variant !== 'radar' ? 'p-4' : '',
        className
      )}
      aria-label="Live map of active rider signals"
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

      <div className={cn('grid gap-3', variant === 'full' && 'lg:grid-cols-[minmax(0,1fr)_20rem]', variant === 'radar' && 'h-full')}>
        <div
          className={cn(
            'relative overflow-hidden rounded-[1.1rem] border border-border/60 bg-background',
            variant === 'full' ? 'min-h-[560px] h-[calc(100svh-15rem)] max-h-[760px]' : variant === 'radar' ? 'h-full min-h-0 rounded-none border-0' : 'h-[320px]'
          )}
          role="application"
          aria-label={`Interactive map showing ${items.length} active ${items.length === 1 ? 'signal' : 'signals'}`}
        >
          {(offlineMode || mapError) && <OfflineMapOverlay snapshotAt={offlineSnapshotAt} tileIssue={mapError} />}
          {(tilesLoading || !hasLoadedAnyTile) && !mapError && <TileLoadingOverlay variant={variant} />}
          <MapSummary items={items} userLat={userLat} userLng={userLng} variant={variant} />

          {variant !== 'radar' && items.length === 0 && (
            <div className={cn('pointer-events-none absolute inset-x-4 z-[430] flex justify-center', variant === 'radar' ? 'bottom-24' : 'bottom-4')}>
              <div className={cn('max-w-sm rounded-2xl border border-border/65 bg-background/78 text-center rr-shadow-lg backdrop-blur-xl', variant === 'radar' ? 'px-4 py-3' : 'p-4')}>
                <MapPin className={cn('mx-auto text-muted-foreground', variant === 'radar' ? 'mb-1 h-5 w-5' : 'mb-2 h-6 w-6')} aria-hidden="true" />
                <h2 className={cn('font-display font-bold', variant === 'radar' ? 'text-base' : 'text-lg')}>No mapped signals</h2>
                {variant !== 'radar' && <p className="mt-1 text-xs text-muted-foreground">Active signals with recognizable locations will appear here as soon as they hit the network.</p>}
              </div>
            </div>
          )}

          <MapLibreMap
            ref={mapRef}
            initialViewState={{
              latitude: Array.isArray(initialMapCenter) ? initialMapCenter[0] : initialMapCenter.lat ?? 39.8283,
              longitude: Array.isArray(initialMapCenter) ? initialMapCenter[1] : initialMapCenter.lng ?? -98.5795,
              zoom: initialMapZoom,
            }}
            mapStyle={CARTO_DARK_VECTOR_STYLE}
            style={{ width: '100%', height: '100%' }}
            scrollZoom={variant === 'full' || variant === 'radar'}
            dragPan={true}
            dragRotate={false}
            touchZoomRotate={true}
            touchPitch={false}
            attributionControl={false}
            onDragStart={handleMapInteraction}
            onZoomStart={handleMapInteraction}
            onLoad={() => {
              setTilesLoading(false);
              setHasLoadedAnyTile(true);
            }}
            onError={() => setMapError(true)}
          >
            {variant === 'radar' && <MapLibreViewportPersistence />}
            <MapLibreFitToItems
              items={items}
              userLat={userLat}
              userLng={userLng}
              variant={variant}
              disabled={variant === 'radar' && autoFitDisabled}
              focusUserLocation={focusUserLocation}
              fitKey={fitKey}
              preserveViewportOnMount={variant === 'radar' && !!initialRadarViewport}
            />
            <MapLibreBroadcastMarkerLayer
              items={broadcastItems}
              userLat={userLat}
              userLng={userLng}
              onMarkerClick={handleMarkerClick}
            />
            <MapLibrePresenceMarkerLayer
              presenceItems={livePresenceItems}
              userLat={userLat}
              userLng={userLng}
              showSelfLocation={showSelfLocation}
              hasUserLocation={hasUserLocation}
              isLiveMapVisible={isLiveMapVisible}
              userAccuracyMeters={userAccuracyMeters}
              onPresenceClick={handlePresenceClick}
            />
          </MapLibreMap>
        </div>
        {variant !== 'radar' && <SignalList items={items} userLat={userLat} userLng={userLng} variant={variant} />}
      </div>
    </section>
  );
}

export default memo(LiveMapMapLibre, (prev, next) => {
  return (
    prev.broadcasts === next.broadcasts &&
    prev.presenceMarkers === next.presenceMarkers &&
    prev.getProfile === next.getProfile &&
    prev.userLat === next.userLat &&
    prev.userLng === next.userLng &&
    prev.userAccuracyMeters === next.userAccuracyMeters &&
    prev.isLoading === next.isLoading &&
    prev.variant === next.variant &&
    prev.className === next.className &&
    prev.fitKey === next.fitKey &&
    prev.focusUserLocation === next.focusUserLocation &&
    prev.showSelfLocation === next.showSelfLocation &&
    prev.offlineMode === next.offlineMode &&
    prev.offlineSnapshotAt === next.offlineSnapshotAt &&
    prev.isLiveMapVisible === next.isLiveMapVisible &&
    prev.resizeKey === next.resizeKey
  );
});
