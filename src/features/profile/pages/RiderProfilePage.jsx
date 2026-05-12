/**
 * Public / private profile view for another rider.
 *
 * URL param: :userId
 * Privacy-aware: hides details for private profiles unless connected.
 * Supports friend request, chat, and block actions.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { getBroadcastsByAuthor } from '@/features/broadcast/api/broadcast-api.js';
import { useIsBlocked } from '@/features/safety/hooks/use-blocks.js';
import { useIsFriend } from '@/features/connections/hooks/use-friendships.js';
import { useConnectionRequestWith, useSendConnectionRequest } from '@/features/connections/hooks/use-connection-requests.js';

export default function RiderProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthState();
  const [avatarError, setAvatarError] = useState(false);

  const hasValidUserId = isValidUuid(userId);
  const isMeRoute = user?.id === userId;

  const { data: isBlocked = false } = useIsBlocked(userId);
  const { isFriend: isFriendActive, friendship } = useIsFriend(userId);
  const { data: connectionRequest } = useConnectionRequestWith(userId);

  const isPending = !!connectionRequest;
  const isFriend = isFriendActive;

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
    queryFn: async () => {
      const { data, error } = await getBroadcastsByAuthor(userId, 50);
      if (error) throw error;
      return data || [];
    },
  });

  const sendFriendReq = useSendConnectionRequest();

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
      <div className="mx-auto max-w-2xl px-5 pt-5">
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
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">Rider profile not found or private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-5 pb-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 active:scale-95 transition-transform"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile Header */}
      <div className="relative mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6">
        <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-4">
            {canSeeDetails && profile.avatar_url && !avatarError ? (
              <div className="rounded-full bg-gradient-to-br from-primary/40 to-primary/10 p-[3px] shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                <OptimizedImage
                  src={profile.avatar_url}
                  alt=""
                  containerClassName="h-24 w-24 shrink-0 rounded-full"
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
              <div className="rounded-full bg-gradient-to-br from-primary/40 to-primary/10 p-[3px] shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-display text-3xl font-bold text-primary-foreground">
                  {canSeeDetails ? profile.display_name?.[0]?.toUpperCase() || '?' : '?'}
                </div>
              </div>
            )}
            {canSeeDetails && (
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-[hsl(220_20%_7%)] bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            )}
          </div>

          {/* Name & Username */}
          <h1 className="font-display text-[clamp(1.25rem,5vw,1.75rem)] font-extrabold leading-tight tracking-[-0.04em]">
            {canSeeDetails ? profile.display_name : 'Private Rider'}
          </h1>
          {canSeeDetails && profile.username && (
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
          )}
        </div>

        {/* Stats Row */}
        {canSeeDetails && (
          <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
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
            <div className="mb-4 rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
            </div>
          )}

          {/* Bike Info Card */}
          {bikeLabel && (
            <div className="mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)]">
              {profile.bike_photo_url && (
                <div className="relative h-48 border-b border-border/60 bg-black/40">
                  <OptimizedImage
                    src={profile.bike_photo_url}
                    alt="Bike"
                    containerClassName="h-full w-full"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Machine</div>
                    <div className="font-display text-lg font-bold text-white drop-shadow-lg">
                      {bikeLabel}
                    </div>
                  </div>
                </div>
              )}
              {!profile.bike_photo_url && (
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <Bike className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Machine</div>
                    <div className="mt-0.5 font-display text-base font-bold">{bikeLabel}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="my-6 rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6 text-center text-sm text-muted-foreground">
          <Lock className="mx-auto mb-3 h-6 w-6 opacity-60" />
          This profile is private. Add them as a friend to see more details.
        </div>
      )}

      {/* Safety Actions */}
      {!isMeRoute && (
        <div className="mb-5">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}

      {/* Connection Actions */}
      {!isMeRoute && !isBlocked && (
        <div className="mb-6">
          {isFriend ? (
            <Button
              onClick={() => openFriendChat.mutate()}
              className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)] transition-all hover:bg-primary/90 active:scale-95"
              disabled={openFriendChat.isPending}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Message
            </Button>
          ) : isPending ? (
            <Button
              variant="outline"
              disabled
              className="h-12 w-full rounded-full border-border/60 bg-[hsl(220_20%_7%)]"
            >
              <Clock className="mr-2 h-4 w-4" /> Request{' '}
              {connectionRequest?.from_user_id === user?.id ? 'sent' : 'pending'}
            </Button>
          ) : (
            <Button
              onClick={() =>
                sendFriendReq.mutate({ from_user_id: user.id, to_user_id: userId })
              }
              disabled={sendFriendReq.isPending}
              className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)] transition-all hover:bg-primary/90 active:scale-95"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Connect
            </Button>
          )}
        </div>
      )}

      {/* Active broadcasts */}
      {canSeeDetails && (
        <>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active broadcasts</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary" />
              Signal log
            </span>
          </div>
          {isBroadcastsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5 space-y-2">
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
            <div className="rounded-[20px] border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              <RRLogo size="sm" className="mx-auto mb-3 opacity-50" />
              No active broadcasts
            </div>
          )}
        </>
      )}

      <div className="mt-6 rounded-2xl border border-border/40 bg-[hsl(220_20%_7%)] py-4 text-center text-xs text-muted-foreground">
        {isBlocked
          ? 'You have blocked this rider.'
          : 'Limited rider preview. More details visible after connecting.'}
      </div>
    </div>
  );
}

function RiderMetric({ icon: Icon, label, value }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black/30 p-3 backdrop-blur-sm">
      <div className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary/60" />
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="truncate font-display text-sm font-extrabold capitalize tracking-[-0.03em] text-foreground">
        {value}
      </div>
    </div>
  );
}
