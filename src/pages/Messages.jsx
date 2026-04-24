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
    queryFn: async () => {
      const list = await base44.entities.Conversation.list('-lastMessageAt', 100);
      return list.filter((c) => c.participantIds?.includes(profile.id));
    },
    refetchInterval: 20000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    enabled: conversations.length > 0,
    queryFn: async () => await base44.entities.UserProfile.list('-created_date', 500),
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
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-secondary/50 animate-pulse" />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-accent mx-auto flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No conversations yet</h3>
          <p className="text-sm text-muted-foreground">Connect on a broadcast or add a friend to start.</p>
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
                'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                archived ? 'bg-secondary/30 border-border/40 opacity-70' : 'bg-card border-border/60 hover:border-border'
              )}
            >
              {other?.avatar ? (
                <img src={other.avatar} className="w-11 h-11 rounded-full object-cover shrink-0" alt="" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center font-semibold shrink-0">
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