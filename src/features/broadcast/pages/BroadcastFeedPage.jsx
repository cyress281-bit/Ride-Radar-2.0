import { useEffect, useMemo, useState, useTransition, memo, useRef } from 'react';
import { useNearbyBroadcasts } from '@/features/broadcast/hooks/use-nearby-broadcasts.js';
import { useLiveMapPresence } from '@/features/map/hooks/use-live-map.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useOnlineStatus } from '@/hooks/use-online-status.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useRadarLocation } from '@/features/broadcast/hooks/use-radar-location.js';
import { useBottomSheet } from '@/features/broadcast/hooks/use-bottom-sheet.js';
import { useRadarViewport } from '@/features/broadcast/hooks/use-radar-viewport.js';
import LiveMap from '@/features/map/components/LiveMap';
import { rankBroadcasts, haversineMiles } from '@/lib/broadcastUtils';
import RadarOverlay from '@/features/broadcast/components/RadarOverlay';
import RadarBottomSheet from '@/features/broadcast/components/RadarBottomSheet';

const RADAR_OFFLINE_SNAPSHOT_KEY = 'rr:radar-offline-snapshot';
const RADAR_OFFLINE_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
  const { user } = useAuthState();
  const isOnline = useOnlineStatus();
  const radarViewport = useRadarViewport();

  const { userLoc, hasUserLocation, geoError, effectiveLoc } = useRadarLocation();
  const {
    sheetOpen,
    setSheetOpen,
    sheetRef,
    sheetContentRef,
    pullOffset,
    sheetTouchHandlers,
    contentTouchHandlers,
  } = useBottomSheet();

  const [offlineSnapshot, setOfflineSnapshot] = useState(readRadarOfflineSnapshot);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank');
  const [isPending, startTransition] = useTransition();
  const { blockedIds } = useBlockedIds();

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(
    hasUserLocation ? effectiveLoc.lat : null,
    hasUserLocation ? effectiveLoc.lng : null,
    50,
    Array.from(blockedIds)
  );

  const usingOfflineSnapshot = !isOnline && !!offlineSnapshot;
  const sourceBroadcasts = usingOfflineSnapshot ? offlineSnapshot.broadcasts : hasUserLocation ? nearbyBroadcasts : [];
  const isLoadingBroadcasts = hasUserLocation ? isLoadingNearby : false;

  const { markers: riderMarkers, isLiveMapVisible } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng, accuracyMeters: userLoc.accuracyMeters },
    { autoPublish: true, source: 'radar' }
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
    () =>
      rawRiderMarkers.filter((m) => {
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

  // Cache offline snapshot (debounced to avoid main-thread jank)
  const snapshotTimerRef = useRef(null);
  useEffect(() => {
    if (!isOnline || !hasUserLocation || isLoadingBroadcasts) return;
    if (visibleBroadcasts.length === 0 && visibleRiderMarkers.length === 0) return;
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      cacheRadarOfflineSnapshot({ broadcasts: visibleBroadcasts, riderMarkers: visibleRiderMarkers });
      setOfflineSnapshot(readRadarOfflineSnapshot());
    }, 2000);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [hasUserLocation, isLoadingBroadcasts, isOnline, visibleBroadcasts, visibleRiderMarkers]);

  const activeCount = filteredBroadcasts.length;

  // Phase 4: honest collapsed peek — uses unfiltered data so it never lies about what's nearby
  const peekLabel = useMemo(() => {
    const bikeDownAlerts = visibleBroadcasts.filter(
      (b) => b.type === 'alert' && (b.alert_type === 'bike_down' || b.alertType === 'bike_down')
    ).length;
    const alerts = visibleBroadcasts.filter((b) => b.type === 'alert').length;
    const help = visibleBroadcasts.filter(
      (b) => b.type === 'iso' && ((b.isoSubtype || b.iso_subtype) === 'mechanic')
    ).length;
    const rides = visibleBroadcasts.filter(
      (b) => b.type === 'solo_ride' || (b.type === 'iso' && ((b.isoSubtype || b.iso_subtype) === 'bike_crew'))
    ).length;
    const events = visibleBroadcasts.filter((b) => b.type === 'event').length;
    const riders = visibleRiderMarkers.length;
    const total = visibleBroadcasts.length;

    if (bikeDownAlerts > 0) return bikeDownAlerts === 1 ? 'Bike Down nearby' : `${bikeDownAlerts} Bike Down alerts nearby`;
    if (alerts > 0) return alerts === 1 ? 'Warning nearby' : `${alerts} warnings nearby`;
    if (help > 0) return help === 1 ? 'Help request nearby' : `${help} help requests nearby`;
    if (rides > 0) return rides === 1 ? 'Ride forming nearby' : `${rides} rides nearby`;
    if (events > 0) return 'Events nearby this week';
    if (riders > 0) return riders === 1 ? '1 rider nearby' : `${riders} riders nearby`;
    if (total > 0) return total === 1 ? '1 signal nearby' : `${total} signals nearby`;
    if (!hasUserLocation) return 'Tap locate to scan your area';
    return 'Radar is quiet nearby';
  }, [visibleBroadcasts, visibleRiderMarkers]);

  return (
    <div
      className="fixed left-0 right-0 top-0 overflow-hidden bg-background"
      style={{ height: 'var(--rr-viewport-height, 100dvh)' }}
    >
      {/* Full-screen map */}
      <div className="absolute inset-0 z-0">
        <LiveMap
          broadcasts={filteredBroadcasts}
          presenceMarkers={visibleRiderMarkers}
          getProfile={getProfile}
          userLat={userLoc.lat}
          userLng={userLoc.lng}
          userAccuracyMeters={userLoc.accuracyMeters}
          isLoading={isLoadingBroadcasts && !usingOfflineSnapshot}
          variant="radar"
          className="h-full w-full"
          fitKey={hasUserLocation ? 'self' : 'default'}
          focusUserLocation={hasUserLocation}
          showSelfLocation={hasUserLocation}
          offlineMode={usingOfflineSnapshot}
          offlineSnapshotAt={offlineSnapshot?.cachedAt}
          isLiveMapVisible={isLiveMapVisible}
          resizeKey={radarViewport.version}
        />
      </div>

      <RadarOverlay
        activeCount={activeCount}
        hasUserLocation={hasUserLocation}
        usingOfflineSnapshot={usingOfflineSnapshot}
        geoError={geoError}
        isLiveMapVisible={isLiveMapVisible}
        sheetOpen={sheetOpen}
      />

      <RadarBottomSheet
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        sheetRef={sheetRef}
        sheetContentRef={sheetContentRef}
        pullOffset={pullOffset}
        sheetTouchHandlers={sheetTouchHandlers}
        contentTouchHandlers={contentTouchHandlers}
        filter={filter}
        setFilter={(v) => startTransition(() => setFilter(v))}
        sortBy={sortBy}
        setSortBy={(v) => startTransition(() => setSortBy(v))}
        isPending={isPending}
        broadcasts={filteredBroadcasts}
        allBroadcasts={visibleBroadcasts}
        getProfile={getProfile}
        userLat={effectiveLoc.lat}
        userLng={effectiveLoc.lng}
        isLoading={isLoadingBroadcasts}
        activeCount={activeCount}
        peekLabel={peekLabel}
        totalCount={visibleBroadcasts.length}
        hasUserLocation={hasUserLocation}
        liveRiders={visibleRiderMarkers}
      />
    </div>
  );
}

export default memo(BroadcastFeedPage);
