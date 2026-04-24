import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bike, UserPlus, MessageCircle, Check, Clock } from 'lucide-react';

// Limited rider profile preview
export default function RiderProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMyProfile();

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => await base44.entities.UserProfile.get(userId),
  });

  const { data: friendship } = useQuery({
    queryKey: ['friendship', me?.id, userId],
    enabled: !!me && !!profile,
    queryFn: async () => {
      const [list1, list2] = await Promise.all([
        base44.entities.Friendship.filter({ userAId: me.id, userBId: userId }),
        base44.entities.Friendship.filter({ userAId: userId, userBId: me.id })
      ]);
      return list1[0] || list2[0] || null;
    },
  });

  const sendFriendReq = useMutation({
    mutationFn: async () => {
      await base44.entities.Friendship.create({ userAId: me.id, userBId: userId, status: 'pending' });
      await base44.entities.Notification.create({
        userId,
        type: 'friend_request',
        title: 'New friend request',
        body: `@${me.username} wants to connect`,
        relatedEntityId: me.id,
        relatedEntityType: 'UserProfile',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friendship'] }),
  });

  const openFriendChat = useMutation({
    mutationFn: async () => {
      const convos = await base44.entities.Conversation.filter({ type: 'friendship', friendshipId: friendship.id });
      let c = convos[0];
      if (!c) {
        c = await base44.entities.Conversation.create({
          type: 'friendship',
          friendshipId: friendship.id,
          participantIds: [me.id, userId],
          status: 'active',
          lastMessageAt: new Date().toISOString(),
        });
      }
      navigate(`/messages/${c.id}`);
    },
  });

  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const isMe = me?.id === profile.id;
  const isFriend = friendship?.status === 'active';
  const isPending = friendship?.status === 'pending';

  return (
    <div className="px-5 pt-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-4 mb-5">
        {profile.avatar ? (
          <img src={profile.avatar} className="w-20 h-20 rounded-2xl object-cover" alt="" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground">
            {profile.displayName?.[0] || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight truncate">{profile.displayName}</h1>
          <div className="text-sm text-muted-foreground">@{profile.username}</div>
          {profile.location && <div className="text-xs text-muted-foreground mt-1">{profile.location}</div>}
        </div>
      </div>

      {profile.bio && <p className="text-[15px] mb-4 leading-relaxed">{profile.bio}</p>}

      {profile.bike && (
        <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-secondary/50 text-sm">
          <Bike className="w-4 h-4 text-muted-foreground" />
          <span>{profile.bike}</span>
          {profile.rideStyle && <span className="ml-auto text-xs text-muted-foreground capitalize">{profile.rideStyle}</span>}
        </div>
      )}

      {!isMe && (
        <div className="mb-6">
          {isFriend ? (
            <Button onClick={() => openFriendChat.mutate()} className="w-full h-11 rounded-full" disabled={openFriendChat.isPending}>
              <MessageCircle className="w-4 h-4 mr-1.5" /> Message
            </Button>
          ) : isPending ? (
            <Button variant="outline" disabled className="w-full h-11 rounded-full">
              <Clock className="w-4 h-4 mr-1.5" /> Friend request {friendship.userAId === me?.id ? 'sent' : 'pending'}
            </Button>
          ) : (
            <Button onClick={() => sendFriendReq.mutate()} disabled={sendFriendReq.isPending} className="w-full h-11 rounded-full">
              <UserPlus className="w-4 h-4 mr-1.5" /> Send friend request
            </Button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center py-4 border-t border-border/60">
        Limited rider preview. More details visible after connecting.
      </div>
    </div>
  );
}