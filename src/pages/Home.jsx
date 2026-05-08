import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useNearbyBroadcasts } from '@/hooks/useNearbyBroadcasts';
import { useLiveMapPresence } from '@/hooks/useLiveMapPresence';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import LiveMapSurface from '@/components/map/LiveMapSurface';
import { rankBroadcasts } from '@/lib/broadcastUtils';
import { logger } from '@/lib/logger';

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
    return {
      lat,
      lng,
      accuracyMeters: Number.isFinite(Number(parsed.accuracyMeters)) ? Number(parsed.accuracyMeters) : null,
      source: 'cached',
    };
  } catch {
    return emptyRadarLocation;
  }
}

function cacheRadarLocation(location) {
  if (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return;
  window.localStorage.setItem(RADAR_LOCATION_CACHE_KEY, JSON.stringify({
    lat: location.lat,
    lng: location.lng,
    accuracyMeters: location.accuracyMeters,
    cachedAt: Date.now(),
  }));
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
    window.localStorage.setItem(RADAR_OFFLINE_SNAPSHOT_KEY, JSON.stringify({
      broadcasts: broadcasts.slice(0, 100),
      riderMarkers: riderMarkers.slice(0, 60),
      cachedAt: Date.now(),
    }));
  } catch {
    // Storage may be unavailable or full; Radar still works without an offline snapshot.
  }
}

function getAuthorId(broadcast) {
  return broadcast.author_id || broadcast.authorId;
}

export default function Home() {
  const { user } = useSupabaseAuth();
  const isOnline = useOnlineStatus();
  const [userLoc, setUserLoc] = useState(readCachedRadarLocation);
  const [offlineSnapshot, setOfflineSnapshot] = useState(readRadarOfflineSnapshot);
  const [isResolvingLocation, setIsResolvingLocation] = useState(() => readCachedRadarLocation().lat == null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    let active = true;
    let watchId = null;

    if (!navigator.geolocation) {
      setGeoError(true);
      setIsResolvingLocation(false);
      return () => {
        active = false;
      };
    }

    const applyPosition = (pos) => {
      if (!active) return;
      const nextLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy,
        source: 'live',
      };
      setUserLoc(nextLocation);
      cacheRadarLocation(nextLocation);
      setGeoError(false);
      setIsResolvingLocation(false);
    };

    const handlePositionError = (err) => {
      if (!active) return;
      logger.warn('[Radar] Geolocation error:', err.message);
      setGeoError(true);
      setIsResolvingLocation(false);
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      handlePositionError,
      { maximumAge: 30000, timeout: 9000, enableHighAccuracy: true }
    );

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        applyPosition(pos);
      },
      (err) => {
        logger.warn('[Radar] Geolocation watch error:', err.message);
      },
      { maximumAge: 15000, timeout: 12000, enableHighAccuracy: true }
    );

    return () => {
      active = false;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(userLoc.lat, userLoc.lng, 50);

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const usingOfflineSnapshot = !isOnline && !!offlineSnapshot;
  const sourceBroadcasts = hasUserLocation
    ? usingOfflineSnapshot ? offlineSnapshot.broadcasts : nearbyBroadcasts
    : [];
  const isLoadingBroadcasts = hasUserLocation ? isLoadingNearby : false;
  const { blockedIds } = useBlockedProfiles();

  const { markers: riderMarkers } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng, accuracyMeters: userLoc.accuracyMeters },
    { autoPublish: false, source: 'radar' }
  );

  const visibleBroadcasts = useMemo(
    () => sourceBroadcasts.filter((broadcast) => !blockedIds.has(getAuthorId(broadcast))),
    [sourceBroadcasts, blockedIds]
  );

  const rawRiderMarkers = usingOfflineSnapshot ? offlineSnapshot.riderMarkers : riderMarkers;

  const visibleRiderMarkers = useMemo(
    () => rawRiderMarkers.filter((marker) => {
      const markerUserId = marker.user_id || marker.userId;
      return markerUserId !== user?.id && !blockedIds.has(markerUserId);
    }),
    [blockedIds, rawRiderMarkers, user?.id]
  );

  const rankedBroadcasts = useMemo(
    () => rankBroadcasts(visibleBroadcasts, userLoc.lat, userLoc.lng),
    [visibleBroadcasts, userLoc.lat, userLoc.lng]
  );

  const authorIds = useMemo(
    () => rankedBroadcasts.map(getAuthorId).filter(Boolean),
    [rankedBroadcasts]
  );
  const { getProfile } = useProfileBatch(authorIds);

  useEffect(() => {
    if (!isOnline || !hasUserLocation || isLoadingBroadcasts) return;
    if (visibleBroadcasts.length === 0 && visibleRiderMarkers.length === 0) return;
    cacheRadarOfflineSnapshot({
      broadcasts: visibleBroadcasts,
      riderMarkers: visibleRiderMarkers,
    });
    setOfflineSnapshot(readRadarOfflineSnapshot());
  }, [hasUserLocation, isLoadingBroadcasts, isOnline, visibleBroadcasts, visibleRiderMarkers]);

  return (
    <div className="rr-radar-page relative overflow-hidden p-2">
      <div className="h-full min-h-0">
        {hasUserLocation || isResolvingLocation ? (
          <LiveMapSurface
            broadcasts={rankedBroadcasts}
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
        ) : (
          <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-[28px] border-2 border-primary/35 bg-black/55 p-8 text-center shadow-[0_0_0_1px_hsl(var(--primary)/0.14),0_0_32px_hsl(var(--primary)/0.2),0_22px_70px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.2)]">
              <MapPin className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl font-extrabold">Location required</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Radar opens on your private pin. Allow location access to load the map.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
