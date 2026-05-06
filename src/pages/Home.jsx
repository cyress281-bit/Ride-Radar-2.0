import { useEffect, useState, useMemo, useCallback, memo, lazy, Suspense, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useNearbyBroadcasts } from '@/hooks/useNearbyBroadcasts';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import { rankBroadcasts, haversineMiles } from '@/lib/broadcastUtils';
import { Radio, CalendarClock, Search } from 'lucide-react';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import FeedControls from '@/components/home/FeedControls';
import { logger } from '@/lib/logger';
import UserLiveStatus from '@/components/home/UserLiveStatus';
import AlertPriorityStatus from '@/components/home/AlertPriorityStatus';
import RRLogo from '@/components/RRLogo';
import { cn } from '@/lib/utils';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { normalizeBroadcasts } from '@/lib/supabaseNormalizer';

// Lazy-load RadarMapView (pulls in Leaflet ~40KB gzipped) — only loaded when user clicks "Map" tab
const RadarMapView = lazy(() => import(/* webpackChunkName: "leaflet-map" */ '@/components/home/RadarMapView'));

export default function Home() {
  const [userLoc, setUserLoc] = useState({ lat: null, lng: null });
  const [geoError, setGeoError] = useState(false);
  const [feedFilter, setFeedFilter] = useState('all');
  const [feedSort, setFeedSort] = useState('priority');
  const [viewMode, setViewMode] = useState('feed');
  const { profile } = useSupabaseAuth();

  // Use shared hooks to eliminate duplication
  const { blockedIds } = useBlockedProfiles();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          logger.warn('[Home] Geolocation error:', err.message);
          setGeoError(true);
        },
        { maximumAge: 300000, timeout: 5000 }
      );
    } else {
      setGeoError(true);
    }
  }, []);

  // Fetch nearby broadcasts using Supabase + PostGIS (with real-time updates!)
  const { data: broadcasts = [], isLoading } = useNearbyBroadcasts(
    userLoc.lat,
    userLoc.lng,
    50 // 50 mile radius
  );

  // CRITICAL FIX: Fallback query for users without GPS (desktop, denied permission, etc.)
  const { data: allBroadcasts = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['broadcasts', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return normalizeBroadcasts(data || []);
    },
    enabled: geoError || (userLoc.lat == null && userLoc.lng == null),
    staleTime: 30000,
  });

  // Use geolocation results if available, otherwise fallback to all broadcasts
  const finalBroadcasts = userLoc.lat != null ? broadcasts : allBroadcasts;
  const finalIsLoading = userLoc.lat != null ? isLoading : isLoadingAll;

  // Use shared profile batch hook (broadcast author IDs from Supabase)
  const authorIds = useMemo(
    () => finalBroadcasts.map(b => b.author_id),
    [finalBroadcasts]
  );
  const { getProfile } = useProfileBatch(authorIds);

  // Memoize filtered broadcasts to prevent recalculation
  const visibleBroadcastsBase = useMemo(
    () => finalBroadcasts.filter((broadcast) => !blockedIds.has(broadcast.author_id)),
    [finalBroadcasts, blockedIds]
  );

  // Memoize ranked broadcasts
  const ranked = useMemo(
    () => rankBroadcasts(visibleBroadcastsBase, userLoc.lat, userLoc.lng),
    [visibleBroadcastsBase, userLoc.lat, userLoc.lng]
  );

  // Memoize counts
  const { alertCount, eventCount, nearbyRiderCount, isoCount } = useMemo(() => ({
    alertCount: ranked.filter((b) => b.type === 'alert').length,
    eventCount: ranked.filter((b) => b.type === 'event').length,
    nearbyRiderCount: ranked.filter((b) => b.type === 'solo_ride').length,
    isoCount: ranked.filter((b) => b.type === 'iso').length,
  }), [ranked]);

  // Memoize final visible feed with sorting
  const visibleFeed = useMemo(() => {
    const filtered = feedFilter === 'all'
      ? ranked
      : ranked.filter((broadcast) => broadcast.type === feedFilter);

    if (feedSort === 'newest') {
      return [...filtered].sort((a, b) =>
        // CRITICAL FIX: Supabase returns created_at (not created_date)
        new Date(b.created_at || b.created_date || 0).getTime() - new Date(a.created_at || a.created_date || 0).getTime()
      );
    }

    if (feedSort === 'nearest' && userLoc.lat != null) {
      return [...filtered].sort((a, b) => {
        // CRITICAL FIX: Use snake_case fields from Supabase
        const distanceA = (a.type === 'solo_ride' || a.type === 'iso') && (a.frozen_lat != null || a.frozenLat != null)
          ? haversineMiles(userLoc.lat, userLoc.lng, a.frozen_lat || a.frozenLat, a.frozen_lng || a.frozenLng)
          : Number.POSITIVE_INFINITY;
        const distanceB = (b.type === 'solo_ride' || b.type === 'iso') && (b.frozen_lat != null || b.frozenLat != null)
          ? haversineMiles(userLoc.lat, userLoc.lng, b.frozen_lat || b.frozenLat, b.frozen_lng || b.frozenLng)
          : Number.POSITIVE_INFINITY;
        return distanceA - distanceB || new Date(b.created_at || b.created_date || 0).getTime() - new Date(a.created_at || a.created_date || 0).getTime();
      });
    }

    return filtered;
  }, [ranked, feedFilter, feedSort, userLoc.lat, userLoc.lng]);

  const myLiveBroadcast = useMemo(
    () => ranked.find((b) => b.type === 'solo_ride' && b.author_id === profile?.user_id),
    [ranked, profile?.user_id]
  );

  // Stable callbacks for view mode toggle buttons - prevents child re-renders
  const handleSetFeedView = useCallback(() => setViewMode('feed'), []);
  const handleSetMapView = useCallback(() => setViewMode('map'), []);

  // Virtual scrolling for broadcast feed - only renders visible cards + overscan.
  // Threshold: virtualize when 20+ broadcasts to avoid overhead on small feeds.
  const feedParentRef = useRef(null);
  const VIRTUAL_FEED_THRESHOLD = 20;
  const shouldVirtualizeFeed = visibleFeed.length >= VIRTUAL_FEED_THRESHOLD;

  const feedVirtualizer = useVirtualizer({
    count: shouldVirtualizeFeed ? visibleFeed.length : 0,
    getScrollElement: () => feedParentRef.current,
    estimateSize: () => 180, // ~180px per broadcast card (varies with content/images)
    overscan: 5,
    getItemKey: (index) => visibleFeed[index]?.id || index,
  });

  return (
    <div className="px-5 pt-5">
      <div className="mb-4 rr-surface-strong rounded-[1.55rem] p-5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-primary/8" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Live network</div>
            <h1 className="rr-heading text-4xl">Radar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {userLoc.lat ? 'Live signals in your area' : 'Live signals'}
            </p>
          </div>
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] border border-primary/20 bg-black/20 p-1 shadow-[0_0_28px_hsl(var(--primary)/0.16),inset_0_1px_0_hsl(0_0%_100%/0.08)]">
            <RRLogo size="fill" glow className="scale-125 rounded-[1rem] object-cover" />
          </div>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
          <UserLiveStatus broadcast={myLiveBroadcast} />
          <AlertPriorityStatus count={alertCount} />
        </div>
        <div className="relative z-10 mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-full border border-border/35 bg-black/15 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.03)]">
          <SignalStat icon={CalendarClock} label="Events" value={eventCount} />
          <span className="mx-1 h-3 w-px bg-border/50" />
          <SignalStat icon={OfficialMotorcycleIcon} label="Nearby Riders" value={nearbyRiderCount} />
          <span className="mx-1 h-3 w-px bg-border/50" />
          <SignalStat icon={Search} label="In Search Of" value={isoCount} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Signal feed</div>
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-black/25 p-1">
          <button
            type="button"
            onClick={handleSetFeedView}
            className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors', viewMode === 'feed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            Feed
          </button>
          <button
            type="button"
            onClick={handleSetMapView}
            className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors', viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            Map
          </button>
        </div>
      </div>

      {viewMode === 'feed' && <FeedControls activeFilter={feedFilter} onFilterChange={setFeedFilter} sort={feedSort} onSortChange={setFeedSort} />}

      {/* GPS fallback notice for desktop users */}
      {geoError && viewMode === 'feed' && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-semibold">Location disabled:</span> Showing all active broadcasts (distance sorting unavailable)
        </div>
      )}

      {viewMode === 'map' ? (
        <Suspense fallback={
          <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-border/45 bg-background/45">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-semibold text-foreground">Loading map...</p>
          </div>
        }>
          <RadarMapView broadcasts={ranked} userLat={userLoc.lat} userLng={userLoc.lng} isLoading={finalIsLoading} />
        </Suspense>
      ) : finalIsLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-secondary/30 backdrop-blur-md animate-pulse border border-border/50" />)}
        </div>
      ) : visibleFeed.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-dashed border-primary/30 bg-card/40 backdrop-blur-xl mt-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse-green pointer-events-none" />
          <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
            <Radio className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2 text-foreground relative z-10">Radar is quiet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10 font-medium">No active broadcasts nearby. Be the first to signal your presence on the network.</p>
        </div>
      ) : shouldVirtualizeFeed ? (
        /* Virtualized broadcast feed for 20+ items - renders only visible cards */
        <div
          ref={feedParentRef}
          className="overflow-auto relative"
          style={{ maxHeight: 'calc(100vh - 20rem)', contain: 'strict' }}
        >
          {/* Timeline decoration (left border line) */}
          <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-primary/45 via-border to-transparent pointer-events-none z-0" />
          <div
            style={{
              height: `${feedVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {feedVirtualizer.getVirtualItems().map((virtualRow) => {
              const b = visibleFeed[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={feedVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="relative pl-4 pb-2.5">
                    <span className="absolute left-[21px] top-6 z-10 h-2.5 w-2.5 rounded-full bg-background border border-primary/60 shadow-[0_0_14px_hsl(var(--primary)/0.45)]" />
                    <BroadcastCard broadcast={b} author={getProfile(b.author_id)} userLat={userLoc.lat} userLng={userLoc.lng} prominentSoloAvatar />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Standard rendering for small feeds (<20 items) */
        <div className="space-y-2.5 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary/45 before:via-border before:to-transparent before:pointer-events-none">
          {visibleFeed.map((b) => (
            <div key={b.id} className="relative pl-4">
              <span className="absolute left-[21px] top-6 z-10 h-2.5 w-2.5 rounded-full bg-background border border-primary/60 shadow-[0_0_14px_hsl(var(--primary)/0.45)]" />
              <BroadcastCard broadcast={b} author={getProfile(b.author_id)} userLat={userLoc.lat} userLng={userLoc.lng} prominentSoloAvatar />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SignalStat = memo(function SignalStat({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3 w-3 shrink-0 rounded-sm text-primary/50" />
      <span className="truncate uppercase tracking-[0.1em] text-muted-foreground/75">{label}</span>
      <span className="font-display text-sm font-extrabold tracking-[-0.03em] text-foreground/85">{value}</span>
    </div>
  );
});