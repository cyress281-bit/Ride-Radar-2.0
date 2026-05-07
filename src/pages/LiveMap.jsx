import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, LocateFixed, Radio, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNearbyBroadcasts } from '@/hooks/useNearbyBroadcasts';
import { useLiveMapPresence } from '@/hooks/useLiveMapPresence';
import { useBlockedProfiles } from '@/hooks/useBlockedProfiles';
import { useProfileBatch } from '@/hooks/useProfileBatch';
import { normalizeBroadcasts } from '@/lib/supabaseNormalizer';
import { rankBroadcasts } from '@/lib/broadcastUtils';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
const LiveMapSurface = lazy(() => import('@/components/map/LiveMapSurface.lazy.jsx'));

const FILTERS = [
  { key: 'all', label: 'All', Icon: Radio },
  { key: 'alert', label: 'Alerts', Icon: ShieldAlert },
  { key: 'solo_ride', label: 'Riders', Icon: LocateFixed },
  { key: 'iso', label: 'ISO', Icon: Search },
  { key: 'event', label: 'Events', Icon: CalendarClock },
];

export default function LiveMap() {
  const [userLoc, setUserLoc] = useState({ lat: null, lng: null });
  const [geoError, setGeoError] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

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
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(false);
      },
      (err) => {
        if (!active) return;
        logger.warn('[LiveMap] Geolocation error:', err.message);
        setGeoError(true);
      },
      { maximumAge: 120000, timeout: 5000, enableHighAccuracy: false }
    );

    return () => {
      active = false;
    };
  }, []);

  // Lazy-load Leaflet CSS when this page mounts so styles are loaded only when needed
  useEffect(() => {
    import('leaflet/dist/leaflet.css').catch((err) => logger.warn('[LiveMap] failed to load leaflet css', err));
  }, []);

  const { data: nearbyBroadcasts = [], isLoading: isLoadingNearby } = useNearbyBroadcasts(
    userLoc.lat,
    userLoc.lng,
    50
  );

  const { data: allBroadcasts = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['broadcasts', 'all', 'live-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      return normalizeBroadcasts(data || []);
    },
    enabled: geoError || (userLoc.lat == null && userLoc.lng == null),
    staleTime: 30000,
  });

  const sourceBroadcasts = userLoc.lat != null ? nearbyBroadcasts : allBroadcasts;
  const isLoading = userLoc.lat != null ? isLoadingNearby : isLoadingAll;
  const { blockedIds } = useBlockedProfiles();
  const {
    markers: riderMarkers,
    isLoading: isLoadingPresence,
  } = useLiveMapPresence(
    { lat: userLoc.lat, lng: userLoc.lng },
    { autoPublish: false, source: 'live-map' }
  );

  const visibleBroadcasts = useMemo(
    () => sourceBroadcasts.filter((broadcast) => !blockedIds.has(broadcast.author_id || broadcast.authorId)),
    [sourceBroadcasts, blockedIds]
  );

  const rankedBroadcasts = useMemo(
    () => rankBroadcasts(visibleBroadcasts, userLoc.lat, userLoc.lng),
    [visibleBroadcasts, userLoc.lat, userLoc.lng]
  );

  const filteredBroadcasts = useMemo(
    () => activeFilter === 'all'
      ? rankedBroadcasts
      : rankedBroadcasts.filter((broadcast) => broadcast.type === activeFilter),
    [rankedBroadcasts, activeFilter]
  );

  const authorIds = useMemo(
    () => rankedBroadcasts.map((broadcast) => broadcast.author_id || broadcast.authorId),
    [rankedBroadcasts]
  );
  const { getProfile } = useProfileBatch(authorIds);

  const counts = useMemo(() => ({
    all: rankedBroadcasts.length,
    alert: rankedBroadcasts.filter((broadcast) => broadcast.type === 'alert').length,
    solo_ride: rankedBroadcasts.filter((broadcast) => broadcast.type === 'solo_ride').length,
    iso: rankedBroadcasts.filter((broadcast) => broadcast.type === 'iso').length,
    event: rankedBroadcasts.filter((broadcast) => broadcast.type === 'event').length,
  }), [rankedBroadcasts]);

  const locationLabel = userLoc.lat != null
    ? 'Nearby broadcasts within 50 miles'
    : geoError
      ? 'Location unavailable, showing active network broadcasts'
      : 'Resolving location, showing active network broadcasts';

  return (
    <div className="px-4 pb-4 pt-5 sm:px-5 lg:px-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="rr-chip mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-green" />
            Live surface
          </div>
          <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Map</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {locationLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] border border-border/65 bg-black/25 p-2 sm:flex">
          {FILTERS.map(({ key, label, Icon }) => {
            const active = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold uppercase tracking-[0.12em] transition sm:min-w-24',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.18)]'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                )}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-black/20' : 'bg-white/[0.06]')}>
                  {counts[key] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {geoError && (
        <div className="mb-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Location disabled:</span> distance-aware nearby sorting is unavailable until location access is enabled.
        </div>
      )}

      <Suspense fallback={<div className="min-h-[320px]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" aria-hidden="true" /></div>}>
        <LiveMapSurface
          broadcasts={filteredBroadcasts}
          presenceMarkers={riderMarkers}
          getProfile={getProfile}
          userLat={userLoc.lat}
          userLng={userLoc.lng}
          isLoading={isLoading || isLoadingPresence}
          variant="full"
        />
      </Suspense>
    </div>
  );
}
