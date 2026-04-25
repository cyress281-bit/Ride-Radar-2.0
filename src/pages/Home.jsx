import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import { rankBroadcasts, isExpired, haversineMiles } from '@/lib/broadcastUtils';
import { Radio, CalendarClock, Search } from 'lucide-react';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { listProfilesByIds } from '@/lib/profileLookup';
import FeedControls from '@/components/home/FeedControls';
import RadarMapView from '@/components/home/RadarMapView';
import UserLiveStatus from '@/components/home/UserLiveStatus';
import AlertPriorityStatus from '@/components/home/AlertPriorityStatus';
import RRLogo from '@/components/RRLogo';
import { useMyProfile } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

export default function Home() {
  const [userLoc, setUserLoc] = useState({ lat: null, lng: null });
  const [feedFilter, setFeedFilter] = useState('all');
  const [feedSort, setFeedSort] = useState('priority');
  const [viewMode, setViewMode] = useState('feed');
  const { data: profile } = useMyProfile();

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.UserBlock.filter({ blockerProfileId: profile.id }),
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { maximumAge: 300000, timeout: 5000 }
      );
    }
  }, []);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ['broadcasts', 'feed'],
    queryFn: async () => {
      const list = await base44.entities.Broadcast.filter({ status: 'active' }, '-created_date', 100);
      return list.filter((b) => !isExpired(b));
    },
    refetchInterval: 30000,
  });

  const authorIds = Array.from(new Set(broadcasts.map(b => b.authorId)));

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-feed', authorIds],
    enabled: authorIds.length > 0,
    queryFn: async () => await listProfilesByIds(authorIds),
  });

  const blockedIds = new Set(blocks.map((block) => block.blockedProfileId));
  const visibleBroadcastsBase = broadcasts.filter((broadcast) => !blockedIds.has(broadcast.authorId));
  const ranked = rankBroadcasts(visibleBroadcastsBase, userLoc.lat, userLoc.lng);
  const alertCount = ranked.filter((b) => b.type === 'alert').length;
  const eventCount = ranked.filter((b) => b.type === 'event').length;
  const nearbyRiderCount = ranked.filter((b) => b.type === 'solo_ride').length;
  const isoCount = ranked.filter((b) => b.type === 'iso').length;

  const filteredBroadcasts = visibleBroadcastsBase.filter((broadcast) => feedFilter === 'all' || broadcast.type === feedFilter);
  const priorityFeed = rankBroadcasts(filteredBroadcasts, userLoc.lat, userLoc.lng);
  const visibleFeed = [...priorityFeed].sort((a, b) => {
    if (feedSort === 'newest') return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    if (feedSort === 'nearest' && userLoc.lat != null) {
      const distanceA = (a.type === 'solo_ride' || a.type === 'iso') && a.frozenLat != null ? haversineMiles(userLoc.lat, userLoc.lng, a.frozenLat, a.frozenLng) : Number.POSITIVE_INFINITY;
      const distanceB = (b.type === 'solo_ride' || b.type === 'iso') && b.frozenLat != null ? haversineMiles(userLoc.lat, userLoc.lng, b.frozenLat, b.frozenLng) : Number.POSITIVE_INFINITY;
      return distanceA - distanceB || new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    }
    return 0;
  });

  const myLiveBroadcast = ranked.find((b) => b.type === 'solo_ride' && b.authorId === profile?.id);

  const getAuthor = (id) => profiles.find((p) => p.id === id);

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
            onClick={() => setViewMode('feed')}
            className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors', viewMode === 'feed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            Feed
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors', viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
          >
            Map
          </button>
        </div>
      </div>

      {viewMode === 'feed' && <FeedControls activeFilter={feedFilter} onFilterChange={setFeedFilter} sort={feedSort} onSortChange={setFeedSort} />}

      {viewMode === 'map' ? (
        <RadarMapView broadcasts={ranked} />
      ) : isLoading ? (
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
      ) : (
        <div className="space-y-2.5 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary/45 before:via-border before:to-transparent before:pointer-events-none">
          {visibleFeed.map((b) => (
            <div key={b.id} className="relative pl-4">
              <span className="absolute left-[21px] top-6 z-10 h-2.5 w-2.5 rounded-full bg-background border border-primary/60 shadow-[0_0_14px_hsl(var(--primary)/0.45)]" />
              <BroadcastCard broadcast={b} author={getAuthor(b.authorId)} userLat={userLoc.lat} userLng={userLoc.lng} prominentSoloAvatar />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SignalStat({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap">
      <Icon className="h-3 w-3 shrink-0 rounded-sm text-primary/50" />
      <span className="truncate uppercase tracking-[0.1em] text-muted-foreground/75">{label}</span>
      <span className="font-display text-sm font-extrabold tracking-[-0.03em] text-foreground/85">{value}</span>
    </div>
  );
}