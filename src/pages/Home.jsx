import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import { rankBroadcasts, isExpired } from '@/lib/broadcastUtils';
import { Radio } from 'lucide-react';

export default function Home() {
  const [userLoc, setUserLoc] = useState({ lat: null, lng: null });

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
    queryFn: async () => {
      const res = await Promise.allSettled(authorIds.map(id => base44.entities.UserProfile.get(id)));
      return res.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    },
  });

  const ranked = rankBroadcasts(broadcasts, userLoc.lat, userLoc.lng);

  const getAuthor = (id) => profiles.find((p) => p.id === id);

  return (
    <div className="px-5 pt-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Radar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {userLoc.lat ? 'Live signals in your area' : 'Live signals'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-secondary/30 backdrop-blur-md animate-pulse border border-border/50" />)}
        </div>
      ) : ranked.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-dashed border-primary/30 bg-card/40 backdrop-blur-xl mt-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse-green pointer-events-none" />
          <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
            <Radio className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2 text-foreground relative z-10">Radar is quiet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10 font-medium">No active broadcasts nearby. Be the first to signal your presence on the network.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((b) => (
            <BroadcastCard key={b.id} broadcast={b} author={getAuthor(b.authorId)} userLat={userLoc.lat} userLng={userLoc.lng} />
          ))}
        </div>
      )}
    </div>
  );
}