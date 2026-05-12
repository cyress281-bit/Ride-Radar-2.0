/**
 * Public / private profile view for another rider.
 *
 * URL param: :userId
 * Privacy-aware: hides details for private profiles unless connected.
 * Supports friend request, chat, and block actions.
 * Electric Neon Green redesign.
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
import { RideCard } from '@/components/shared/RideCard';
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
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 pressable self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-surface/80 border border-white/[0.06] shadow-[0_8px_32px_hsl(var(--primary)/0.04)]">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-brand-radar/[0.06] blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <VStack align="center" gap={3}>
            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="rr-avatar-ring animate-glow-pulse">
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-brand-radar/20 to-brand-amber/20 font-display text-3xl font-bold text-primary">
                    {canSeeDetails ? profile.display_name?.[0]?.toUpperCase() || '?' : '?'}
                  </div>
                )}
              </div>
              {canSeeDetails && (
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
              )}
            </div>

            {/* Name & Username */}
            <VStack align="center" gap={0.5}>
              <HStack align="center" gap={2}>
                <Text as="h1" variant="h2" color="default" align="center" className={cn(canSeeDetails && 'rr-neon-green')}>
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
                <Text variant="bodySm" color="muted">@{profile.username}</Text>
              )}
            </VStack>

            {/* Connection Status */}
            {isBlocked && (
              <HStack align="center" gap={1.5} className="px-3 py-1.5 rounded-full bg-brand-emergency/10 border border-brand-emergency/20">
                <Ban className="w-3.5 h-3.5 text-brand-emergency" />
                <Text variant="micro" className="text-brand-emergency font-semibold">Blocked</Text>
              </HStack>
            )}

            {/* Stats Row — neon brand colors */}
            {canSeeDetails && (
              <HStack gap={2} className="w-full mt-1">
                <StatPill icon={Radio} label="Broadcasts" value={activeBroadcasts.length} isLoading={isBroadcastsLoading} brand="green" />
                <StatPill icon={Bike} label="Bike" value={bikeLabel || 'Not set'} brand="radar" />
                <StatPill icon={ShieldCheck} label="Status" value={profile.is_public === false ? 'Private' : 'Public'} brand="amber" />
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
                      'bg-brand-radar text-primary-foreground px-5 py-2.5 text-sm font-bold',
                      'transition-all hover:bg-brand-radar/90 pressable',
                      'shadow-[0_4px_20px_hsl(var(--brand-radar)/0.35)]',
                      'disabled:opacity-50'
                    )}
                  >
                    <MessageCircle className="h-4 w-4" /> Message
                  </button>
                ) : isPending ? (
                  <button
                    disabled
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 rounded-full border border-brand-amber/30',
                      'bg-brand-amber/10 px-5 py-2.5 text-sm font-semibold text-brand-amber',
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
                      'bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold',
                      'transition-all hover:bg-primary/90 pressable',
                      'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]',
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
      </div>

      {/* Private notice */}
      {!canSeeDetails && (
        <div className="surface-card p-6 text-center border border-brand-amber/20 rounded-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-amber/10 border border-brand-amber/20 shadow-[0_0_16px_hsl(var(--brand-amber)/0.12)]">
            <Lock className="h-7 w-7 text-brand-amber" />
          </div>
          <Text variant="bodySm" className="font-semibold text-brand-amber mb-1">Private Profile</Text>
          <Text variant="caption" color="muted">
            This profile is private. Add them as a friend to see more details.
          </Text>
        </div>
      )}

      {/* Tabs — only shown when details are visible */}
      {canSeeDetails && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-surface/60 border border-white/[0.06] backdrop-blur-xl">
            <TabsTrigger value="broadcasts" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
              <Radio className="w-3.5 h-3.5" /> Broadcasts
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
              <User className="w-3.5 h-3.5" /> About
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
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
                  <RideCard key={b.id} broadcast={b} author={profile} to={`/broadcast/${b.id}`} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Radio} title="No active broadcasts" description="This rider has no active signals." />
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <VStack gap={3} className="stagger-children">
              {bikeLabel && (
                <div className="surface-card p-4 border-l-2 border-l-primary rounded-r-xl">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.12)]">
                      <Bike className="h-5 w-5 text-primary" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">Machine</Text>
                      <Text variant="bodySm" className="font-semibold">{bikeLabel}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {profile?.location && (
                <div className="surface-card p-4 border-l-2 border-l-brand-radar rounded-r-xl">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-radar/20 bg-brand-radar/10 shadow-[0_0_12px_hsl(var(--brand-radar)/0.12)]">
                      <MapPin className="h-5 w-5 text-brand-radar" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" className="text-brand-radar font-bold uppercase tracking-wider">Location</Text>
                      <Text variant="bodySm" className="font-semibold">{profile.location}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {joinDate && (
                <div className="surface-card p-4 border-l-2 border-l-brand-amber rounded-r-xl">
                  <HStack align="center" gap={3}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-amber/20 bg-brand-amber/10 shadow-[0_0_12px_hsl(var(--brand-amber)/0.12)]">
                      <Calendar className="h-5 w-5 text-brand-amber" />
                    </div>
                    <VStack gap={0.5}>
                      <Text variant="micro" className="text-brand-amber font-bold uppercase tracking-wider">Joined</Text>
                      <Text variant="bodySm" className="font-semibold">{joinDate}</Text>
                    </VStack>
                  </HStack>
                </div>
              )}

              {profile?.bio && (
                <div className="surface-card p-4 border-l-2 border-l-white/[0.08] rounded-r-xl">
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
                <div className="surface-card overflow-hidden aspect-square group relative rounded-xl">
                  <OptimizedImage
                    src={profile.bike_photo_url}
                    alt="Bike"
                    containerClassName="h-full w-full"
                    className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Text variant="caption" className="text-white font-semibold">{bikeLabel || 'Bike'}</Text>
                  </div>
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
        <div className="surface-card p-4 rounded-xl border border-white/[0.06]">
          <SafetyActions targetType="user" targetId={profile.user_id} targetProfileId={profile.user_id} />
        </div>
      )}
    </VStack>
  );
}

const BRAND_STYLES = {
  green:  { border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary', glow: 'shadow-[0_0_12px_hsl(var(--primary)/0.15)]' },
  radar:  { border: 'border-brand-radar/20', bg: 'bg-brand-radar/10', text: 'text-brand-radar', glow: 'shadow-[0_0_12px_hsl(var(--brand-radar)/0.15)]' },
  amber:  { border: 'border-brand-amber/20', bg: 'bg-brand-amber/10', text: 'text-brand-amber', glow: 'shadow-[0_0_12px_hsl(var(--brand-amber)/0.15)]' },
};

function StatPill({ icon: Icon, label, value, isLoading, brand = 'green' }) {
  const style = BRAND_STYLES[brand];
  return (
    <div className="flex-1 surface-card p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', style.border, style.bg, style.glow)}>
          <Icon className={cn('h-3.5 w-3.5', style.text)} />
        </div>
      </div>
      <Text variant="bodySm" className={cn('font-bold truncate', style.text)}>
        {isLoading ? '—' : value}
      </Text>
      <Text variant="micro" color="muted">{label}</Text>
    </div>
  );
}
