import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { MessageCircle, Clock, Radio } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';
import { listProfilesByIds } from '@/lib/profileLookup';

export default function Messages() {
  const { data: profile, isError: profileError, error: profileLoadError } = useMyProfile();

  const { data: conversations = [], isLoading, isError, error } = useQuery({
    queryKey: ['conversations', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Conversation.filter({ participantIds: profile.id }, '-lastMessageAt', 100),
    refetchInterval: 20000,
  });

  const otherIds = Array.from(new Set(conversations.flatMap(c => c.participantIds).filter(id => id !== profile?.id)));

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles', otherIds],
    enabled: otherIds.length > 0,
    queryFn: async () => await listProfilesByIds(otherIds),
  });

  const getOther = (c) => {
    const otherId = c.participantIds.find((id) => id !== profile?.id);
    return profiles.find((p) => p.id === otherId);
  };

  const active = conversations.filter((c) => c.status === 'active');
  const archived = conversations.filter((c) => c.status === 'archived');

  const loadError = profileError ? profileLoadError : isError ? error : null;

  return (
    <div className="px-5 pt-5">
      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Rider comms</div>
          <h1 className="rr-heading text-4xl mb-1">Messages</h1>
          <p className="text-sm text-muted-foreground">Active rider threads and 72-hour signals</p>
        </div>
      </div>

      {loadError ? (
        <div className="text-center py-16 rounded-3xl border border-destructive/30 bg-card/40 backdrop-blur-xl mt-8">
          <h3 className="font-display font-bold text-xl mb-2">Messages failed to load</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{loadError.message || 'Please refresh and try again.'}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary/30 backdrop-blur-md animate-pulse border border-border/50" />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-primary/25 bg-card/40 backdrop-blur-xl mt-4 shadow-2xl relative overflow-hidden rr-scanline">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-10 right-10 top-16 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-5 border border-primary/30 shadow-[0_0_22px_hsl(var(--primary)/0.16)] overflow-hidden">
            <span className="absolute inset-3 rounded-full border border-primary/15 animate-pulse" />
            <MessageCircle className="w-7 h-7 text-primary drop-shadow-[0_0_5px_currentColor]" />
            <Radio className="absolute right-2 bottom-2 w-3.5 h-3.5 text-primary/70" />
          </div>
          <div className="rr-kicker mb-2 relative z-10">No open comms</div>
          <h3 className="font-display font-bold text-xl mb-2 relative z-10">Channel is clear</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto relative z-10 font-medium">Connect on a broadcast or add a rider to open a 72-hour signal thread.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <Section title="Active" items={active} getOther={getOther} />
          )}
          {archived.length > 0 && (
            <Section title="Archived" items={archived} getOther={getOther} archived />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, getOther, archived }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
      <div className="space-y-2">
        {items.map((c) => {
          const other = getOther(c);
          return (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className={cn(
                'flex items-center gap-4 p-4 rounded-[1.35rem] border transition-all duration-300',
                archived ? 'bg-secondary/15 border-border/30 opacity-70 hover:opacity-100' : 'rr-surface hover:border-primary/35 hover:shadow-[0_18px_55px_-22px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5'
              )}
            >
              {other?.avatar ? (
                <img src={other.avatar} className="w-12 h-12 rounded-full object-cover shrink-0 border border-border/50" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-lg text-foreground shrink-0 border border-border/50">
                  {other?.displayName?.[0] || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{other?.displayName || 'Rider'}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.type === 'connection' ? 'Connection thread' : 'Friend'}
                  {c.lastMessageAt && ` · ${timeAgo(c.lastMessageAt)}`}
                </div>
              </div>
              {c.type === 'connection' && c.threadExpiresAt && c.status === 'active' && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  72h
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}