/**
 * Public / private profile view for another rider.
 *
 * URL param: :userId
 * Privacy-aware: hides details for private profiles unless connected.
 * Supports friend request, chat, and block actions.
 */

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { getProfileByUserId } from '@/features/profile/api/profile-api';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { isValidUuid } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bike,
  UserPlus,
  MessageCircle,
  Clock,
  ShieldCheck,
  Radio,
  Lock,
} from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import SafetyActions from '@/components/safety/SafetyActions';
import OptimizedImage from '@/components/shared/OptimizedImage';
import BroadcastCard from '@/components/shared/BroadcastCard';
import { isExpired } from '@/lib/broadcastUtils';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchRiderBroadcasts(userId) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export default function RiderProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthState();
  const [avatarError, setAvatarError] = useState(false);

  const hasValidUserId = isValidUuid(userId);
  const isMeRoute = user?.id === userId;

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', user?.id, userId],
    enabled: !!user && hasValidUserId && !isMeRoute,
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

  const isFriend = friendship?.status === 'active';
  const isPending = friendship?.status === 'pending';
  const isBlocked = blocks.length > 0;

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ['profile', userId],
    enabled: hasValidUserId,
    queryFn: async () => {
      const { data, error } = await getProfileByUserId(userId);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: riderBroadcasts = [], isLoading: isBroadcastsLoading } = useQuery({
    queryKey: ['rider-broadcasts', userId],
    enabled: hasValidUserId && !!profile,
    queryFn: () => fetchRiderBroadcasts(userId),
  });

  const sendFriendReq = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('friendships').insert({
        user_a_id: user.id,
        user_b_id: userId,
        status: 'pending',
      });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friendship'] }),
  });

  const openFriendChat = useMutation({
    mutationFn: async () => {
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

  const canSeeDetails = !isBlocked && (isMeRoute || isFriend || profile?.is_public !== false);

  const activeBroadcasts = useMemo(
    () =>
      canSeeDetails
        ? riderBroadcasts.filter((b) => b.status === 'active' && !isExpired(b))
        : [],
    [canSeeDetails, riderBroadcasts]
  );

  const bikeLabel = useMemo(() => {
    if (!profile?.bike_make && !profile?.bike_model) return null;
    return [profile?.bike_year, profile?.bike_make, profile?.bike_model]
      .filter(Boolean)
      .join(' ')
      .trim();
  }, [profile]);

  if (!hasValidUserId) {
    return (
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Invalid rider link.</div>
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-sm text-muted-foreground">
        <RRLogo size="md" className="mb-4 animate-pulse" />
        Loading rider profile…
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rr-surface rounded-2xl p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">Rider profile not found or private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="rr-haptic mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Identity Card */}
      <div className="rr-surface-strong relative mb-4 overflow-hidden rounded-[1.45rem] p-5">
        <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative z-10 flex items-start gap-4">
          {canSeeDetails && profile.avatar_url && !avatarError ? (
            <div className="rr-avatar-ring shrink-0">
              <OptimizedImage
                src={profile.avatar_url}
                alt=""
                containerClassName="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full border border-primary/30"
                className="rounded-full"
                objectFit="cover"
                loading="eager"
                fetchPriority="high"
                fadeInDuration={200}
                showSkeleton
                onError={() => setAvatarError(true)}
              />
            </div>
          ) : (
            <div className="rr-avatar-ring shrink-0">
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary to-primary/70 font-display text-2xl font-bold text-primary-foreground">
                {canSeeDetails ? profile.display_name?.[0]?.toUpperCase() || '?' : '?'}
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1 pt-1">
            <div className="rr-kicker mb-1">Rider ID</div>
            <h1 className="min-w-0 break-words font-display text-[clamp(1.15rem,5vw,1.65rem)] font-extrabold leading-tight tracking-[-0.04em] [overflow-wrap:anywhere]">
              {canSeeDetails ? profile.display_name : 'Private Rider'}
            </h1>
            {canSeeDetails && profile.username && (
              <p className="mt-0.5 text-xs text-muted-foreground">@{profile.username}</p>
            )}
          </div>
        </div>

        {/* Dashboard Gauges */}
        {canSeeDetails && (
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
            <RiderMetric icon={Radio} label="Signals" value={activeBroadcasts.length} />
            <RiderMetric icon={Bike} label="Bike" value={bikeLabel || 'Not set'} />
            <RiderMetric
              icon={ShieldCheck}
              label="Status"
              value={profile.is_public === false ? 'Private' : 'Public'}
            />
          </div>
        )}
      </div>

      {canSeeDetails ? (
        <>
          {profile.bio && (
            <div className="rr-surface mb-3 rounded-2xl p-4">
              <div className="rr-kicker mb-2 text-muted-foreground">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
            </div>
          )}

          {/* Cinematic Bike Photo */}
          {bikeLabel && (
            <div className="rr-surface mb-4 overflow-hidden rounded-2xl">
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
                    <div className="rr-kicker mb-1 text-primary">Machine</div>
                    <div className="font-display text-lg font-bold text-white drop-shadow-lg">
                      {bikeLabel}
                    </div>
                  </div>
                </div>
              )}
              {!profile.bike_photo_url && (
                <div className="flex items-center gap-3 p-4 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <Bike className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{bikeLabel}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rr-surface my-6 rounded-2xl p-5 text-center text-sm text-muted-foreground">
          <Lock className="mx-auto mb-2 h-5 w-5 opacity-60" />
          This profile is private. Add them as a friend to see more details.
        </div>
      )}

      {!isMeRoute && (
        <div className="mb-4">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}

      {/* Comms Actions */}
      {!isMeRoute && !isBlocked && (
        <div className="mb-6">
          {isFriend ? (
            <Button
              onClick={() => openFriendChat.mutate()}
              className="rr-haptic h-12 w-full rounded-full glow-green"
              disabled={openFriendChat.isPending}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" /> Open comms channel
            </Button>
          ) : isPending ? (
            <Button
              variant="outline"
              disabled
              className="h-12 w-full rounded-full border-primary/20"
            >
              <Clock className="mr-1.5 h-4 w-4" /> Friend request{' '}
              {friendship?.user_a_id === user?.id ? 'sent' : 'pending'}
            </Button>
          ) : (
            <Button
              onClick={() => sendFriendReq.mutate()}
              disabled={sendFriendReq.isPending}
              className="rr-haptic h-12 w-full rounded-full glow-green-sm"
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Initiate rider connection
            </Button>
          )}
        </div>
      )}

      {/* Active broadcasts */}
      {canSeeDetails && (
        <>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="rr-kicker text-muted-foreground">Active broadcasts</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary" />
              Signal log
            </span>
          </div>
          {isBroadcastsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rr-surface rounded-2xl p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : activeBroadcasts.length > 0 ? (
            <div className="space-y-3">
              {activeBroadcasts.map((b) => (
                <BroadcastCard key={b.id} broadcast={b} author={profile} />
              ))}
            </div>
          ) : (
            <div className="rr-surface rounded-xl border border-dashed border-border/60 bg-transparent py-8 text-center text-sm text-muted-foreground">
              <RRLogo size="sm" className="mx-auto mb-2 opacity-50" />
              No active broadcasts
            </div>
          )}
        </>
      )}

      <div className="mt-6 rounded-2xl border border-border/40 bg-secondary/20 py-4 text-center text-xs text-muted-foreground">
        {isBlocked
          ? 'You have blocked this rider.'
          : 'Limited rider preview. More details visible after connecting.'}
      </div>
    </div>
  );
}

function RiderMetric({ icon: Icon, label, value }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-black/30 p-3 backdrop-blur-sm">
      <div className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary/60" />
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5 drop-shadow-[0_0_4px_currentColor]" />
        </span>
        {label}
      </div>
      <div className="truncate font-display text-sm font-extrabold capitalize tracking-[-0.03em] text-foreground">
        {value}
      </div>
    </div>
  );
}
