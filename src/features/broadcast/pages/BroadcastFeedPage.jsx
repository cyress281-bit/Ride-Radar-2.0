import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Crosshair, Plus, SlidersHorizontal, ChevronUp, Navigation } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { useNearbyBroadcasts } from '@/features/broadcast/hooks/use-nearby-broadcasts.js';
import { useLiveMapPresence } from '@/features/map/hooks/use-live-map.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useOnlineStatus } from '@/hooks/use-online-status.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import LiveMap from '@/features/map/components/LiveMap';
import BroadcastCard from '@/components/shared/BroadcastCard';
import { rankBroadcasts, haversineMiles } from '@/lib/broadcastUtils';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils.js';
import { preloadTilesAround } from '@/lib/tileCache.js';

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
function BroadcastFeedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const isOnline = useOnlineStatus();

  const [userLoc, setUserLoc] = useState(readCachedRadarLocation);
  const [offlineSnapshot, setOfflineSnapshot] = useState(readRadarOfflineSnapshot);
  const [geoError, setGeoError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const sheetRef = useRef(null);
  const sheetStartY = useRef(0);
  const sheetCurrentY = useRef(0);
  const sheetContentRef = useRef(null);

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const effectiveLoc = hasUserLocation ? userLoc : US_CENTER;

  // Fetch broadcasts around effective location
  const { blockedIds } = useBlockedIds();

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(
    effectiveLoc.lat,
    effectiveLoc.lng,
    hasUserLocation ? 50 : 500,
    Array.from(blockedIds)
  );

  const usingOfflineSnapshot = !isOnline && !!offlineSnapshot;
  const sourceBroadcasts = usingOfflineSnapshot ? offlineSnapshot.broadcasts : nearbyBroadcasts;
  const isLoadingBroadcasts = hasUserLocation ? isLoadingNearby : false;

  const { markers: riderMarkers } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng, accuracyMeters: userLoc.accuracyMeters },
    { autoPublish: false, source: 'radar' }
  );

  const visibleBroadcasts = useMemo(
    () =>
      sourceBroadcasts.filter((b) => {
        if (blockedIds.has(getAuthorId(b))) return false;
        if (b.expires_at && new Date(b.expires_at) <= new Date()) return false;
        return true;
      }),
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

  // Preload map tiles around user location for offline use
  useEffect(() => {
    if (!hasUserLocation) return;
    const timer = setTimeout(() => {
      preloadTilesAround(effectiveLoc.lat, effectiveLoc.lng, [10, 11, 12, 13, 14], 2);
    }, 2500);
    return () => clearTimeout(timer);
  }, [hasUserLocation, effectiveLoc.lat, effectiveLoc.lng]);

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

  // Pull-to-refresh feel on sheet content
  const handleContentTouchStart = useCallback((e) => {
    const el = sheetContentRef.current;
    if (!el || el.scrollTop > 0) return;
    sheetStartY.current = e.touches[0].clientY;
    setIsPulling(true);
    e.stopPropagation();
  }, []);

  const handleContentTouchMove = useCallback((e) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - sheetStartY.current;
    if (delta > 0) {
      setPullOffset(Math.min(delta * 0.4, 80));
    }
    e.stopPropagation();
  }, [isPulling]);

  const handleContentTouchEnd = useCallback((e) => {
    if (pullOffset > 40) {
      queryClient.invalidateQueries({ queryKey: ['broadcasts', 'nearby'] });
    }
    setIsPulling(false);
    setPullOffset(0);
    e.stopPropagation();
  }, [pullOffset, queryClient]);

  // Prevent body scroll when bottom sheet is open
  useEffect(() => {
    if (sheetOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [sheetOpen]);

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
      <div className="absolute top-header-offset left-4 right-4 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-background/60 backdrop-blur-xl border border-foreground/10 px-4 py-2 rr-shadow-md">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-green " />
          <span className="text-xs font-bold text-foreground">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'}
          </span>
          {!hasUserLocation && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-l border-foreground/10 pl-3">
              US overview
            </span>
          )}
          {usingOfflineSnapshot && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-alert border-l border-foreground/10 pl-3">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="absolute bottom-44 right-4 z-[30] flex flex-col gap-3">
        {/* Create broadcast */}
        <button
          onClick={() => navigate('/broadcast')}
          className="rr-haptic flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground rr-shadow-glow rr-shadow-sm transition-transform active:scale-90"
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
              ? 'bg-background/60 border-foreground/10 text-primary rr-shadow-sm'
              : 'bg-primary text-primary-foreground border-primary rr-shadow-glow rr-shadow-sm'
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
        <div className="absolute top-32 left-4 right-4 z-10 flex justify-center">
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
          'absolute left-0 right-0 z-20 bg-background/80 backdrop-blur-2xl border-t border-foreground/10 rounded-t-[28px] rr-shadow-up transition-transform duration-300 ease-out min-h-[56px]',
          sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'
        )}
        style={{
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          maxHeight: sheetOpen
            ? 'calc(100svh - 80px - env(safe-area-inset-bottom, 0px))'
            : '70vh',
        }}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
      >
        {/* Sheet handle */}
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="w-full flex flex-col items-center pt-3 pb-2 min-h-[44px] active:scale-95 active:opacity-80 transition-all duration-150"
        >
          <span className="h-1 w-10 rounded-full bg-foreground/20" />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-foreground">
              {activeCount} {activeCount === 1 ? 'signal' : 'signals'} nearby
            </span>
            <ChevronUp
              className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sheetOpen && 'rotate-180')}
            />
          </div>
        </button>

        {/* Pull indicator */}
        {pullOffset > 10 && (
          <div className="flex justify-center pt-2 pb-1">
            <RRLogo
              size="sm"
              className={cn('opacity-60', pullOffset > 40 && 'animate-spin')}
              glow={false}
            />
          </div>
        )}

        {/* Sheet content */}
        <div
          ref={sheetContentRef}
          onTouchStart={handleContentTouchStart}
          onTouchMove={handleContentTouchMove}
          onTouchEnd={handleContentTouchEnd}
          className={cn('overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6 pb-safe', sheetOpen ? 'max-h-[55vh]' : 'max-h-0')}
        >
          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scroll-hide [-webkit-overflow-scrolling:touch]">
            {FILTER_TYPES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 min-h-[44px] text-xs font-bold transition-all duration-150 active:scale-95 active:opacity-80',
                  filter === f.id
                    ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 min-h-[44px] px-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-bold text-muted-foreground outline-none py-2 px-1"
              >
                <option value="rank">Rank</option>
                <option value="distance">Distance</option>
                <option value="time">Newest</option>
              </select>
            </div>
          </div>

          {/* Broadcast list */}
          <div className="space-y-3">
            {isLoadingBroadcasts && filteredBroadcasts.length === 0 && (
              <div className="py-12 flex flex-col items-center gap-4">
                <RRLogo size="sm" className="opacity-40 animate-pulse" glow={false} />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
                  Scanning area…
                </p>
              </div>
            )}
            {filteredBroadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="will-change-transform transform-gpu"
              >
                <BroadcastCard
                  broadcast={broadcast}
                  author={getProfile(broadcast.author_id)}
                  userLat={effectiveLoc.lat}
                  userLng={effectiveLoc.lng}
                />
              </div>
            ))}
            {filteredBroadcasts.length === 0 && !isLoadingBroadcasts && (
              <div className="py-12 text-center">
                <RRLogo size="sm" className="mx-auto mb-4 opacity-50" glow={false} />
                <p className="text-sm font-medium text-muted-foreground">No signals in this area.</p>
                <p className="text-xs text-muted-foreground/60 mt-2">Tap the + button to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(BroadcastFeedPage);
