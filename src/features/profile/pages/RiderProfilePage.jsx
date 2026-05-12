/**
 * Public / private profile view for another rider.
 *
 * URL param: :userId
 * Privacy-aware: hides details for private profiles unless connected.
 * Supports friend request, chat, and block actions.
 * Instagram-style layout with Connect / Message / Block buttons.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { getProfileByUserId } from '@/features/profile/api/profile-api';
import { getOrCreateConversation } from '@/lib/conversationUtils';
import { isValidUuid } from '@/lib/utils';
import {
  ArrowLeft,
  Bike,
  UserPlus,
  MessageCircle,
  Clock,
  ShieldCheck,
  Radio,
  Lock,
  MapPin,
  Calendar,
  Grid3X3,
  User,
  Ban,
} from 'lucide-react';
import SafetyActions from '@/components/safety/SafetyActions';
import OptimizedImage from '@/components/shared/OptimizedImage';
import BroadcastCard from '@/components/shared/BroadcastCard';
import { isExpired } from '@/lib/broadcastUtils';
import { getBroadcastsByAuthor } from '@/features/broadcast/api/broadcast-api.js';
import { useIsBlocked } from '@/features/safety/hooks/use-blocks.js';
import { useIsFriend } from '@/features/connections/hooks/use-friendships.js';
import { useConnectionRequestWith, useSendConnectionRequest } from '@/features/connections/hooks/use-connection-requests.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils.js';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';

export default function RiderProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthState();
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');

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

  const { data: riderBroadcasts = [], isLoading: isBroadcastsLoading, isError: broadcastsError, refetch: refetchBroadcasts } = useQuery({
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

  const joinDate = useMemo(() => {
    if (!profile?.created_at) return null;
    const date = new Date(profile.created_at);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, [profile?.created_at]);

  if (!hasValidUserId) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 pressable"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <EmptyState icon={User} title="Invalid rider link" description="The profile URL appears to be malformed." />
      </div>
    );
  }

  if (isProfileLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
        <VStack gap={4} align="center" className="min-h-[50vh] justify-center">
          <LoadingState variant="section" message="Loading rider profile..." />
        </VStack>
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 pressable"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <ErrorState
          title="Rider not found"
          message={profileError?.message || 'Rider profile not found or private.'}
          onRetry={refetchProfile}
        />
      </div>
    );
  }

  return (
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 pressable self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile Header Card */}
      <div className="surface-card p-5">
        <VStack align="center" gap={3}>
          {/* Avatar with gradient ring */}
          <div className="relative">
            <div className="rr-avatar-ring">
              {canSeeDetails && profile.avatar_url && !avatarError ? (
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
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-display text-3xl font-bold text-primary-foreground">
                  {canSeeDetails ? profile.display_name?.[0]?.toUpperCase() || '?' : '?'}
                </div>
              )}
            </div>
            {canSeeDetails && (
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
            )}
          </div>

          {/* Name & Username */}
          <VStack align="center" gap={0.5}>
            <HStack align="center" gap={2}>
              <Text as="h1" variant="h2" color="default" align="center">
                {canSeeDetails ? profile.display_name : 'Private Rider'}
              </Text>
              {isFriend && (
                <Badge variant="secondary" className="text-[10px]">Friend</Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="text-[10px]">Pending</Badge>
              )}
            </HStack>
            {canSeeDetails && profile.username && (
              <Text variant="bodySm" color="muted">@{profile.username}</Text>
            )}
          </VStack>

          {/* Connection Status */}
          {isBlocked && (
            <HStack align="center" gap={1.5} className="px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
              <Ban className="w-3.5 h-3.5 text-destructive" />
              <Text variant="micro" color="destructive">Blocked</Text>
            </HStack>
          )}

          {/* Stats Row */}
          {canSeeDetails && (
            <HStack gap={2} className="w-full mt-1">
              <StatPill icon={Radio} label="Broadcasts" value={activeBroadcasts.length} isLoading={isBroadcastsLoading} />
              <StatPill icon={Bike} label="Bike" value={bikeLabel || 'Not set'} />
              <StatPill icon={ShieldCheck} label="Status" value={profile.is_public === false ? 'Private' : 'Public'} />
            </HStack>
          )}

          {/* Action Buttons */}
          {!isMeRoute && !isBlocked && (
            <HStack gap={3} className="w-full mt-1">
              {isFriend ? (
                <button
                  onClick={() => openFriendChat.mutate()}
                  disabled={openFriendChat.isPending}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-full',
                    'bg-brand-kawasaki text-primary-foreground px-5 py-2.5 text-sm font-bold',
                    'transition-all hover:bg-brand-kawasaki/90 pressable glow-kawasaki-sm',
                    'disabled:opacity-50'
                  )}
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
              ) : isPending ? (
                <button
                  disabled
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-full border border-border/60',
                    'bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground',
                    'disabled:opacity-60'
                  )}
                >
                  <Clock className="h-4 w-4" />
                  Request {connectionRequest?.from_user_id === user?.id ? 'sent' : 'pending'}
                </button>
              ) : (
                <button
                  onClick={() => sendFriendReq.mutate({ from_user_id: user.id, to_user_id: userId })}
                  disabled={sendFriendReq.isPending}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-full',
                    'bg-brand-kawasaki text-primary-foreground px-5 py-2.5 text-sm font-bold',
                    'transition-all hover:bg-brand-kawasaki/90 pressable glow-kawasaki-sm',
                    'disabled:opacity-50'
                  )}
                >
                  <UserPlus className="h-4 w-4" /> Connect
                </button>
              )}
            </HStack>
          )}
        </VStack>
      </div>

      {/* Private notice */}
      {!canSeeDetails && (
        <div className="surface-card p-6 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-60" />
          <Text variant="bodySm" color="muted">
            This profile is private. Add them as a friend to see more details.
          </Text>
        </div>
      )}

      {/* Tabs — only shown when details are visible */}
      {canSeeDetails && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="broadcasts" className="gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Broadcasts
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5">
              <User className="w-3.5 h-3.5" /> About
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5" /> Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="broadcasts" className="mt-4">
            {isBroadcastsLoading ? (
              <LoadingState variant="section" message="Loading broadcasts..." />
            ) : broadcastsError ? (
              <ErrorState title="Broadcasts unavailable" onRetry={refetchBroadcasts} />
            ) : activeBroadcasts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeBroadcasts.map((b) => (
                  <BroadcastCard key={b.id} broadcast={b} author={profile} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Radio} title="No active broadcasts" description="This rider has no active signals." />
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <VStack gap={3}>
              {bikeLabel && (
                <div className="surface-card p-4">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                      <Bike className="h-5 w-5 text-primary" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" color="primary">Machine</Text>
                      <Text variant="bodySm" className="font-semibold">{bikeLabel}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {profile?.location && (
                <div className="surface-card p-4">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-yamaha/20 bg-brand-yamaha/10">
                      <MapPin className="h-5 w-5 text-brand-yamaha" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" color="brandYamaha">Location</Text>
                      <Text variant="bodySm" className="font-semibold">{profile.location}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {joinDate && (
                <div className="surface-card p-4">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-ducati/20 bg-brand-ducati/10">
                      <Calendar className="h-5 w-5 text-brand-ducati" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" color="brandDucati">Joined</Text>
                      <Text variant="bodySm" className="font-semibold">{joinDate}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {profile?.bio && (
                <div className="surface-card p-4">
                  <Text variant="bodySm" color="muted" className="leading-relaxed text-pretty">
                    {profile.bio}
                  </Text>
                </div>
              )}
            </VStack>
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            {profile?.bike_photo_url ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="surface-card overflow-hidden aspect-square">
                  <OptimizedImage
                    src={profile.bike_photo_url}
                    alt="Bike"
                    containerClassName="h-full w-full"
                    className="h-full w-full"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                </div>
              </div>
            ) : (
              <EmptyState icon={Grid3X3} title="No media" description="This rider hasn't uploaded any photos yet." />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Safety Actions */}
      {!isMeRoute && (
        <div className="surface-card p-4">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}
    </VStack>
  );
}

function StatPill({ icon: Icon, label, value, isLoading }) {
  return (
    <div className="flex-1 surface-card p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <Text variant="bodySm" className="font-bold truncate">
        {isLoading ? '—' : value}
      </Text>
      <Text variant="micro" color="muted">{label}</Text>
    </div>
  );
}
