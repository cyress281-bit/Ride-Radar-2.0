import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bike, UserPlus, MessageCircle, Clock, ShieldCheck, Radio } from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import OptimizedImage from '@/components/OptimizedImage';
import { getProfileByIdSafe, isValidUuid } from '@/lib/profileLookup';
import { getOrCreateConversation } from '@/lib/conversationUtils';



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

  const bikeLabel = profile?.bike_make || profile?.bike_model
    ? `${profile?.bike_year || ''} ${profile?.bike_make || ''} ${profile?.bike_model || ''}`.trim()
    : null;
  const isMe = isMeRoute;
  const isFriend = friendship?.status === 'active';
  const isPending = friendship?.status === 'pending';
  const isBlocked = blocks.length > 0;
  const canSeeDetails = !isBlocked && (isMe || isFriend || profile.is_public !== false);

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Identity Card */}
      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative z-10 flex items-start gap-4">
          {canSeeDetails && profile.avatar_url ? (
            <div className="rr-avatar-ring shrink-0">
              <OptimizedImage
                src={profile.avatar_url}
                alt=""
                containerClassName="w-[4.5rem] h-[4.5rem] rounded-full border border-primary/30 shrink-0"
                className="rounded-full"
                objectFit="cover"
                loading="eager"
                fetchPriority="high"
                fadeInDuration={200}
                showSkeleton
              />
            </div>
          ) : (
            <div className="rr-avatar-ring shrink-0">
              <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground border border-primary/20 shrink-0">
                {canSeeDetails ? (profile.display_name?.[0] || '?') : '?'}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className="rr-kicker mb-1">Rider ID</div>
            <h1 className="font-display text-[clamp(1.15rem,5vw,1.65rem)] leading-tight font-extrabold tracking-[-0.04em] break-words [overflow-wrap:anywhere] min-w-0">
              {canSeeDetails ? profile.display_name : 'Private Rider'}
            </h1>
          </div>
        </div>

        {/* Dashboard Gauges */}
        {canSeeDetails && (
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
            <RiderMetric icon={Radio} label="Signals" value={profile.signals_count ?? '—'} />
            <RiderMetric icon={Bike} label="Bike" value={bikeLabel || 'Not set'} />
            <RiderMetric icon={ShieldCheck} label="Status" value={profile.is_public === false ? 'Private' : 'Public'} />
          </div>
        )}
      </div>

      {canSeeDetails ? (
        <>
          {profile.bio && (
            <div className="mb-3 rounded-2xl rr-surface p-4">
              <div className="rr-kicker text-muted-foreground mb-2">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
            </div>
          )}

          {/* Cinematic Bike Photo */}
          {bikeLabel && (
            <div className="mb-4 rounded-2xl rr-surface overflow-hidden">
              {profile.bike_photo_url && (
                <div className="relative h-44 border-b border-border/60 bg-black/40">
                  <OptimizedImage
                    src={profile.bike_photo_url}
                    alt="Bike"
                    containerClassName="h-full w-full"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="rr-kicker text-primary mb-1">Machine</div>
                    <div className="font-display text-lg font-bold text-white drop-shadow-lg">{bikeLabel}</div>
                  </div>
                </div>
              )}
              {!profile.bike_photo_url && (
                <div className="flex items-center gap-3 p-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{bikeLabel}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-5 rr-surface rounded-2xl text-center text-sm text-muted-foreground my-6">
          <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
          This profile is private. Add them as a friend to see more details.
        </div>
      )}

      {!isMe && (
        <div className="mb-4">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}

      {/* Comms Actions */}
      {!isMe && !isBlocked && (
        <div className="mb-6">
          {isFriend ? (
            <Button 
              onClick={() => openFriendChat.mutate()} 
              className="w-full h-12 rounded-full glow-green rr-haptic" 
              disabled={openFriendChat.isPending}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" /> Open comms channel
            </Button>
          ) : isPending ? (
            <Button variant="outline" disabled className="w-full h-12 rounded-full border-primary/20">
              <Clock className="w-4 h-4 mr-1.5" /> Friend request {friendship.user_a_id === user?.id ? 'sent' : 'pending'}
            </Button>
          ) : (
            <Button 
              onClick={() => sendFriendReq.mutate()} 
              disabled={sendFriendReq.isPending} 
              className="w-full h-12 rounded-full glow-green-sm rr-haptic"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> Initiate rider connection
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

function RiderMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-black/30 p-3 min-w-0 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse-green" />
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
        <span className="h-6 w-6 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-3.5 h-3.5 drop-shadow-[0_0_4px_currentColor]" />
        </span>
        {label}
      </div>
      <div className="font-display text-sm font-extrabold tracking-[-0.03em] truncate capitalize text-foreground">{value}</div>
    </div>
  );
}
