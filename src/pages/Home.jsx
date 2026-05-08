import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronsUp, Filter, LocateFixed, Radio, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNearbyBroadcasts } from '@/hooks/useNearbyBroadcasts';
import { useLiveMapPresence } from '@/hooks/useLiveMapPresence';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import LiveMapSurface from '@/components/map/LiveMapSurface';
import { haversineMiles, rankBroadcasts } from '@/lib/broadcastUtils';
import { normalizeBroadcasts } from '@/lib/supabaseNormalizer';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'solo_ride', label: 'Solo rides' },
  { value: 'event', label: 'Events' },
  { value: 'iso', label: 'ISO' },
  { value: 'alert', label: 'Alerts' },
];

const SORTS = [
  { value: 'priority', label: 'Live / Priority' },
  { value: 'newest', label: 'Newest' },
  { value: 'nearest', label: 'Nearest' },
];

const COLLAPSED_SHEET_HEIGHT = '5.25rem';

function isUnavailableQueryError(error) {
  return error?.code === 'PGRST205' || error?.code === '42P01' || error?.status === 404 || error?.status === 400;
}

function isMissingColumnError(error, column) {
  return (
    error?.code === '42703' ||
    String(error?.message || '').toLowerCase().includes(`${column.toLowerCase()} does not exist`)
  );
}

async function fetchActiveBroadcastsFallback() {
  const baseQuery = () => supabase
    .from('broadcasts')
    .select('*')
    .eq('status', 'active');

  let { data, error } = await baseQuery()
    .order('created_at', { ascending: false })
    .limit(200);

  if (isMissingColumnError(error, 'created_at')) {
    ({ data, error } = await baseQuery()
      .order('created_date', { ascending: false })
      .limit(200));
  }

  if (isMissingColumnError(error, 'created_date')) {
    ({ data, error } = await baseQuery().limit(200));
  }

  if (error) throw error;

  return normalizeBroadcasts(data || []).filter((broadcast) => {
    const expiresAt = broadcast.expires_at || broadcast.expiresAt;
    return !expiresAt || new Date(expiresAt) > new Date();
  });
}

function getBroadcastTime(broadcast) {
  return new Date(broadcast.created_at || broadcast.createdAt || broadcast.created_date || 0).getTime();
}

function getBroadcastDistance(broadcast, userLoc) {
  if (userLoc.lat == null || userLoc.lng == null) return Number.POSITIVE_INFINITY;
  const lat = broadcast.frozen_lat ?? broadcast.frozenLat ?? broadcast.lat;
  const lng = broadcast.frozen_lng ?? broadcast.frozenLng ?? broadcast.lng;
  const distance = haversineMiles(userLoc.lat, userLoc.lng, lat, lng);
  return distance ?? Number.POSITIVE_INFINITY;
}

function sortBroadcasts(broadcasts, sort, userLoc) {
  if (sort === 'newest') {
    return [...broadcasts].sort((a, b) => getBroadcastTime(b) - getBroadcastTime(a));
  }

  if (sort === 'nearest' && userLoc.lat != null) {
    return [...broadcasts].sort((a, b) => getBroadcastDistance(a, userLoc) - getBroadcastDistance(b, userLoc) || getBroadcastTime(b) - getBroadcastTime(a));
  }

  return broadcasts;
}

function getAuthorId(broadcast) {
  return broadcast.author_id || broadcast.authorId;
}

export default function Home() {
  const [userLoc, setUserLoc] = useState({ lat: null, lng: null, accuracyMeters: null });
  const [geoError, setGeoError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('sort');
  const [feedFilter, setFeedFilter] = useState('all');
  const [feedSort, setFeedSort] = useState('priority');
  const feedParentRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (!navigator.geolocation) {
      setGeoError(true);
      return () => {
        active = false;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active) return;
        setUserLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
        setGeoError(false);
      },
      (err) => {
        if (!active) return;
        logger.warn('[Radar] Geolocation error:', err.message);
        setGeoError(true);
      },
      { maximumAge: 120000, timeout: 6000, enableHighAccuracy: false }
    );

    return () => {
      active = false;
    };
  }, []);

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(userLoc.lat, userLoc.lng, 50);

  const { data: allBroadcasts = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['broadcasts', 'all', 'radar'],
    queryFn: async () => {
      const baseQuery = () => supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      let { data, error } = await baseQuery()
        .order('created_at', { ascending: false })
        .limit(200);

      if (isMissingColumnError(error, 'created_at')) {
        ({ data, error } = await baseQuery()
          .order('created_date', { ascending: false })
          .limit(200));
      }

      if (isMissingColumnError(error, 'created_date')) {
        ({ data, error } = await baseQuery().limit(200));
      }

      if (error) {
        logger.warn('[Radar] Active broadcasts query failed:', error);
        if (isUnavailableQueryError(error)) return fetchActiveBroadcastsFallback();
        throw error;
      }

      return normalizeBroadcasts(data || []);
    },
    enabled: geoError || (userLoc.lat == null && userLoc.lng == null),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sourceBroadcasts = userLoc.lat != null ? nearbyBroadcasts : allBroadcasts;
  const isLoadingBroadcasts = userLoc.lat != null ? isLoadingNearby : isLoadingAll;
  const { blockedIds } = useBlockedProfiles();

  const { markers: riderMarkers } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng, accuracyMeters: userLoc.accuracyMeters },
    { autoPublish: false, source: 'radar' }
  );

  const visibleBroadcasts = useMemo(
    () => sourceBroadcasts.filter((broadcast) => !blockedIds.has(getAuthorId(broadcast))),
    [sourceBroadcasts, blockedIds]
  );

  const visibleRiderMarkers = useMemo(
    () => riderMarkers.filter((marker) => !blockedIds.has(marker.user_id || marker.userId)),
    [riderMarkers, blockedIds]
  );

  const rankedBroadcasts = useMemo(
    () => rankBroadcasts(visibleBroadcasts, userLoc.lat, userLoc.lng),
    [visibleBroadcasts, userLoc.lat, userLoc.lng]
  );

  const filteredFeed = useMemo(() => {
    const filtered = feedFilter === 'all'
      ? rankedBroadcasts
      : rankedBroadcasts.filter((broadcast) => broadcast.type === feedFilter);

    return sortBroadcasts(filtered, feedSort, userLoc);
  }, [feedFilter, feedSort, rankedBroadcasts, userLoc]);

  const mapBroadcasts = useMemo(() => {
    if (feedFilter === 'all') return rankedBroadcasts;
    return rankedBroadcasts.filter((broadcast) => broadcast.type === feedFilter);
  }, [feedFilter, rankedBroadcasts]);

  const authorIds = useMemo(
    () => rankedBroadcasts.map(getAuthorId).filter(Boolean),
    [rankedBroadcasts]
  );
  const { getProfile } = useProfileBatch(authorIds);

  const counts = useMemo(() => ({
    all: rankedBroadcasts.length,
    solo_ride: rankedBroadcasts.filter((broadcast) => broadcast.type === 'solo_ride').length,
    event: rankedBroadcasts.filter((broadcast) => broadcast.type === 'event').length,
    iso: rankedBroadcasts.filter((broadcast) => broadcast.type === 'iso').length,
    alert: rankedBroadcasts.filter((broadcast) => broadcast.type === 'alert').length,
  }), [rankedBroadcasts]);

  const shouldVirtualize = filteredFeed.length >= 18;
  const feedVirtualizer = useVirtualizer({
    count: shouldVirtualize ? filteredFeed.length : 0,
    getScrollElement: () => feedParentRef.current,
    estimateSize: () => 154,
    overscan: 4,
    getItemKey: (index) => filteredFeed[index]?.id || index,
  });

  const activeFilterLabel = FILTERS.find((item) => item.value === feedFilter)?.label || 'All';
  const activeSortLabel = SORTS.find((item) => item.value === feedSort)?.label || 'Live / Priority';
  const locationLabel = userLoc.lat != null
    ? 'Live signals near you'
    : geoError
      ? 'Location unavailable, showing active network signals'
      : 'Resolving location, syncing active signals';

  return (
    <div className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
      <div className="absolute left-3 right-3 top-3 z-[20] rounded-[20px] bg-black/68 px-3 py-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:left-5 sm:right-auto sm:min-w-[22rem]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="rr-kicker text-muted-foreground">Radar</div>
            <h1 className="font-display text-2xl font-extrabold leading-none">Live Map</h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{locationLabel}</p>
          </div>
          <div className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]">
            {mapBroadcasts.length + visibleRiderMarkers.length}
          </div>
        </div>
        {geoError && (
          <p className="mt-2 rounded-xl bg-primary/5 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Enable location for nearest sorting.
          </p>
        )}
      </div>

      <div className="h-[calc(100svh-3.5rem)] min-h-[560px]">
        <LiveMapSurface
          broadcasts={mapBroadcasts}
          presenceMarkers={visibleRiderMarkers}
          getProfile={getProfile}
          userLat={userLoc.lat}
          userLng={userLoc.lng}
          isLoading={isLoadingBroadcasts}
          variant="radar"
          className="h-full rounded-none border-0 p-0 shadow-none"
          fitKey={feedFilter}
        />
      </div>

      <section
        className={cn(
          'fixed left-0 right-0 top-14 z-[45] flex flex-col rounded-t-[20px] bg-black/90 shadow-[0_-28px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-transform duration-300 ease-out will-change-transform',
          sheetOpen ? 'bottom-0 translate-y-0' : 'bottom-0'
        )}
        style={!sheetOpen ? { transform: `translateY(calc(100% - ${COLLAPSED_SHEET_HEIGHT}))` } : undefined}
        aria-label="Radar broadcast feed"
      >
        <button
          type="button"
          onClick={() => setSheetOpen((value) => !value)}
          className="rr-haptic flex min-h-11 items-center justify-center rounded-t-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={sheetOpen}
        >
          <span className="flex flex-col items-center gap-1">
            <span className="h-1.5 w-11 rounded-full bg-primary/65 shadow-[0_0_14px_hsl(var(--primary)/0.35)]" />
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {sheetOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronsUp className="h-3.5 w-3.5" />}
              {filteredFeed.length} signals
            </span>
          </span>
        </button>

        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-2 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {filteredFeed.length} broadcasts
              </div>
              <div className="max-w-[13rem] truncate text-xs text-muted-foreground">
                {activeFilterLabel} / {activeSortLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="rr-haptic inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-bold text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055),0_12px_28px_rgba(0,0,0,0.28)]"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Open
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 rounded-full bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]">
            <button
              type="button"
              onClick={() => setActivePanel('sort')}
              className={cn('rr-haptic inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.12em] transition', activePanel === 'sort' ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.2)]' : 'text-muted-foreground hover:text-foreground')}
              aria-pressed={activePanel === 'sort'}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort by
            </button>
            <button
              type="button"
              onClick={() => setActivePanel('filter')}
              className={cn('rr-haptic inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.12em] transition', activePanel === 'filter' ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.2)]' : 'text-muted-foreground hover:text-foreground')}
              aria-pressed={activePanel === 'filter'}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scroll-hide">
            {(activePanel === 'sort' ? SORTS : FILTERS).map((item) => {
              const active = activePanel === 'sort' ? feedSort === item.value : feedFilter === item.value;
              const onClick = activePanel === 'sort' ? () => setFeedSort(item.value) : () => setFeedFilter(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={onClick}
                  className={cn(
                    'rr-haptic inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition',
                    active ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.18)]' : 'bg-white/[0.04] text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  {activePanel === 'filter' && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-black/20' : 'bg-white/[0.06]')}>
                      {counts[item.value] || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div ref={feedParentRef} className="rr-rubber-scroll min-h-0 flex-1 overflow-y-auto pr-1 scroll-hide">
            {isLoadingBroadcasts ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-32 animate-pulse rounded-[20px] bg-white/[0.04] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),0_12px_32px_rgba(0,0,0,0.24)]" />
                ))}
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="rr-surface flex min-h-52 flex-col items-center justify-center rounded-[20px] p-8 text-center">
                <Radio className="mb-3 h-8 w-8 text-primary" />
                <h2 className="font-display text-xl font-bold">Radar is quiet</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">No active broadcasts match this filter yet.</p>
              </div>
            ) : shouldVirtualize ? (
              <div style={{ height: `${feedVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                {feedVirtualizer.getVirtualItems().map((virtualRow) => {
                  const broadcast = filteredFeed[virtualRow.index];
                  const authorId = getAuthorId(broadcast);
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={feedVirtualizer.measureElement}
                      className="pb-3"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <BroadcastCard broadcast={broadcast} author={getProfile(authorId)} userLat={userLoc.lat} userLng={userLoc.lng} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeed.map((broadcast) => {
                  const authorId = getAuthorId(broadcast);
                  return (
                    <BroadcastCard key={broadcast.id} broadcast={broadcast} author={getProfile(authorId)} userLat={userLoc.lat} userLng={userLoc.lng} />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
