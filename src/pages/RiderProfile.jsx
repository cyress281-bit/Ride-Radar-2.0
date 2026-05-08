import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bike, UserPlus, MessageCircle, Clock } from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import OptimizedImage from '@/components/OptimizedImage';
import { getProfileByIdSafe, isValidUuid } from '@/lib/profileLookup';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { normalizeProfile } from '@/lib/supabaseNormalizer';

// Limited rider profile preview
export default function RiderProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSupabaseAuth();
  const hasValidUserId = isValidUuid(userId);
  const isMeRoute = user?.id === userId;

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', user?.id, userId],
    enabled: !!user && hasValidUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', userId);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: friendship } = useQuery({
    queryKey: ['friendship', user?.id, userId],
    enabled: !!user && hasValidUserId && !isMeRoute,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${userId}),and(user_a_id.eq.${userId},user_b_id.eq.${user.id})`)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const canQueryPrivateProfile = isMeRoute || friendship?.status === 'active';

  const { data: profile, isLoading: isProfileLoading, isError: isProfileError } = useQuery({
    queryKey: ['profile', userId, canQueryPrivateProfile ? 'private' : 'public'],
    enabled: hasValidUserId,
    queryFn: async () => await getProfileByIdSafe(userId, { publicOnly: !canQueryPrivateProfile }),
    staleTime: 5 * 60 * 1000,
  });

  const sendFriendReq = useMutation({
    mutationFn: async () => {
      // Insert with conflict handling: if a friendship already exists between
      // these two users (in either direction), this is a no-op.
      // The .or() query above already fetches existing friendships for display,
      // but we still need to handle the race between two users sending requests
      // simultaneously.
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_a_id: user.id,
          user_b_id: userId,
          status: 'pending',
        });

      // Ignore unique constraint violations (duplicate friend request)
      // Postgres error code 23505 = unique_violation
      if (error && error.code !== '23505') {
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friendship'] }),
  });

  const openFriendChat = useMutation({
    mutationFn: async () => {
      // Atomic get-or-create: eliminates TOCTOU race condition
      // Even with concurrent calls from both users, only one conversation is created
      const conversation = await getOrCreateConversation({
        participantIds: [user.id, userId],
        type: 'friend',
      });

      return conversation.id;
    },
    onSuccess: (convoId) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
  });

  if (!hasValidUserId) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Invalid rider link.</div>
      </div>
    );
  }

  if (isProfileLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  if (isProfileError || !profile) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Rider profile not found or private.</div>
      </div>
    );
  }

  const normalizedProfile = normalizeProfile(profile);
  const isMe = isMeRoute;
  const isFriend = friendship?.status === 'active';
  const isPending = friendship?.status === 'pending';
  const isBlocked = blocks.length > 0;
  const canSeeDetails = !isBlocked && (isMe || isFriend || profile.is_public !== false);

  return (
    <div className="px-5 pt-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-4 mb-5">
        {canSeeDetails && profile.avatar_url ? (
          <OptimizedImage
            src={profile.avatar_url}
            alt=""
            containerClassName="w-20 h-20 rounded-2xl"
            className="rounded-2xl"
            objectFit="cover"
            loading="eager"
            fetchPriority="high"
            fadeInDuration={200}
            showSkeleton
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground">
            {canSeeDetails ? (profile.display_name?.[0] || '?') : '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight truncate">{canSeeDetails ? profile.display_name : 'Private Rider'}</h1>
        </div>
      </div>

      {canSeeDetails ? (
        <>
          {profile.bio && <p className="text-[15px] mb-4 leading-relaxed">{profile.bio}</p>}

          {normalizedProfile?.bike && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-border/70 bg-secondary/30 text-sm">
              {profile.bike_photo_url && (
                <OptimizedImage
                  src={profile.bike_photo_url}
                  alt="Bike"
                  containerClassName="h-32 w-full"
                  objectFit="cover"
                  loading="lazy"
                  showSkeleton
                />
              )}
              <div className="flex items-center gap-2 p-3">
                <Bike className="w-4 h-4 text-primary" />
                <span>{normalizedProfile.bike}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 bg-secondary/30 rounded-xl text-center text-sm text-muted-foreground my-6">
          This profile is private. Add them as a friend to see more details.
        </div>
      )}

      {!isMe && (
        <div className="mb-4">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}

      {!isMe && !isBlocked && (
        <div className="mb-6">
          {isFriend ? (
            <Button onClick={() => openFriendChat.mutate()} className="w-full h-11 rounded-full" disabled={openFriendChat.isPending}>
              <MessageCircle className="w-4 h-4 mr-1.5" /> Message
            </Button>
          ) : isPending ? (
            <Button variant="outline" disabled className="w-full h-11 rounded-full">
              <Clock className="w-4 h-4 mr-1.5" /> Friend request {friendship.user_a_id === user?.id ? 'sent' : 'pending'}
            </Button>
          ) : (
            <Button onClick={() => sendFriendReq.mutate()} disabled={sendFriendReq.isPending} className="w-full h-11 rounded-full">
              <UserPlus className="w-4 h-4 mr-1.5" /> Send friend request
            </Button>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center py-4 border-t border-border/60">
        {isBlocked ? 'You have blocked this rider.' : 'Limited rider preview. More details visible after connecting.'}
      </div>
    </div>
  );
}
