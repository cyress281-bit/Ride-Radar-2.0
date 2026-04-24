import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Users, MessageCircle, Calendar, AlertTriangle, Check, X, Radio, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';

const iconByType = {
  connection_request: Users,
  connection_accepted: Check,
  new_message: MessageCircle,
  rsvp: Calendar,
  event_reminder: Calendar,
  broadcast_expired: Radio,
  thread_expired: MessageCircle,
  friend_request: Users,
  friend_accepted: Check,
  alert: AlertTriangle,
  announcement: Megaphone,
};

export default function Notifications() {
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Notification.filter({ userId: profile.id }, '-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pendingRequests', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.ConnectionRequest.filter({ toUserId: profile.id, status: 'pending' }),
  });

  const { data: pendingFriends = [] } = useQuery({
    queryKey: ['pendingFriends', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Friendship.filter({ userBId: profile.id, status: 'pending' }),
  });

  const userIds = Array.from(new Set([
    ...pendingRequests.map(r => r.fromUserId),
    ...pendingFriends.map(f => f.userAId)
  ]));

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-notif', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const res = await Promise.allSettled(userIds.map(id => base44.entities.UserProfile.get(id)));
      return res.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    },
  });

  const acceptConn = useMutation({
    mutationFn: async (req) => {
      await base44.entities.ConnectionRequest.update(req.id, { status: 'accepted' });
      let convos = await base44.entities.Conversation.filter({ connectionRequestId: req.id });
      let convo = convos[0];
      if (!convo) {
        convo = await base44.entities.Conversation.create({
          type: 'connection',
          connectionRequestId: req.id,
          participantIds: [req.fromUserId, req.toUserId],
          status: 'active',
          lastMessageAt: new Date().toISOString(),
          threadExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        });
      }
      await base44.functions.invoke('sendNotification', {
        targetProfileId: req.fromUserId,
        type: 'connection_accepted',
        title: 'Connection accepted',
        body: `@${profile.username} accepted your request. Thread active 72h.`,
        relatedEntityId: convo.id,
        relatedEntityType: 'Conversation',
      });
      return convo.id;
    },
    onSuccess: (convoId) => {
      qc.invalidateQueries({ queryKey: ['pendingRequests'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
  });

  const declineConn = useMutation({
    mutationFn: async (req) => await base44.entities.ConnectionRequest.update(req.id, { status: 'declined' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingRequests'] }),
  });

  const acceptFriend = useMutation({
    mutationFn: async (f) => {
      await base44.entities.Friendship.update(f.id, { status: 'active' });
      let convos = await base44.entities.Conversation.filter({ friendshipId: f.id });
      if (!convos[0]) {
        await base44.entities.Conversation.create({
          type: 'friendship',
          friendshipId: f.id,
          participantIds: [f.userAId, f.userBId],
          status: 'active',
          lastMessageAt: new Date().toISOString(),
        });
      }
      await base44.functions.invoke('sendNotification', {
        targetProfileId: f.userAId,
        type: 'friend_accepted',
        title: 'Friend request accepted',
        body: `@${profile.username} accepted your friend request`,
        relatedEntityId: profile.id,
        relatedEntityType: 'UserProfile',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pendingFriends'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const declineFriend = useMutation({
    mutationFn: async (f) => await base44.entities.Friendship.delete(f.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingFriends'] }),
  });

  const getProfile = (id) => allProfiles.find((p) => p.id === id);

  const hasAnything = pendingRequests.length + pendingFriends.length + notifications.length > 0;

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Notifications</h1>
      <p className="text-sm text-muted-foreground mb-6">Requests and updates</p>

      {!hasAnything && (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-secondary/20 mt-8">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-5 border border-border/50">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">All caught up</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">You'll see requests and updates here.</p>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <Section title="Connection requests">
          {pendingRequests.map((r) => {
            const from = getProfile(r.fromUserId);
            return (
              <div key={r.id} className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  {from?.avatar ? <img src={from.avatar} className="w-9 h-9 rounded-full object-cover" alt="" /> :
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold">{from?.displayName?.[0] || '?'}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{from?.displayName}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(r.created_date)}</div>
                  </div>
                </div>
                {r.message && <p className="text-sm text-muted-foreground mb-3 pl-12">"{r.message}"</p>}
                <div className="flex gap-2 pl-12">
                  <Button size="sm" onClick={() => acceptConn.mutate(r)} disabled={acceptConn.isPending} className="rounded-full">
                    <Check className="w-3.5 h-3.5 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => declineConn.mutate(r)} className="rounded-full">
                    <X className="w-3.5 h-3.5 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {pendingFriends.length > 0 && (
        <Section title="Friend requests">
          {pendingFriends.map((f) => {
            const from = getProfile(f.userAId);
            return (
              <div key={f.id} className="p-5 rounded-2xl bg-card border border-border/60 flex items-center gap-4 hover:border-primary/30 transition-colors shadow-sm">
                {from?.avatar ? <img src={from.avatar} className="w-9 h-9 rounded-full object-cover" alt="" /> :
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold">{from?.displayName?.[0] || '?'}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{from?.displayName}</div>
                </div>
                <Button size="sm" onClick={() => acceptFriend.mutate(f)} className="rounded-full">Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => declineFriend.mutate(f)} className="rounded-full">Decline</Button>
              </div>
            );
          })}
        </Section>
      )}

      {notifications.length > 0 && (
        <Section title="Activity">
          {notifications.map((n) => {
            const Icon = iconByType[n.type] || Bell;
            const href =
              n.relatedEntityType === 'Conversation' ? `/messages/${n.relatedEntityId}` :
              n.relatedEntityType === 'Broadcast' ? `/broadcast/${n.relatedEntityId}` :
              n.relatedEntityType === 'UserProfile' ? `/profile/${n.relatedEntityId}` : null;
            const content = (
              <div 
                className={cn('p-3 rounded-xl flex items-start gap-3 transition', n.isRead ? 'bg-card/50' : 'bg-card border border-border/60 cursor-pointer')}
                onClick={() => { if (!n.isRead) base44.entities.Notification.update(n.id, { isRead: true }) }}
              >
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  {n.body && <div className="text-sm text-muted-foreground line-clamp-2">{n.body}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_date)}</div>
                </div>
              </div>
            );
            return href ? <Link key={n.id} to={href}>{content}</Link> : <div key={n.id}>{content}</div>;
          })}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}