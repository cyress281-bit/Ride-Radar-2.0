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
import { Edit2, Settings, Radio, ShieldCheck, Images } from 'lucide-react';
import { useProfileLike } from '@/features/profile/hooks/use-profile-like.js';
import { Badge } from '@/components/shared/Badge';
import { isExpired, timeAgo } from '@/lib/broadcastUtils';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useBroadcastsByAuthor } from '@/features/broadcast/hooks/use-broadcasts.js';
import { getFriendshipsCount } from '@/features/connections/api/connections-api.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { useUserPosts } from '@/features/profile/hooks/use-user-posts';
import { logger } from '@/lib/logger';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects';
import PostGrid from '@/features/profile/components/PostGrid';
import PostCreateSheet from '@/features/profile/components/PostCreateSheet';
import PostDetailSheet from '@/features/profile/components/PostDetailSheet';
import ProfileBikePhotoCard from '@/features/profile/components/ProfileBikePhotoCard.jsx';
import { supabase } from '@/lib/supabase.js';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';
import { withRoutePreload, preloadSettings, preloadBroadcastDetail } from '@/lib/routePreload.js';
import { prefetchSettings } from '@/lib/query-client.js';
import ProfileIdentitySection from '@/features/profile/components/ProfileIdentitySection.jsx';
import {
  profileAmbientTopStyle,
  profileAmbientBottomStyle,
  profileTabsListClass,
  profileTabsTriggerClass,
} from '@/features/profile/constants/profileStyles.js';

function ProfilePage() {
  const { user, profile } = useAuthState();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url, user?.id]);

  const [activeTab, setActiveTab] = useState('media');
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
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[ProfilePage] Realtime disconnected (expected reconnect)', { status });
          } else {
            logger.error('[ProfilePage] Realtime subscription error:', err);
          }
        }
      });

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

  const { likeCount } = useProfileLike(user?.id);

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

  const bikePillLabel = useMemo(() => {
    return [displayProfile?.bike_make, displayProfile?.bike_model].filter(Boolean).join(' ') || null;
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

  return (
    <VStack gap={6} className="relative isolate mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-100" style={profileAmbientTopStyle} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[12rem]" style={profileAmbientBottomStyle} />

      {/* Identity */}
      <div className="relative pt-2 pb-6 border-b border-white/[0.06]">
          <Link
            to="/settings"
            aria-label="Settings"
            className={cn(
              'absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full',
              'border border-white/[0.10] bg-black/20 text-muted-foreground backdrop-blur-xl shadow-[0_10px_24px_hsl(0_0%_0%/0.18)]',
              'transition-all hover:border-primary/30 hover:bg-primary/[0.08] hover:text-primary active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
            {...withRoutePreload(preloadSettings, () => prefetchSettings(qc, user?.id))}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <ProfileIdentitySection
            profile={displayProfile}
            displayName={displayProfile?.display_name || user?.email}
            avatarError={avatarError}
            onAvatarError={() => setAvatarError(true)}
            likeCount={likeCount}
            connectionsCount={connectionsCount}
            connectionsLoading={connectionsLoading}
            onCrewPress={() => navigate('/messages', { state: { tab: 'crew' } })}
            bikePillLabel={bikePillLabel}
          />

          {/* Edit Profile — own profile only */}
          <div className="mt-1 flex w-full justify-center">
            <button
              onClick={() => navigate('/profile/edit')}
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
            <EmptyState
              icon={Radio}
              title="No active signals"
              description="Your active ride signals will appear here."
              className="border-white/[0.08] bg-transparent"
            />
          ) : (
            <>
              <div className="divide-y divide-white/[0.06]">
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
          ) : (
            <PostGrid
              posts={posts}
              onPostClick={setSelectedPost}
              currentUserId={user?.id}
              onAddPost={() => setCreateSheetOpen(true)}
            />
          )}

          {createSheetOpen && (
            <PostCreateSheet
              open={createSheetOpen}
              onClose={() => setCreateSheetOpen(false)}
              userId={user?.id}
            />
          )}

          {selectedPost && (
            <PostDetailSheet
              post={selectedPost}
              onClose={() => setSelectedPost(null)}
              userId={user?.id}
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
      {...withRoutePreload(preloadBroadcastDetail)}
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
