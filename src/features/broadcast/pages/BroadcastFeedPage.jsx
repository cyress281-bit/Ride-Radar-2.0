import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, SlidersHorizontal, ChevronUp, Navigation } from 'lucide-react';
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

const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'solo_ride', label: 'Riders' },
  { id: 'iso', label: 'ISO' },
  { id: 'event', label: 'Events' },
];

const emptyRadarLocation = { lat: null, lng: null, accuracyMeters: null, source: 'none' };

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

/**
 * BroadcastFeedPage — Apple Maps-style full-screen radar.
 *
 * The map fills the entire viewport. UI elements float as overlays:
 * - Top: signal count pill
 * - Right: floating action buttons (locate me, create broadcast)
 * - Bottom: draggable sheet with broadcast list
 *
 * Location is optional. The map shows a default view (US center) until
 * the user taps "Locate me" to grant permission.
 */
export default function BroadcastFeedPage() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const isOnline = useOnlineStatus();

  const [userLoc, setUserLoc] = useState(readCachedRadarLocation);
  const [offlineSnapshot, setOfflineSnapshot] = useState(readRadarOfflineSnapshot);
  const [geoError, setGeoError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const sheetRef = useRef(null);
  const sheetStartY = useRef(0);
  const sheetCurrentY = useRef(0);

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const effectiveLoc = hasUserLocation ? userLoc : US_CENTER;

  // Fetch broadcasts around effective location
  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(
    effectiveLoc.lat,
    effectiveLoc.lng,
    hasUserLocation ? 50 : 500
  );

  const usingOfflineSnapshot = !isOnline && !!offlineSnapshot;
  const sourceBroadcasts = usingOfflineSnapshot ? offlineSnapshot.broadcasts : nearbyBroadcasts;
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
    () => rankBroadcasts(visibleBroadcasts, effectiveLoc.lat, effectiveLoc.lng),
    [visibleBroadcasts, effectiveLoc.lat, effectiveLoc.lng]
  );

  const filteredBroadcasts = useMemo(() => {
    let list = rankedBroadcasts;
    if (filter !== 'all') {
      list = list.filter((b) => b.type === filter);
    }
    if (sortBy === 'distance') {
      list = [...list].sort((a, b) => {
        const da = haversineMiles(effectiveLoc.lat, effectiveLoc.lng, a.frozen_lat, a.frozen_lng) ?? Infinity;
        const db = haversineMiles(effectiveLoc.lat, effectiveLoc.lng, b.frozen_lat, b.frozen_lng) ?? Infinity;
        return da - db;
      });
    } else if (sortBy === 'time') {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [rankedBroadcasts, filter, sortBy, effectiveLoc.lat, effectiveLoc.lng]);

  const authorIds = useMemo(() => filteredBroadcasts.map(getAuthorId).filter(Boolean), [filteredBroadcasts]);
  const { getProfile } = useProfileBatch(authorIds);

  // Cache offline snapshot
  useEffect(() => {
    if (!isOnline || !hasUserLocation || isLoadingBroadcasts) return;
    if (visibleBroadcasts.length === 0 && visibleRiderMarkers.length === 0) return;
    cacheRadarOfflineSnapshot({ broadcasts: visibleBroadcasts, riderMarkers: visibleRiderMarkers });
    setOfflineSnapshot(readRadarOfflineSnapshot());
  }, [hasUserLocation, isLoadingBroadcasts, isOnline, visibleBroadcasts, visibleRiderMarkers]);

  // Request location — user-initiated only
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    setGeoError(false);

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
        setLocating(false);
      },
      (err) => {
        logger.warn('[Radar] Geolocation error:', err.message);
        setGeoError(true);
        setLocating(false);
      },
      { maximumAge: 30000, timeout: 9000, enableHighAccuracy: true }
    );
  }, []);

  // Watch location once granted
  useEffect(() => {
    if (!hasUserLocation) return;
    let watchId = null;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          source: 'live',
        };
        setUserLoc(next);
        cacheRadarLocation(next);
      },
      (err) => logger.warn('[Radar] Geolocation watch error:', err.message),
      { maximumAge: 15000, timeout: 12000, enableHighAccuracy: true }
    );
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [hasUserLocation]);

  // Bottom sheet drag handling
  const handleSheetTouchStart = useCallback((e) => {
    sheetStartY.current = e.touches[0].clientY;
    sheetCurrentY.current = 0;
  }, []);

  const handleSheetTouchMove = useCallback((e) => {
    const delta = sheetStartY.current - e.touches[0].clientY;
    sheetCurrentY.current = delta;
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    if (sheetCurrentY.current > 60) {
      setSheetOpen(true);
    } else if (sheetCurrentY.current < -60) {
      setSheetOpen(false);
    }
  }, []);

  const activeCount = filteredBroadcasts.length;

  return (
    <div className="fixed inset-0">
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <LiveMap
          broadcasts={filteredBroadcasts}
          presenceMarkers={visibleRiderMarkers}
          getProfile={getProfile}
          userLat={effectiveLoc.lat}
          userLng={effectiveLoc.lng}
          userAccuracyMeters={effectiveLoc.accuracyMeters}
          isLoading={isLoadingBroadcasts && !usingOfflineSnapshot}
          variant="radar"
          className="h-full w-full"
          fitKey={hasUserLocation ? 'self' : 'default'}
          focusUserLocation={hasUserLocation}
          showSelfLocation={hasUserLocation}
          offlineMode={usingOfflineSnapshot}
          offlineSnapshotAt={offlineSnapshot?.cachedAt}
        />
      </div>

      {/* Top info pill */}
      <div className="absolute top-16 left-4 right-4 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-green shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="text-xs font-bold text-foreground">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'}
          </span>
          {!hasUserLocation && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-l border-white/10 pl-3">
              US overview
            </span>
          )}
          {usingOfflineSnapshot && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-alert border-l border-white/10 pl-3">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="absolute bottom-28 right-4 z-10 flex flex-col gap-3">
        {/* Create broadcast */}
        <button
          onClick={() => navigate('/broadcast')}
          className="rr-haptic flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4),0_8px_24px_rgba(0,0,0,0.4)] transition-transform active:scale-90"
          aria-label="Create broadcast"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Locate me */}
        <button
          onClick={requestLocation}
          disabled={locating}
          className={cn(
            'rr-haptic flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-xl border transition-all active:scale-90',
            hasUserLocation
              ? 'bg-black/60 border-white/10 text-primary shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
              : 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4),0_8px_24px_rgba(0,0,0,0.4)]'
          )}
          aria-label={hasUserLocation ? 'Center on my location' : 'Enable location'}
        >
          {locating ? (
            <Navigation className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Location error toast */}
      {geoError && (
        <div className="absolute top-28 left-4 right-4 z-10 flex justify-center">
          <div className="rounded-2xl border border-alert/30 bg-alert/10 backdrop-blur-xl px-4 py-3 text-center shadow-lg">
            <p className="text-xs font-bold text-alert">Location access denied</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enable location in settings to see nearby signals</p>
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute left-0 right-0 z-20 bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out',
          sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-110px)]'
        )}
        style={{ top: 'auto', bottom: 0, maxHeight: '70vh' }}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
      >
        {/* Sheet handle */}
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="w-full flex flex-col items-center pt-3 pb-2"
        >
          <span className="h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-foreground">
              {activeCount} {activeCount === 1 ? 'signal' : 'signals'} nearby
            </span>
            <ChevronUp
              className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sheetOpen && 'rotate-180')}
            />
          </div>
        </button>

        {/* Sheet content */}
        <div className={cn('overflow-y-auto px-4 pb-6', sheetOpen ? 'max-h-[55vh]' : 'max-h-0')}>
          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scroll-hide">
            {FILTER_TYPES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
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
          <div className="space-y-3">
            {filteredBroadcasts.map((broadcast) => (
              <BroadcastCard
                key={broadcast.id}
                broadcast={broadcast}
                author={getProfile(broadcast.author_id)}
                userLat={effectiveLoc.lat}
                userLng={effectiveLoc.lng}
              />
            ))}
            {filteredBroadcasts.length === 0 && !isLoadingBroadcasts && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No signals in this area.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tap the + button to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
