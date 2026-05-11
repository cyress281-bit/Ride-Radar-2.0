/**
 * Own profile view.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Edit2, Radio, Bike, ShieldCheck, Users } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import BroadcastCard from '@/components/shared/BroadcastCard';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { isExpired } from '@/lib/broadcastUtils';

async function fetchMyBroadcasts(userId) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

async function fetchConnectionsCount(userId) {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error) throw error;
  return count ?? 0;
}

function ProfilePage() {
  const { user, profile } = useAuthState();
  const { signOut } = useAuthActions();
  const [editing, setEditing] = useState(false);

  const {
    data: myBroadcasts = [],
    isError: broadcastsFailed,
    error: broadcastsError,
  } = useQuery({
    queryKey: ['myBroadcasts', user?.id],
    enabled: !!user,
    queryFn: () => fetchMyBroadcasts(user.id),
  });

  const { data: connectionsCount = 0 } = useQuery({
    queryKey: ['connections-count', user?.id],
    enabled: !!user,
    queryFn: () => fetchConnectionsCount(user.id),
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
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="px-5 pt-5 pb-8">
      {editing ? (
        <ProfileEditForm profile={displayProfile} onDone={() => setEditing(false)} />
      ) : (
        <>
          {/* Identity Card */}
          <div className="rr-surface-strong relative mb-4 overflow-hidden rounded-[1.45rem] p-5">
            <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
            <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="relative z-10 flex items-start gap-4">
              {displayProfile?.avatar_url ? (
                <div className="rr-avatar-ring shrink-0">
                  <OptimizedImage
                    src={displayProfile.avatar_url}
                    alt=""
                    containerClassName="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full border border-primary/30 shadow-[0_0_18px_rgba(0,0,0,0.48)]"
                    className="rounded-full"
                    objectFit="cover"
                    loading="eager"
                    fetchPriority="high"
                    fadeInDuration={200}
                    showSkeleton
                  />
                </div>
              ) : (
                <div className="rr-avatar-ring shrink-0">
                  <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary to-primary/70 font-display text-2xl font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.26)]">
                    {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1 pt-1">
                <div className="rr-kicker mb-1">Rider ID</div>
                <div className="flex min-w-0 items-start gap-2">
                  <h1 className="min-w-0 break-words font-display text-[clamp(1.15rem,5vw,1.65rem)] font-extrabold leading-tight tracking-[-0.04em] [overflow-wrap:anywhere]">
                    {displayProfile?.display_name || user?.email}
                  </h1>
                </div>
                {displayProfile?.username && (
                  <p className="mt-0.5 text-xs text-muted-foreground">@{displayProfile.username}</p>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rr-haptic rounded-full border border-border/50 bg-secondary/50 p-2.5 min-h-[44px] min-w-[44px] text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground flex items-center justify-center"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            {/* Dashboard Gauges */}
            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
              <RiderMetric icon={Radio} label="Signals" value={active.length} />
              <RiderMetric icon={Users} label="Pack" value={connectionsCount} />
              <RiderMetric icon={ShieldCheck} label="Status" value={displayProfile?.is_public === false ? 'Private' : 'Public'} />
            </div>
          </div>

          {/* Bio Card */}
          {displayProfile?.bio && (
            <div className="rr-surface mb-3 rounded-2xl p-4">
              <div className="rr-kicker mb-2 text-muted-foreground">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{displayProfile.bio}</p>
            </div>
          )}

          {/* Cinematic Bike Photo */}
          {bikeLabel && (
            <div className="rr-surface mb-4 overflow-hidden rounded-2xl">
              {displayProfile.bike_photo_url && (
                <div className="relative h-44 border-b border-border/60 bg-black/40">
                  <OptimizedImage
                    src={displayProfile.bike_photo_url}
                    alt="Bike"
                    containerClassName="h-full w-full"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="rr-kicker mb-1 text-primary">Machine</div>
                    <div className="font-display text-lg font-bold text-white drop-shadow-lg">{bikeLabel}</div>
                  </div>
                </div>
              )}
              {!displayProfile.bike_photo_url && (
                <div className="flex items-center gap-3 p-4 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <Bike className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">{bikeLabel}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-5 flex gap-2">
            <Link to="/settings" className="flex-1">
              <Button
                variant="outline"
                className="h-11 w-full rounded-full border-primary/20 transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button
              variant="outline"
              className="h-11 w-11 rounded-full border-primary/20 transition-all hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Signal Log */}
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="rr-kicker text-muted-foreground">Active broadcasts</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary" />
              Signal log
            </span>
          </div>
          {broadcastsFailed ? (
            <div className="rr-surface rounded-[20px] p-4 text-sm text-muted-foreground">
              <h3 className="mb-1 font-display text-base font-bold text-foreground">Broadcasts unavailable</h3>
              <p>{broadcastsError?.message || 'Your profile is available, but active broadcasts could not be loaded.'}</p>
            </div>
          ) : active.length === 0 ? (
            <div className="rr-surface rounded-xl border border-dashed border-border/60 bg-transparent py-8 text-center text-sm text-muted-foreground">
              <RRLogo size="sm" className="mx-auto mb-2 opacity-50" />
              No active broadcasts
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((b) => (
                <BroadcastCard key={b.id} broadcast={b} author={displayProfile} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const RiderMetric = memo(function RiderMetric({ icon: Icon, label, value }) {
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
});

export default memo(ProfilePage);


