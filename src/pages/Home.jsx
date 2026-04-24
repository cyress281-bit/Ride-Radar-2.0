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
    queryFn: async () => await Promise.all(authorIds.map(id => base44.entities.UserProfile.get(id))),
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
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : ranked.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-accent mx-auto flex items-center justify-center mb-4">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Radar is quiet</h3>
          <p className="text-sm text-muted-foreground">No active broadcasts nearby. Be the first to signal.</p>
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