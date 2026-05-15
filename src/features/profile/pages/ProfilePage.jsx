/**
 * Own profile view — Electric Neon Green redesign.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { Edit2, Settings, LogOut, Radio, Users, ShieldCheck, Bike, MapPin, Calendar, Grid3X3, User } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { isExpired, timeAgo } from '@/lib/broadcastUtils';
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
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

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
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up">
        <ProfileEditForm profile={displayProfile} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up">
      {/* Identity Card */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-surface/80 border border-white/[0.06] shadow-[0_8px_32px_hsl(var(--primary)/0.04)]">
        {/* Subtle radial glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-brand-radar/[0.06] blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <VStack align="center" gap={3}>
            {/* Avatar with neon green ring */}
            <div className="relative">
              <div className="rr-avatar-ring animate-glow-pulse">
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
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-brand-radar/20 to-brand-amber/20 font-display text-3xl font-bold text-primary">
                    {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
            </div>

            {/* Name & Username */}
            <VStack align="center" gap={0.5}>
              <Text as="h1" variant="h2" color="default" align="center" className="rr-neon-green">
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

            {/* Stats Row — neon brand colors */}
            <HStack gap={2} className="w-full mt-1">
              <StatPill
                icon={Radio}
                label="Signals"
                value={active.length}
                isLoading={broadcastsLoading}
                brand="green"
              />
              <StatPill
                icon={Users}
                label="Crew"
                value={connectionsCount}
                isLoading={connectionsLoading}
                brand="radar"
              />
              <StatPill
                icon={ShieldCheck}
                label="Status"
                value={displayProfile?.is_public === false ? 'Private' : 'Public'}
                brand="amber"
              />
            </HStack>

            {/* Action Buttons */}
            <HStack gap={3} className="w-full mt-1">
              <button
                onClick={() => setEditing(true)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-full',
                  'bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground',
                  'transition-all hover:bg-primary/90 active:scale-95',
                  'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]'
                )}
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
              <Link to="/settings" className="shrink-0">
                <button
                  aria-label="Settings"
                  className={cn(
                    'h-11 w-11 rounded-full border border-brand-radar/30 bg-brand-radar/10',
                    'flex items-center justify-center text-brand-radar',
                    'transition-all hover:bg-brand-radar/20 active:scale-95',
                    'shadow-[0_0_12px_hsl(var(--brand-radar)/0.15)]'
                  )}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-label="Sign out"
                className={cn(
                  'h-11 w-11 rounded-full border border-brand-emergency/30 bg-brand-emergency/10',
                  'flex items-center justify-center text-brand-emergency',
                  'transition-all hover:bg-brand-emergency/20 active:scale-95',
                  'shadow-[0_0_12px_hsl(var(--brand-emergency)/0.15)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </HStack>
          </VStack>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-surface/60 border border-white/[0.06] backdrop-blur-xl">
          <TabsTrigger value="broadcasts" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
            <Radio className="w-3.5 h-3.5" /> Signals
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
            <User className="w-3.5 h-3.5" /> About
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
            <Grid3X3 className="w-3.5 h-3.5" /> Posts
          </TabsTrigger>
        </TabsList>

        {/* Broadcasts Tab */}
        <TabsContent value="broadcasts" className="mt-4">
          {broadcastsLoading ? (
            <LoadingState variant="section" message="Loading signals..." />
          ) : broadcastsFailed ? (
            <ErrorState
              title="Signals unavailable"
              message={broadcastsError?.message || 'Your profile is available, but active signals could not be loaded.'}
              onRetry={refetchBroadcasts}
            />
          ) : active.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No active signals"
              description="Your active ride signals will appear here."
            />
          ) : (
            <>
              <div className="surface-card overflow-hidden divide-y divide-white/[0.06] rounded-xl">
                {active.slice(0, 5).map((b) => (
                  <SignalRow key={b.id} broadcast={b} />
                ))}
              </div>
              {active.length > 5 && (
                <Text variant="micro" color="muted" className="block text-center mt-3">
                  +{active.length - 5} more active signal{active.length - 5 === 1 ? '' : 's'} not shown
                </Text>
              )}
            </>
          )}
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="mt-4">
          <VStack gap={3} className="stagger-children">
            {bikeLabel && (
              <div className="surface-card p-4 border-l-2 border-l-primary rounded-r-xl">
                <HStack align="center" gap={3}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.12)]">
                    <Bike className="h-5 w-5 text-primary" />
                  </div>
                  <VStack gap={0.5}>
                    <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">Bike</Text>
                    <Text variant="bodySm" className="font-semibold">{bikeLabel}</Text>
                  </VStack>
                </HStack>
              </div>
            )}

            {displayProfile?.location && (
              <div className="surface-card p-4 border-l-2 border-l-brand-radar rounded-r-xl">
                <HStack align="center" gap={3}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-radar/20 bg-brand-radar/10 shadow-[0_0_12px_hsl(var(--brand-radar)/0.12)]">
                    <MapPin className="h-5 w-5 text-brand-radar" />
                  </div>
                  <VStack gap={0.5}>
                    <Text variant="micro" className="text-brand-radar font-bold uppercase tracking-wider">Location</Text>
                    <Text variant="bodySm" className="font-semibold">{displayProfile.location}</Text>
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

            {!bikeLabel && !displayProfile?.location && !joinDate && (
              <EmptyState
                icon={User}
                title="About you"
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
              <div className="surface-card overflow-hidden aspect-square group relative rounded-xl">
                <OptimizedImage
                  src={displayProfile.bike_photo_url}
                  alt="Bike"
                  containerClassName="h-full w-full"
                  className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  objectFit="cover"
                  loading="lazy"
                  showSkeleton
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Text variant="caption" className="text-white font-semibold">{bikeLabel || 'My Bike'}</Text>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Grid3X3}
              title="No posts yet"
              description="Share bike photos, ride moments, or group pictures here."
            />
          )}
        </TabsContent>
      </Tabs>
    </VStack>
  );
}

const BRAND_STYLES = {
  green:  { border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary', glow: 'shadow-[0_0_12px_hsl(var(--primary)/0.15)]' },
  radar:  { border: 'border-brand-radar/20', bg: 'bg-brand-radar/10', text: 'text-brand-radar', glow: 'shadow-[0_0_12px_hsl(var(--brand-radar)/0.15)]' },
  amber:  { border: 'border-brand-amber/20', bg: 'bg-brand-amber/10', text: 'text-brand-amber', glow: 'shadow-[0_0_12px_hsl(var(--brand-amber)/0.15)]' },
};

const StatPill = memo(function StatPill({ icon: Icon, label, value, isLoading, brand = 'green' }) {
  const style = BRAND_STYLES[brand];
  return (
    <div className="flex-1 surface-card p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border', style.border, style.bg, style.glow)}>
          <Icon className={cn('h-3.5 w-3.5', style.text)} />
        </div>
      </div>
      <Text variant="bodySm" className={cn('block font-bold', style.text)}>
        {isLoading ? '—' : value}
      </Text>
      <Text variant="micro" color="muted" className="block">{label}</Text>
    </div>
  );
});

const SignalRow = memo(function SignalRow({ broadcast: b }) {
  const detail = b.location_name || b.body || null;
  return (
    <Link
      to={`/broadcast/${b.id}`}
      className="flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
    >
      <Badge type={b.type} alertType={b.alert_type} className="shrink-0" />
      <VStack gap={0} className="min-w-0 flex-1">
        <Text variant="bodySm" className="font-semibold line-clamp-1">{b.title}</Text>
        {detail && (
          <Text variant="micro" color="muted" className="block line-clamp-1 mt-0.5">{detail}</Text>
        )}
      </VStack>
      <Text variant="micro" color="muted" className="shrink-0 tabular-nums">{timeAgo(b.created_at)}</Text>
    </Link>
  );
});

export default memo(ProfilePage);
