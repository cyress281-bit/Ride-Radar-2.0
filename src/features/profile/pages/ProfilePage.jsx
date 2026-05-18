/**
 * Own profile view — Electric Neon Green redesign.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { Edit2, Settings, LogOut, Radio, Users, ShieldCheck, Bike, Camera, Images } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { isExpired, timeAgo } from '@/lib/broadcastUtils';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useBroadcastsByAuthor } from '@/features/broadcast/hooks/use-broadcasts.js';
import { getFriendshipsCount } from '@/features/connections/api/connections-api.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { useUserPosts } from '@/features/profile/hooks/use-user-posts';
import PostGrid from '@/features/profile/components/PostGrid';
import PostCreateSheet from '@/features/profile/components/PostCreateSheet';
import PostDetailSheet from '@/features/profile/components/PostDetailSheet';
import StatPill from '@/features/profile/components/StatPill.jsx';

function ProfilePage() {
  const { user, profile } = useAuthState();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

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
  } = useBroadcastsByAuthor(user?.id);

  const {
    data: posts = [],
    isLoading: postsLoading,
    isError: postsFailed,
    error: postsError,
    refetch: refetchPosts,
  } = useUserPosts(user?.id);

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
              <div className="rr-avatar-ring">
                {displayProfile?.avatar_url && !avatarError ? (
                  <OptimizedImage
                    src={displayProfile.avatar_url}
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
                    {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>

            {/* Name & Username */}
            <VStack align="center" gap={0.5}>
              <Text as="h1" variant="h2" color="default" align="center" className="font-bold">
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

            {bikeLabel && (
              <HStack align="center" gap={2} className="rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-primary">
                <Bike className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <Text variant="micro" className="font-semibold text-primary truncate">
                  {bikeLabel}
                </Text>
              </HStack>
            )}

            {/* Stats Row — neon brand colors */}
            <HStack gap={2} className="w-full mt-1">
              <StatPill
                icon={Radio}
                label="Signals"
                value={active.length}
                isLoading={broadcastsLoading}
                brand="green"
                onClick={() => setActiveTab('broadcasts')}
              />
              <StatPill
                icon={Users}
                label="Crew"
                value={connectionsCount}
                isLoading={connectionsLoading}
                brand="radar"
                onClick={() => navigate('/messages', { state: { tab: 'crew' } })}
              />
              <StatPill
                icon={ShieldCheck}
                label="Status"
                value={displayProfile?.is_public === false ? 'Private' : 'Public'}
                brand="amber"
                onClick={() => navigate('/settings')}
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
        <TabsList className="w-full grid grid-cols-2 bg-surface/60 border border-white/[0.06] backdrop-blur-xl">
          <TabsTrigger value="broadcasts" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
            <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Signals
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] transition-all">
            <Images className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Shots
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

        {/* Shots Tab */}
        <TabsContent value="media" className="mt-4">
          {postsLoading ? (
            <LoadingState variant="section" message="Loading shots..." />
          ) : postsFailed ? (
            <ErrorState
              title="Shots unavailable"
              message={postsError?.message || 'Could not load shots.'}
              onRetry={refetchPosts}
            />
          ) : posts.length === 0 ? (
            <VStack gap={4}>
              <button
                onClick={() => setCreateSheetOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-full',
                  'bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground',
                  'transition-all hover:bg-primary/90 active:scale-95',
                  'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]'
                )}
              >
                <Camera className="h-4 w-4" />
                Add Shot
              </button>
              <EmptyState
                icon={Images}
                title="No shots yet"
                description="Share bike photos, ride moments, or group shots here."
              />
            </VStack>
          ) : (
            <VStack gap={4}>
              <button
                onClick={() => setCreateSheetOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-full',
                  'bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground',
                  'transition-all hover:bg-primary/90 active:scale-95',
                  'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]'
                )}
              >
                <Camera className="h-4 w-4" />
                Add Shot
              </button>
              <PostGrid
                posts={posts}
                onPostClick={setSelectedPost}
              />
            </VStack>
          )}

          <PostCreateSheet
            open={createSheetOpen}
            onClose={() => setCreateSheetOpen(false)}
            userId={user?.id}
          />

          {selectedPost && (
            <PostDetailSheet
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
              userId={user?.id}
              canDelete
            />
          )}
        </TabsContent>
      </Tabs>
    </VStack>
  );
}

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
