/**
 * Own profile view — Electric Neon Green redesign.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { Edit2, Settings, Radio, Users, ShieldCheck, Bike, Camera, Images } from 'lucide-react';
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
import ProfileBikePhotoCard from '@/features/profile/components/ProfileBikePhotoCard.jsx';
import { supabase } from '@/lib/supabase.js';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';

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

function ProfilePage() {
  const { user, profile } = useAuthState();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // DEV: mark that ProfilePage has mounted so layout debug can distinguish bad vs good state
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__rrDebug = window.__rrDebug || {};
    window.__rrDebug.profileHasMounted = true;
  }, []);

  const {
    data: myBroadcasts = [],
    isError: broadcastsFailed,
    error: broadcastsError,
    isLoading: broadcastsLoading,
    refetch: refetchBroadcasts,
  } = useBroadcastsByAuthor(user?.id);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-broadcasts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts',
          filter: `author_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: broadcastKeys.author(user.id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

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
    return (
      <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
        <div className="relative z-10 flex min-h-[50vh] items-center justify-center">
          <LoadingState variant="section" message="Loading profile..." />
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />
        <div className="relative z-10">
          <ProfileEditForm profile={displayProfile} onDone={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <VStack gap={4} className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />

      {/* Identity Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.40),0_0_0_1px_hsl(var(--primary)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)] backdrop-blur-2xl">
        {/* Subtle radial glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-brand-radar/[0.06] blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <Link
            to="/settings"
            aria-label="Settings"
            className={cn(
              'absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full',
              'border border-white/[0.10] bg-black/20 text-muted-foreground backdrop-blur-xl shadow-[0_10px_24px_hsl(0_0%_0%/0.18)]',
              'transition-all hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <VStack align="center" gap={3}>
            {/* Avatar with neon green ring */}
            <div className="relative">
              <div className="rr-avatar-ring shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
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
              <Text as="h1" variant="h2" color="default" align="center" className="font-bold tracking-[-0.03em]">
                {displayProfile?.display_name || user?.email}
              </Text>
              {displayProfile?.username && (
                <Text variant="bodySm" color="muted" className="font-mono-data">
                  @{displayProfile.username}
                </Text>
              )}
            </VStack>

            {/* Bio */}
            {displayProfile?.bio && (
              <Text variant="body" color="default" align="center" className="max-w-sm text-pretty leading-relaxed text-white/88">
                {displayProfile.bio}
              </Text>
            )}

            {bikeLabel && (
              <HStack align="center" gap={2} className="max-w-full min-w-0 rounded-full border border-primary/20 bg-primary/[0.10] px-3 py-1.5 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.10)]">
                <Bike className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                <Text variant="micro" className="min-w-0 truncate font-semibold text-primary">
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

            {/* Action Button */}
            <div className="mt-1 flex w-full justify-center">
              <button
                onClick={() => setEditing(true)}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2.5',
                  'border border-white/[0.10] bg-black/20 text-sm font-bold text-foreground backdrop-blur-xl',
                  'transition-all hover:border-primary/35 hover:bg-primary/[0.08] hover:text-primary active:scale-95',
                  'shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),0_0_18px_hsl(var(--primary)/0.10)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                <Edit2 className="h-4 w-4 text-primary" />
                Edit Profile
              </button>
            </div>
          </VStack>
        </div>
      </div>

      <ProfileBikePhotoCard
        src={displayProfile?.bike_photo_url}
        title="My Bike"
        bikeLabel={bikeLabel}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={profileTabsListClass}>
          <TabsTrigger value="broadcasts" className={profileTabsTriggerClass}>
            <Radio className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> Signals
          </TabsTrigger>
          <TabsTrigger value="media" className={profileTabsTriggerClass}>
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
            <div className="surface-card rounded-2xl border border-white/[0.08] bg-surface/84 p-5 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
              <EmptyState
                icon={Radio}
                title="No active signals"
                description="Your active ride signals will appear here."
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-surface/85 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
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
                  'border border-primary/20 bg-primary/95 px-5 py-2.5 text-sm font-bold text-primary-foreground',
                  'transition-all hover:bg-primary active:scale-95',
                  'shadow-[0_10px_28px_hsl(var(--primary)/0.28)]'
                )}
              >
                <Camera className="h-4 w-4" />
                Add Shot
              </button>
              <div className="surface-card rounded-2xl border border-white/[0.08] bg-surface/84 p-5 shadow-[0_16px_44px_hsl(0_0%_0%/0.28)] backdrop-blur-xl">
                <EmptyState
                  icon={Images}
                  title="No shots yet"
                  description="Share bike photos, ride moments, or group shots here."
                />
              </div>
            </VStack>
          ) : (
            <VStack gap={4}>
              <button
                onClick={() => setCreateSheetOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-full',
                  'border border-primary/20 bg-primary/95 px-5 py-2.5 text-sm font-bold text-primary-foreground',
                  'transition-all hover:bg-primary active:scale-95',
                  'shadow-[0_10px_28px_hsl(var(--primary)/0.28)]'
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
  const isOfficialEvent = b.type === 'event' && b.is_official === true;
  return (
    <Link
      to={`/broadcast/${b.id}`}
      className="group flex min-h-[58px] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.035] active:bg-white/[0.06]"
    >
      <div className="flex shrink-0 flex-col items-start gap-1">
        <Badge type={b.type} alertType={b.alert_type} className="shrink-0" />
        {isOfficialEvent && (
          <span className="inline-flex items-center gap-1 rounded-full border border-event/20 bg-event/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-event">
            <ShieldCheck className="h-3 w-3" />
            Official
          </span>
        )}
      </div>
      <VStack gap={0} className="min-w-0 flex-1">
        <Text variant="bodySm" className="line-clamp-1 font-semibold tracking-tight">
          {b.title}
        </Text>
        {detail && (
          <Text variant="micro" color="muted" className="mt-0.5 block line-clamp-1">
            {detail}
          </Text>
        )}
      </VStack>
      <Text variant="micro" color="muted" className="shrink-0 tabular-nums">
        {timeAgo(b.created_at)}
      </Text>
    </Link>
  );
});

export default memo(ProfilePage);
