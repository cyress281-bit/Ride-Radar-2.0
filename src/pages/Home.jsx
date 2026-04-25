import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import { rankBroadcasts, isExpired } from '@/lib/broadcastUtils';
import { Radio, Activity, Gauge, Satellite, Zap } from 'lucide-react';
import { listProfilesByIds } from '@/lib/profileLookup';

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
    queryFn: async () => await listProfilesByIds(authorIds),
  });

  const ranked = rankBroadcasts(broadcasts, userLoc.lat, userLoc.lng);
  const alertCount = ranked.filter((b) => b.type === 'alert').length;
  const rideCount = ranked.filter((b) => b.type === 'solo_ride' || b.type === 'iso').length;

  const getAuthor = (id) => profiles.find((p) => p.id === id);

  return (
    <div className="px-5 pt-5">
      <div className="mb-4 rr-surface-strong rounded-[1.55rem] p-5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-primary/15" />
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-primary/20" />
        <div className="absolute right-8 top-8 h-2 w-2 rounded-full bg-primary glow-green-sm" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        <div className="absolute left-8 bottom-7 h-[18px] w-28 opacity-45">
          <div className="h-px w-full bg-primary/35" />
          <div className="ml-6 -mt-[1px] h-3 w-5 border-l border-t border-primary/45 skew-x-[-25deg]" />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Live network</div>
            <h1 className="rr-heading text-4xl">Radar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {userLoc.lat ? 'Live signals in your area' : 'Live signals'}
            </p>
          </div>
          <div className="relative h-14 w-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_30px_hsl(var(--primary)/0.18)] overflow-hidden">
            <span className="absolute inset-2 rounded-full border border-primary/15 animate-pulse" />
            <span className="absolute -left-4 top-7 h-px w-16 -rotate-45 bg-primary/30" />
            <Satellite className="relative z-10 w-6 h-6 drop-shadow-[0_0_6px_currentColor]" strokeWidth={2.35} />
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
          <SignalStat icon={Activity} label="Signals" value={ranked.length} />
          <SignalStat icon={Gauge} label="Riders" value={rideCount} />
          <SignalStat icon={Zap} label="Alerts" value={alertCount} alert={alertCount > 0} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Signal feed</div>
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
        <div className="space-y-2.5 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary/45 before:via-border before:to-transparent before:pointer-events-none">
          {ranked.map((b) => (
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

function SignalStat({ icon: Icon, label, value, alert }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-black/30 px-3 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] relative overflow-hidden">
      <span className={alert ? 'absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-alert animate-pulse' : 'absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary/70'} />
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        <span className={alert ? 'h-5 w-5 rounded-lg border border-alert/30 bg-alert/10 flex items-center justify-center text-alert' : 'h-5 w-5 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center text-primary'}>
          <Icon className="w-3.5 h-3.5 drop-shadow-[0_0_4px_currentColor]" />
        </span>
        {label}
      </div>
      <div className={alert ? 'font-display text-2xl font-extrabold text-alert' : 'font-display text-2xl font-extrabold text-foreground'}>{value}</div>
    </div>
  );
}