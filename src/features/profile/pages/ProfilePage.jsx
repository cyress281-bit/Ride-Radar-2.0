/**
 * Own profile view — Instagram-style layout.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { Edit2, Settings, LogOut, Radio, Users, ShieldCheck, Bike, MapPin, Calendar, Grid3X3, User } from 'lucide-react';
import { RideCard } from '@/components/shared/RideCard';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { isExpired } from '@/lib/broadcastUtils';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { getBroadcastsByAuthor } from '@/features/broadcast/api/broadcast-api.js';
import { getFriendshipsCount } from '@/features/connections/api/connections-api.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

function ProfilePage() {
  const { user, profile } = useAuthState();
  const { signOut } = useAuthActions();
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');

  const {
    data: myBroadcasts = [],
    isError: broadcastsFailed,
    error: broadcastsError,
    isLoading: broadcastsLoading,
    refetch: refetchBroadcasts,
  } = useQuery({
    queryKey: ['myBroadcasts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await getBroadcastsByAuthor(user.id, 50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: connectionsCount = 0, isLoading: connectionsLoading } = useQuery({
    queryKey: ['connections-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await getFriendshipsCount(user.id);
      if (error) throw error;
      return data;
    },
  });

  const active = useMemo(
    () => (broadcastsFailed ? [] : myBroadcasts.filter((b) => b.status === 'active' && !isExpired(b))),
    [broadcastsFailed, myBroadcasts]
  );

  const displayProfile = useMemo(
    () =>
      profile || {
        user_id: user?.id,
        display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || user?.email || 'Rider',
        bio: '',
        bike_year: '',
        bike_make: '',
        bike_model: '',
        avatar_url: '',
        bike_photo_url: '',
        is_public: true,
        location: '',
        created_at: user?.created_at,
      },
    [profile, user]
  );

  const bikeLabel = useMemo(() => {
    const parts = [displayProfile?.bike_year, displayProfile?.bike_make, displayProfile?.bike_model]
      .filter(Boolean)
      .map(String);
    return parts.join(' ') || null;
  }, [displayProfile]);

  const joinDate = useMemo(() => {
    if (!displayProfile?.created_at && !user?.created_at) return null;
    const date = new Date(displayProfile?.created_at || user?.created_at);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, [displayProfile?.created_at, user?.created_at]);

  if (!user) {
    return <LoadingState variant="section" message="Loading profile..." />;
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-in">
        <ProfileEditForm profile={displayProfile} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="surface-card p-5">
        <VStack align="center" gap={3}>
          {/* Avatar with gradient ring */}
          <div className="relative">
            <div className="rr-avatar-ring">
              {displayProfile?.avatar_url && !avatarError ? (
                <OptimizedImage
                  src={displayProfile.avatar_url}
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
                  {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>

          {/* Name & Username */}
          <VStack align="center" gap={0.5}>
            <Text as="h1" variant="h2" color="default" align="center">
              {displayProfile?.display_name || user?.email}
            </Text>
            {displayProfile?.username && (
              <Text variant="bodySm" color="muted">@{displayProfile.username}</Text>
            )}
          </VStack>

          {/* Bio */}
          {displayProfile?.bio && (
            <Text variant="body" color="default" align="center" className="max-w-sm text-pretty">
              {displayProfile.bio}
            </Text>
          )}

          {/* Stats Row */}
          <HStack gap={2} className="w-full mt-1">
            <StatPill
              icon={Radio}
              label="Broadcasts"
              value={active.length}
              isLoading={broadcastsLoading}
            />
            <StatPill
              icon={Users}
              label="Pack"
              value={connectionsCount}
              isLoading={connectionsLoading}
            />
            <StatPill
              icon={ShieldCheck}
              label="Status"
              value={displayProfile?.is_public === false ? 'Private' : 'Public'}
            />
          </HStack>

          {/* Action Buttons */}
          <HStack gap={3} className="w-full mt-1">
            <button
              onClick={() => setEditing(true)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-full border border-border/60',
                'bg-surface px-5 py-2.5 text-sm font-semibold text-foreground',
                'transition-all hover:bg-surface-elevated hover:border-primary/25 active:scale-95'
              )}
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
            <Link to="/settings" className="shrink-0">
              <button
                className={cn(
                  'h-11 w-11 rounded-full border border-border/60 bg-surface',
                  'flex items-center justify-center text-muted-foreground',
                  'transition-all hover:bg-surface-elevated hover:text-foreground active:scale-95'
                )}
              >
                <Settings className="h-4 w-4" />
              </button>
            </Link>
            <button
              onClick={() => signOut()}
              className={cn(
                'h-11 w-11 rounded-full border border-destructive/30 bg-destructive/5',
                'flex items-center justify-center text-destructive',
                'transition-all hover:bg-destructive/10 active:scale-95'
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </HStack>
        </VStack>
      </div>

      {/* Tabs */}
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

        {/* Broadcasts Tab */}
        <TabsContent value="broadcasts" className="mt-4">
          {broadcastsLoading ? (
            <LoadingState variant="section" message="Loading broadcasts..." />
          ) : broadcastsFailed ? (
            <ErrorState
              title="Broadcasts unavailable"
              message={broadcastsError?.message || 'Your profile is available, but active broadcasts could not be loaded.'}
              onRetry={refetchBroadcasts}
            />
          ) : active.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No active broadcasts"
              description="Your active ride signals will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {active.map((b) => (
                <RideCard key={b.id} broadcast={b} author={displayProfile} to={`/broadcast/${b.id}`} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* About Tab */}
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

            {displayProfile?.location && (
              <div className="surface-card p-4">
                <HStack align="center" gap={3}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-yamaha/20 bg-brand-yamaha/10">
                    <MapPin className="h-5 w-5 text-brand-yamaha" />
                  </div>
                  <VStack gap={0.5}>
                    <Text variant="micro" color="brandYamaha">Location</Text>
                    <Text variant="bodySm" className="font-semibold">{displayProfile.location}</Text>
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

            {!bikeLabel && !displayProfile?.location && !joinDate && (
              <EmptyState
                icon={User}
                title="About section empty"
                description="Edit your profile to add bike info, location, and more."
                action={{ label: 'Edit Profile', onClick: () => setEditing(true) }}
              />
            )}
          </VStack>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="mt-4">
          {displayProfile?.bike_photo_url ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="surface-card overflow-hidden aspect-square">
                <OptimizedImage
                  src={displayProfile.bike_photo_url}
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
            <EmptyState
              icon={Grid3X3}
              title="No media yet"
              description="Upload a bike photo to see it here."
              action={{ label: 'Add Photo', onClick: () => setEditing(true) }}
            />
          )}
        </TabsContent>
      </Tabs>
    </VStack>
  );
}

const StatPill = memo(function StatPill({ icon: Icon, label, value, isLoading }) {
  return (
    <div className="flex-1 surface-card p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <Text variant="bodySm" className="font-bold">
        {isLoading ? '—' : value}
      </Text>
      <Text variant="micro" color="muted">{label}</Text>
    </div>
  );
});

export default memo(ProfilePage);
