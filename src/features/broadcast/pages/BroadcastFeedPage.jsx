import { useEffect, useMemo, useState } from 'react';
import { Radio, Crosshair, SlidersHorizontal } from 'lucide-react';
import { useNearbyBroadcasts } from '@/features/broadcast/hooks/use-nearby-broadcasts.js';
import { useLiveMapPresence } from '@/features/map/hooks/use-live-map.js';
import { useBlockedIds } from '@/features/safety/hooks/use-blocks';
import { useProfileBatch } from '@/features/profile/hooks/use-profile-batch';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import LiveMap from '@/features/map/components/LiveMap';
import BroadcastCard from '@/features/broadcast/components/BroadcastCard';
import { rankBroadcasts, haversineMiles } from '@/lib/broadcastUtils';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils.js';

const RADAR_LOCATION_CACHE_KEY = 'rr:last-radar-location';
const RADAR_OFFLINE_SNAPSHOT_KEY = 'rr:radar-offline-snapshot';
const RADAR_LOCATION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const RADAR_OFFLINE_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const emptyRadarLocation = {
  lat: null,
  lng: null,
  accuracyMeters: null,
  source: 'none',
};

function readCachedRadarLocation() {
  try {
    const raw = window.localStorage.getItem(RADAR_LOCATION_CACHE_KEY);
    if (!raw) return emptyRadarLocation;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(Number(parsed.cachedAt)) || Date.now() - Number(parsed.cachedAt) > RADAR_LOCATION_CACHE_MAX_AGE_MS) {
      return emptyRadarLocation;
    }
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return emptyRadarLocation;
    return { lat, lng, accuracyMeters: parsed.accuracyMeters, source: 'cached' };
  } catch {
    return emptyRadarLocation;
  }
}

function cacheRadarLocation(location) {
  if (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return;
  window.localStorage.setItem(
    RADAR_LOCATION_CACHE_KEY,
    JSON.stringify({ lat: location.lat, lng: location.lng, accuracyMeters: location.accuracyMeters, cachedAt: Date.now() })
  );
}

function readRadarOfflineSnapshot() {
  try {
    const raw = window.localStorage.getItem(RADAR_OFFLINE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(Number(parsed.cachedAt)) || Date.now() - Number(parsed.cachedAt) > RADAR_OFFLINE_SNAPSHOT_MAX_AGE_MS) {
      return null;
    }
    return {
      broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [],
      riderMarkers: Array.isArray(parsed.riderMarkers) ? parsed.riderMarkers : [],
      cachedAt: Number(parsed.cachedAt),
    };
  } catch {
    return null;
  }
}

function cacheRadarOfflineSnapshot({ broadcasts, riderMarkers }) {
  try {
    window.localStorage.setItem(
      RADAR_OFFLINE_SNAPSHOT_KEY,
      JSON.stringify({ broadcasts: broadcasts.slice(0, 100), riderMarkers: riderMarkers.slice(0, 60), cachedAt: Date.now() })
    );
  } catch {}
}

function getAuthorId(broadcast) {
  return broadcast.author_id;
}

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'solo_ride', label: 'Riders' },
  { id: 'iso', label: 'ISO' },
  { id: 'event', label: 'Events' },
];

/**
 * Main home / radar page.
 */
export default function BroadcastFeedPage() {
  const { user } = useSupabaseAuth();
  const isOnline = useOnlineStatus();
  const [userLoc, setUserLoc] = useState(readCachedRadarLocation);
  const [offlineSnapshot, setOfflineSnapshot] = useState(readRadarOfflineSnapshot);
  const [isResolvingLocation, setIsResolvingLocation] = useState(() => readCachedRadarLocation().lat == null);
  const [geoError, setGeoError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank'); // 'rank' | 'distance' | 'time'

  useEffect(() => {
    let active = true;
    let watchId = null;

    if (!navigator.geolocation) {
      setGeoError(true);
      setIsResolvingLocation(false);
      return () => { active = false; };
    }

    const applyPosition = (pos) => {
      if (!active) return;
      const next = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy,
        source: 'live',
      };
      setUserLoc(next);
      cacheRadarLocation(next);
      setGeoError(false);
      setIsResolvingLocation(false);
    };

    const handleError = (err) => {
      if (!active) return;
      logger.warn('[Radar] Geolocation error:', err.message);
      setGeoError(true);
      setIsResolvingLocation(false);
    };

    navigator.geolocation.getCurrentPosition(applyPosition, handleError, {
      maximumAge: 30000, timeout: 9000, enableHighAccuracy: true,
    });

    watchId = navigator.geolocation.watchPosition(applyPosition, (err) => {
      logger.warn('[Radar] Geolocation watch error:', err.message);
    }, { maximumAge: 15000, timeout: 12000, enableHighAccuracy: true });

    return () => {
      active = false;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(userLoc.lat, userLoc.lng, 50);

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const usingOfflineSnapshot = !isOnline && !!offlineSnapshot;
  const sourceBroadcasts = hasUserLocation ? (usingOfflineSnapshot ? offlineSnapshot.broadcasts : nearbyBroadcasts) : [];
  const isLoadingBroadcasts = hasUserLocation ? isLoadingNearby : false;

  const { blockedIds } = useBlockedIds();

  const { markers: riderMarkers } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng, accuracyMeters: userLoc.accuracyMeters },
    { autoPublish: false, source: 'radar' }
  );

  const visibleBroadcasts = useMemo(
    () => sourceBroadcasts.filter((b) => !blockedIds.has(getAuthorId(b))),
    [sourceBroadcasts, blockedIds]
  );

  const rawRiderMarkers = usingOfflineSnapshot ? offlineSnapshot.riderMarkers : riderMarkers;

  const visibleRiderMarkers = useMemo(
    () => rawRiderMarkers.filter((m) => {
      const markerUserId = m.user_id || m.userId;
      return markerUserId !== user?.id && !blockedIds.has(markerUserId);
    }),
    [blockedIds, rawRiderMarkers, user?.id]
  );

  const rankedBroadcasts = useMemo(
    () => rankBroadcasts(visibleBroadcasts, userLoc.lat, userLoc.lng),
    [visibleBroadcasts, userLoc.lat, userLoc.lng]
  );

  const filteredBroadcasts = useMemo(() => {
    let list = rankedBroadcasts;
    if (filter !== 'all') {
      list = list.filter((b) => b.type === filter);
    }
    if (sortBy === 'distance') {
      list = [...list].sort((a, b) => {
        const da = haversineMiles(userLoc.lat, userLoc.lng, a.frozen_lat, a.frozen_lng) ?? Infinity;
        const db = haversineMiles(userLoc.lat, userLoc.lng, b.frozen_lat, b.frozen_lng) ?? Infinity;
        return da - db;
      });
    } else if (sortBy === 'time') {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [rankedBroadcasts, filter, sortBy, userLoc.lat, userLoc.lng]);

  const authorIds = useMemo(() => filteredBroadcasts.map(getAuthorId).filter(Boolean), [filteredBroadcasts]);
  const { getProfile } = useProfileBatch(authorIds);

  useEffect(() => {
    if (!isOnline || !hasUserLocation || isLoadingBroadcasts) return;
    if (visibleBroadcasts.length === 0 && visibleRiderMarkers.length === 0) return;
    cacheRadarOfflineSnapshot({ broadcasts: visibleBroadcasts, riderMarkers: visibleRiderMarkers });
    setOfflineSnapshot(readRadarOfflineSnapshot());
  }, [hasUserLocation, isLoadingBroadcasts, isOnline, visibleBroadcasts, visibleRiderMarkers]);

  return (
    <div className="rr-radar-page relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 radar-grid opacity-40" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-[hsl(var(--primary)/0.06)] blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-[hsl(var(--primary)/0.04)] blur-[100px]" aria-hidden="true" />

      <div className="relative z-0 h-full min-h-0 p-2">
        {hasUserLocation || isResolvingLocation ? (
          <>
            <LiveMap
              broadcasts={filteredBroadcasts}
              presenceMarkers={visibleRiderMarkers}
              getProfile={getProfile}
              userLat={userLoc.lat}
              userLng={userLoc.lng}
              userAccuracyMeters={userLoc.accuracyMeters}
              isLoading={(isResolvingLocation && !hasUserLocation) || (isLoadingBroadcasts && !usingOfflineSnapshot)}
              variant="radar"
              className="rr-radar-map-frame h-full rounded-[28px] border-2 border-primary/45 bg-black/50 p-1.5 shadow-[0_0_0_1px_hsl(var(--primary)/0.16),0_0_36px_hsl(var(--primary)/0.24),0_22px_70px_rgba(0,0,0,0.5)]"
              fitKey={hasUserLocation ? 'self' : 'pending'}
              focusUserLocation={hasUserLocation}
              showSelfLocation={hasUserLocation}
              offlineMode={usingOfflineSnapshot}
              offlineSnapshotAt={offlineSnapshot?.cachedAt}
            />

            {/* Feed controls */}
            <div className="mt-3 px-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-hide">
                {FILTER_TYPES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
                      filter === f.id
                        ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-bold text-muted-foreground outline-none"
                  >
                    <option value="rank">Rank</option>
                    <option value="distance">Distance</option>
                    <option value="time">Newest</option>
                  </select>
                </div>
              </div>

              {/* Broadcast list */}
              <div className="mt-2 space-y-3 pb-4">
                {filteredBroadcasts.map((broadcast) => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    author={getProfile(broadcast.author_id)}
                    userLat={userLoc.lat}
                    userLng={userLoc.lng}
                  />
                ))}
                {filteredBroadcasts.length === 0 && !isLoadingBroadcasts && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No signals in this area.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rr-surface-strong relative flex h-full min-h-0 flex-col items-center justify-center rounded-[28px] border-2 border-primary/35 p-8 text-center shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_0_32px_hsl(var(--primary)/0.2),0_22px_70px_rgba(0,0,0,0.5)]">
            <div className="pointer-events-none absolute left-4 top-4" aria-hidden="true">
              <div className="h-5 w-5 border-l-2 border-t-2 border-[hsl(var(--primary)/0.4)]" />
            </div>
            <div className="pointer-events-none absolute right-4 top-4" aria-hidden="true">
              <div className="h-5 w-5 border-r-2 border-t-2 border-[hsl(var(--primary)/0.4)]" />
            </div>
            <div className="pointer-events-none absolute left-4 bottom-4" aria-hidden="true">
              <div className="h-5 w-5 border-l-2 border-b-2 border-[hsl(var(--primary)/0.4)]" />
            </div>
            <div className="pointer-events-none absolute right-4 bottom-4" aria-hidden="true">
              <div className="h-5 w-5 border-r-2 border-b-2 border-[hsl(var(--primary)/0.4)]" />
            </div>

            <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-pulse-green rounded-full border border-primary/25" />
              <div className="absolute inset-2 rounded-full border border-primary/15" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.25)]">
                <Crosshair className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>

            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-gradient-green">Location required</span>
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Radar opens on your private pin. Allow location access to load the map.
            </p>

            {geoError && (
              <>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-alert/30 bg-alert/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-alert">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Signal blocked
                </div>
                <button
                  onClick={() => {
                    setGeoError(false);
                    setIsResolvingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const next = {
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                          accuracyMeters: pos.coords.accuracy,
                          source: 'live',
                        };
                        setUserLoc(next);
                        cacheRadarLocation(next);
                        setGeoError(false);
                        setIsResolvingLocation(false);
                      },
                      (err) => {
                        logger.warn('[Radar] Geolocation retry error:', err.message);
                        setGeoError(true);
                        setIsResolvingLocation(false);
                      },
                      { maximumAge: 30000, timeout: 9000, enableHighAccuracy: true }
                    );
                  }}
                  className="mt-4 rr-haptic inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                >
                  <Crosshair className="h-4 w-4" />
                  Retry location
                </button>
                <p className="mt-3 max-w-xs text-xs text-muted-foreground">
                  If location keeps failing, check your browser settings and ensure location access is allowed for this site.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
