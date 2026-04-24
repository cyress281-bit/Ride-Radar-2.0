import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { MessageCircle, Clock } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';

export default function Messages() {
  const { data: profile } = useMyProfile();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Conversation.filter({ participantIds: profile.id }, '-lastMessageAt', 100),
    refetchInterval: 20000,
  });

  const otherIds = Array.from(new Set(conversations.flatMap(c => c.participantIds).filter(id => id !== profile?.id)));

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles', otherIds],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const res = await Promise.allSettled(otherIds.map(id => base44.entities.UserProfile.get(id)));
      return res.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    },
  });

  const getOther = (c) => {
    const otherId = c.participantIds.find((id) => id !== profile?.id);
    return profiles.find((p) => p.id === otherId);
  };

  const active = conversations.filter((c) => c.status === 'active');
  const archived = conversations.filter((c) => c.status === 'archived');

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Messages</h1>
      <p className="text-sm text-muted-foreground mb-6">Active threads and conversations</p>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary/50 animate-pulse border border-border/50" />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-secondary/20 mt-8">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-5 border border-border/50">
            <MessageCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">No conversations yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">Connect on a broadcast or add a friend to start chatting.</p>
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
                'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300',
                archived ? 'bg-secondary/20 border-border/30 opacity-70 hover:opacity-100' : 'bg-card border-border/50 hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.1)]'
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