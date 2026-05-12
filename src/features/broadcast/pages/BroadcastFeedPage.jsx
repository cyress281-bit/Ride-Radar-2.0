import { useEffect, useMemo, useState, useTransition, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNearbyBroadcasts } from '@/features/broadcast/hooks/use-nearby-broadcasts.js';
import { useLiveMapPresence } from '@/features/map/hooks/use-live-map.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useOnlineStatus } from '@/hooks/use-online-status.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useRadarLocation } from '@/features/broadcast/hooks/use-radar-location.js';
import { useBottomSheet } from '@/features/broadcast/hooks/use-bottom-sheet.js';
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
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const isOnline = useOnlineStatus();

  const { userLoc, hasUserLocation, geoError, locating, requestLocation, effectiveLoc } = useRadarLocation();
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

  // Cache offline snapshot
  useEffect(() => {
    if (!isOnline || !hasUserLocation || isLoadingBroadcasts) return;
    if (visibleBroadcasts.length === 0 && visibleRiderMarkers.length === 0) return;
    cacheRadarOfflineSnapshot({ broadcasts: visibleBroadcasts, riderMarkers: visibleRiderMarkers });
    setOfflineSnapshot(readRadarOfflineSnapshot());
  }, [hasUserLocation, isLoadingBroadcasts, isOnline, visibleBroadcasts, visibleRiderMarkers]);

  const activeCount = filteredBroadcasts.length;

  return (
    <div className="fixed inset-0 bg-background">
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

      <RadarOverlay
        activeCount={activeCount}
        hasUserLocation={hasUserLocation}
        usingOfflineSnapshot={usingOfflineSnapshot}
        requestLocation={requestLocation}
        locating={locating}
        geoError={geoError}
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
        getProfile={getProfile}
        userLat={effectiveLoc.lat}
        userLng={effectiveLoc.lng}
        isLoading={isLoadingBroadcasts}
        activeCount={activeCount}
      />
    </div>
  );
}

export default memo(BroadcastFeedPage);
