/**
 * Public / private profile view for another rider.
 *
 * URL param: :userId
 * Privacy-aware: hides details for private profiles unless connected.
 * Supports friend request, chat, and block actions.
 * Electric Neon Green redesign.
 */

import { useMemo, useState, memo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { getProfileByUserId } from '@/features/profile/api/profile-api';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { isValidUuid } from '@/lib/utils';
import {
  Bike,
  UserPlus,
  MessageCircle,
  Clock,
  Radio,
  Lock,
  Images,
  User,
  Ban,
  Loader2,
  UserMinus,
  Users,
  RefreshCw,
} from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { RideCard } from '@/components/shared/RideCard';
import { isExpired } from '@/lib/broadcastUtils';
import { useBroadcastsByAuthor } from '@/features/broadcast/hooks/use-broadcasts.js';
import { useIsBlocked } from '@/features/safety/hooks/use-blocks.js';
import { useIsFriend, useRemoveFriendship, friendshipKeys } from '@/features/connections/hooks/use-friendships.js';
import { getFriendshipsCount } from '@/features/connections/api/connections-api.js';
import {
  useConnectionRequestWith,
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useDeclineConnectionRequest,
  connectionRequestKeys,
} from '@/features/connections/hooks/use-connection-requests.js';
import { supabase } from '@/lib/supabase.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';
import {
  markRealtimeSurfaceSubscribed,
  markRealtimeSurfaceReconnecting,
  markRealtimeSurfaceError,
} from '@/lib/realtimeHealthRegistry.js';
import { logger } from '@/lib/logger.js';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils.js';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useUserPosts } from '@/features/profile/hooks/use-user-posts';
import PostGrid from '@/features/profile/components/PostGrid';
import PostDetailSheet from '@/features/profile/components/PostDetailSheet';
import StatPill from '@/features/profile/components/StatPill.jsx';
import ProfileBikePhotoCard from '@/features/profile/components/ProfileBikePhotoCard.jsx';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh.js';

const profileAmbientTopStyle = {
  background:
    'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.14), transparent 42%), radial-gradient(circle at 18% 14%, hsl(var(--cyan) / 0.08), transparent 30%), radial-gradient(circle at 82% 10%, hsl(var(--brand-amber) / 0.06), transparent 28%)',
};

const profileAmbientBottomStyle = {
  background:
    'linear-gradient(180deg, transparent 0%, hsl(240 20% 2% / 0.10) 36%, hsl(240 20% 2% / 0.34) 100%)',
};

const profileTabsListClass =
  'w-full grid grid-cols-2 rounded-full border border-white/[0.08] bg-surface/82 p-1.5 shadow-[0_16px_48px_hsl(0_0%_0%/0.30)] backdrop-blur-2xl';

const profileTabsTriggerClass =
  'gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all data-[state=active]:bg-primary/14 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08),0_0_18px_hsl(var(--primary)/0.16)]';

function RiderProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthState();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [userId]);

  const [activeTab, setActiveTab] = useState('broadcasts');
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openPostId = searchParams.get('openPost');

  const hasValidUserId = isValidUuid(userId);
  const isMeRoute = user?.id === userId;

  const { data: isBlocked = false } = useIsBlocked(userId);
  const { isFriend: isFriendActive, friendship } = useIsFriend(userId);
  const { data: connectionRequest } = useConnectionRequestWith(userId);

  const isOutgoingPending = connectionRequest?.status === 'pending' && connectionRequest?.from_user_id === user?.id;
  const isIncomingPending = connectionRequest?.status === 'pending' && connectionRequest?.from_user_id === userId;
  const isPending = isOutgoingPending || isIncomingPending;
  const isConnected = isFriendActive;
  const isFriend = isFriendActive;

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const { mutate: removeFriend, isPending: isRemovingFriend } = useRemoveFriendship();

  useEffect(() => {
    if (!user?.id || !userId) return;

    const channel = supabase
      .channel(`profile-conn-${user.id}-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'connection_requests',
        filter: `from_user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: connectionRequestKeys.all });
        qc.invalidateQueries({ queryKey: friendshipKeys.all });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'connection_requests',
        filter: `to_user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: connectionRequestKeys.all });
        qc.invalidateQueries({ queryKey: friendshipKeys.all });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_a_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: friendshipKeys.all });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_b_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: friendshipKeys.all });
      })
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[RiderProfilePage] Realtime disconnected (expected reconnect)', { status });
            markRealtimeSurfaceReconnecting('rider-profile');
          } else {
            logger.error('[RiderProfilePage] Realtime subscription error:', err);
            markRealtimeSurfaceError('rider-profile');
          }
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('rider-profile');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('rider-profile');
        }
      });

    return () => supabase.removeChannel(channel);
  }, [user?.id, userId, qc]);

  useEffect(() => {
    if (!hasValidUserId) return;

    const channel = supabase
      .channel(`profile-broadcasts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts',
          filter: `author_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: broadcastKeys.author(userId) });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[RiderProfilePage] Realtime disconnected (expected reconnect)', { status });
            markRealtimeSurfaceReconnecting('rider-profile');
          } else {
            logger.error('[RiderProfilePage] Realtime subscription error:', err);
            markRealtimeSurfaceError('rider-profile');
          }
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('rider-profile');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('rider-profile');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasValidUserId, qc, userId]);

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
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

  const { data: riderBroadcasts = [], isLoading: isBroadcastsLoading, isError: broadcastsError, refetch: refetchBroadcasts } =
    useBroadcastsByAuthor(hasValidUserId && !!profile ? userId : null);

  const sendFriendReq = useSendConnectionRequest();
  const { mutate: acceptConn, isPending: isAccepting } = useAcceptConnectionRequest();
  const { mutate: declineConn, isPending: isDeclining } = useDeclineConnectionRequest();

  const handleAccept = useCallback(() => {
    if (!connectionRequest?.id) return;
    acceptConn(connectionRequest.id, {
      onSuccess: (conversation) => {
        if (conversation?.id) navigate(`/messages/${conversation.id}`);
      },
    });
  }, [acceptConn, connectionRequest?.id, navigate]);

  const handleDecline = useCallback(() => {
    if (!connectionRequest?.id) return;
    declineConn(connectionRequest.id);
  }, [declineConn, connectionRequest?.id]);

  const openFriendChat = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
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
    onError: () => {
      toast.error('Could not open conversation', { description: 'Please try again.' });
    },
  });

  const canSeeDetails = !isBlocked && (isMeRoute || isFriend || profile?.is_public !== false);

  const { data: crewCount = 0, isLoading: crewCountLoading } = useQuery({
    queryKey: ['connections-count', userId],
    enabled: canSeeDetails && hasValidUserId,
    queryFn: async () => {
      const { data, error } = await getFriendshipsCount(userId);
      if (error) throw error;
      return data;
    },
  });

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

  const {
    data: riderPosts = [],
    isLoading: postsLoading,
    isError: postsFailed,
    refetch: refetchPosts,
  } = useUserPosts(userId, {
    enabled: canSeeDetails && hasValidUserId && !!profile,
  });

  const handleRefresh = useCallback(() => {
    refetchProfile();
    refetchBroadcasts();
    refetchPosts();
  }, [refetchProfile, refetchBroadcasts, refetchPosts]);

  const { pullOffset, touchHandlers, containerRef } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    if (!canSeeDetails && openPostId) {
      setSearchParams(prev => {
        prev.delete('openPost');
        return prev;
      }, { replace: true });
    }
  }, [canSeeDetails, openPostId, setSearchParams]);

  useEffect(() => {
    if (!openPostId || postsLoading || riderPosts.length === 0) return;
    const post = riderPosts.find((p) => p.id === openPostId);
    if (!post) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('openPost');
        return next;
      }, { replace: true });
      return;
    }
    setActiveTab('media');
    setSelectedPost(post);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openPost');
      return next;
    }, { replace: true });
  }, [openPostId, postsLoading, riderPosts, setSearchParams]);

  if (!hasValidUserId) {
    return (
      <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
        <div className="relative z-10">
          <EmptyState icon={User} title="Invalid rider link" description="The profile URL appears to be malformed." />
        </div>
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
        <VStack gap={4} align="center" className="relative z-10 min-h-[50vh] justify-center">
          <LoadingState variant="section" message="Loading rider profile..." />
        </VStack>
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
        <div className="relative z-10">
          <ErrorState
            title="Rider not found"
            message={profileError?.message || 'Rider profile not found or private.'}
            onRetry={refetchProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <VStack ref={containerRef} {...touchHandlers} gap={4} className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh overflow-y-auto">
      {pullOffset > 10 && (
        <div className="flex justify-center py-2">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.40),0_0_0_1px_hsl(var(--primary)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)] backdrop-blur-2xl">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-brand-radar/[0.06] blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <VStack align="center" gap={3}>
            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="rr-avatar-ring shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
                {canSeeDetails && profile.avatar_url && !avatarError ? (
                  <OptimizedImage
                    src={profile.avatar_url}
                    alt=""
                    containerClassName="h-28 w-28 shrink-0 rounded-full"
                    className="rounded-full"
                    objectFit="cover"
                    loading="eager"
                    fetchPriority="high"
                    fadeInDuration={200}
                    showSkeleton
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-brand-radar/20 to-brand-amber/20 font-display text-4xl font-bold text-primary">
                    {canSeeDetails ? profile.display_name?.[0]?.toUpperCase() || '?' : '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Name & Username */}
            <VStack align="center" gap={0.5}>
              <HStack align="center" gap={2}>
                <Text as="h1" variant="h2" color="default" align="center" className={cn(canSeeDetails && 'font-bold tracking-[-0.03em]')}>
                  {canSeeDetails ? profile.display_name : 'Private Rider'}
                </Text>
                {isFriend && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-primary/20">
                    Friend
                  </Badge>
                )}
                {isPending && (
                  <Badge variant="outline" className="text-[10px] border-brand-amber/30 text-brand-amber">
                    Pending
                  </Badge>
                )}
              </HStack>
              {canSeeDetails && profile.username && (
                <Text variant="bodySm" color="muted" className="font-mono-data">
                  @{profile.username}
                </Text>
              )}
            </VStack>

            {canSeeDetails && profile.bio && (
              <Text variant="body" color="default" align="center" className="max-w-sm text-pretty leading-relaxed text-white/88">
                {profile.bio}
              </Text>
            )}

            {/* Connection Status */}
            {isBlocked && (
              <HStack align="center" gap={1.5} className="rounded-full border border-brand-emergency/20 bg-brand-emergency/10 px-3 py-1.5">
                <Ban className="w-3.5 h-3.5 text-brand-emergency" />
                <Text variant="micro" className="text-brand-emergency font-semibold">Blocked</Text>
              </HStack>
            )}

            {/* Stats Row — neon brand colors */}
            {canSeeDetails && (
              <HStack gap={2} className="w-full mt-1">
                <StatPill icon={Radio} label="Signals" value={activeBroadcasts.length} isLoading={isBroadcastsLoading} brand="green" onClick={() => setActiveTab('broadcasts')} />
                <StatPill icon={Bike} label="Bike" value={bikeLabel || 'Not set'} brand="radar" />
                <StatPill icon={Users} label="Crew" value={crewCount} isLoading={crewCountLoading} brand="amber" />
              </HStack>
            )}

            {!isMeRoute && canSeeDetails && profile?.avatar_url && (
              <div className="mt-1 flex w-full items-center justify-between gap-3">
                <Text variant="micro" color="muted">Report avatar</Text>
                <SafetyActions
                  targetType="image"
                  targetId={profile.user_id}
                  targetProfileId={profile.user_id}
                  targetContext={{ image_kind: 'avatar', image_url: profile.avatar_url }}
                  compact
                  className="justify-end"
                />
              </div>
            )}

            {/* Action Buttons */}
            {!isMeRoute && !isBlocked && (
              <>
                {isConnected ? (
                  <HStack gap={2} className="w-full mt-1">
                    <button
                      onClick={() => openFriendChat.mutate()}
                      disabled={openFriendChat.isPending || isRemovingFriend}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-full',
                        'bg-brand-radar text-primary-foreground px-5 py-2.5 text-sm font-bold',
                        'transition-all hover:bg-brand-radar/90 pressable',
                        'shadow-[0_4px_20px_hsl(var(--brand-radar)/0.35)]',
                        'disabled:opacity-50'
                      )}
                    >
                      <MessageCircle className="h-4 w-4" /> Message
                    </button>
                    {confirmingRemove ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmingRemove(false)}
                          disabled={isRemovingFriend}
                          className={cn(
                            'flex items-center justify-center rounded-full border border-white/[0.08]',
                            'bg-surface/60 px-3 py-2.5 text-xs font-semibold text-muted-foreground',
                            'transition-all hover:text-foreground hover:bg-surface-elevated pressable',
                            'disabled:opacity-50'
                          )}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => friendship?.id && removeFriend(friendship.id)}
                          disabled={isRemovingFriend || !friendship?.id}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-full',
                            'bg-brand-emergency/10 border border-brand-emergency/30 text-brand-emergency',
                            'px-3 py-2.5 text-xs font-bold',
                            'transition-all hover:bg-brand-emergency/20 pressable',
                            'disabled:opacity-50'
                          )}
                        >
                          {isRemovingFriend && <Loader2 className="h-3 w-3 animate-spin" />}
                          Remove
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingRemove(true)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-full',
                          'border border-brand-emergency/20 text-brand-emergency/70',
                          'px-3 py-2.5 text-xs font-semibold',
                          'transition-all hover:border-brand-emergency/40 hover:text-brand-emergency hover:bg-brand-emergency/10 pressable',
                        )}
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Unfriend
                      </button>
                    )}
                  </HStack>
                ) : isIncomingPending ? (
                  <VStack gap={2} className="w-full mt-1">
                    <Text variant="micro" color="muted" align="center">
                      This rider sent you a connection request.
                    </Text>
                    <HStack gap={2} className="w-full">
                      <button
                        onClick={handleDecline}
                        disabled={isDeclining || isAccepting}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 rounded-full border border-white/[0.08]',
                          'bg-surface/60 px-5 py-2.5 text-sm font-semibold text-muted-foreground',
                          'transition-all hover:text-foreground hover:bg-surface-elevated pressable',
                          'disabled:opacity-50'
                        )}
                      >
                        {isDeclining && <Loader2 className="h-4 w-4 animate-spin" />}
                        Decline
                      </button>
                      <button
                        onClick={handleAccept}
                        disabled={isAccepting || isDeclining}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 rounded-full',
                          'bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold',
                          'transition-all hover:bg-primary/90 pressable',
                          'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]',
                          'disabled:opacity-50'
                        )}
                      >
                        {isAccepting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Accept
                      </button>
                    </HStack>
                  </VStack>
                ) : isOutgoingPending ? (
                  <HStack gap={3} className="w-full mt-1">
                    <button
                      disabled
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-full border border-brand-amber/30',
                        'bg-brand-amber/10 px-5 py-2.5 text-sm font-semibold text-brand-amber',
                        'disabled:opacity-60'
                      )}
                    >
                      <Clock className="h-4 w-4" /> Request sent
                    </button>
                  </HStack>
                ) : (
                  <HStack gap={3} className="w-full mt-1">
                    <button
                      onClick={() => sendFriendReq.mutate({ from_user_id: user.id, to_user_id: userId })}
                      disabled={sendFriendReq.isPending}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-full',
                        'bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold',
                        'transition-all hover:bg-primary/90 pressable',
                        'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]',
                        'disabled:opacity-50'
                      )}
                    >
                      <UserPlus className="h-4 w-4" /> Connect
                    </button>
                  </HStack>
                )}
              </>
            )}
          </VStack>
        </div>
      </div>

      {/* Private notice */}
      {!canSeeDetails && (
        <div className="surface-card rounded-2xl border border-brand-amber/20 bg-surface/84 p-6 text-center shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-amber/10 border border-brand-amber/20 shadow-[0_0_16px_hsl(var(--brand-amber)/0.12)]">
            <Lock className="h-7 w-7 text-brand-amber" />
          </div>
          <Text variant="bodySm" className="font-semibold text-brand-amber mb-1">Private Profile</Text>
          <Text variant="caption" color="muted">
            This profile is private. Add them as a friend to see more details.
          </Text>
        </div>
      )}

      {canSeeDetails && (
        <>
          <ProfileBikePhotoCard
            src={profile?.bike_photo_url}
            title="Bike"
            bikeLabel={bikeLabel}
          />
          {!isMeRoute && profile?.bike_photo_url && (
            <div className="mt-2 flex w-full items-center justify-between gap-3">
              <Text variant="micro" color="muted">Report bike photo</Text>
              <SafetyActions
                targetType="image"
                targetId={profile.user_id}
                targetProfileId={profile.user_id}
                targetContext={{ image_kind: 'bike_photo', image_url: profile.bike_photo_url }}
                compact
                className="justify-end"
              />
            </div>
          )}
        </>
      )}

      {/* Tabs — only shown when details are visible */}
      {canSeeDetails && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={profileTabsListClass}>
            <TabsTrigger value="broadcasts" className={profileTabsTriggerClass}>
              <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Signals
            </TabsTrigger>
            <TabsTrigger value="media" className={profileTabsTriggerClass}>
              <Images className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Shots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="broadcasts" className="mt-4">
            {isBroadcastsLoading ? (
              <div className="space-y-3 mt-4">
                {[0,1,2].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/[0.06] bg-surface p-4 space-y-3 animate-pulse">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : broadcastsError ? (
              <ErrorState title="Signals unavailable" onRetry={refetchBroadcasts} />
            ) : activeBroadcasts.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-surface/84 p-3 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl sm:grid-cols-2">
                {activeBroadcasts.map((b) => (
                  <RideCard key={b.id} broadcast={b} author={profile} to={`/broadcast/${b.id}`} />
                ))}
              </div>
            ) : (
              <div className="surface-card rounded-2xl border border-white/[0.08] bg-surface/84 p-5 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
                <EmptyState icon={Radio} title="No active signals" description="This rider has no active signals." />
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            {postsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {[0,1,2,3,4,5].map((i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-2xl w-full" />
                ))}
              </div>
            ) : postsFailed ? (
              <ErrorState title="Shots unavailable" onRetry={refetchPosts} />
            ) : riderPosts.length === 0 ? (
              <div className="surface-card rounded-2xl border border-white/[0.08] bg-surface/84 p-5 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
                <EmptyState
                  icon={Images}
                  title="No shots yet"
                  description="This rider hasn't shared any shots yet."
                />
              </div>
            ) : (
              <PostGrid
                posts={riderPosts}
                onPostClick={setSelectedPost}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {selectedPost && (
        <PostDetailSheet
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          userId={user?.id}
        />
      )}

      {/* Safety Actions */}
      {!isMeRoute && (
        <div className="surface-card rounded-2xl border border-white/[0.08] bg-surface/84 p-4 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}
    </VStack>
  );
}

export default memo(RiderProfilePage);
