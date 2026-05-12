/**
 * Own profile view.
 *
 * Displays identity card with metrics, bio, bike info, active broadcasts,
 * and supports inline editing via ProfileEditForm.
 */

import { useState, useMemo, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, Edit2, Radio, Bike, ShieldCheck, Users } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import BroadcastCard from '@/components/shared/BroadcastCard';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { isExpired } from '@/lib/broadcastUtils';
import { LoadingState } from '@/components/shared/LoadingState';
import { getBroadcastsByAuthor } from '@/features/broadcast/api/broadcast-api.js';
import { getFriendshipsCount } from '@/features/connections/api/connections-api.js';

function ProfilePage() {
  const { user, profile } = useAuthState();
  const { signOut } = useAuthActions();
  const [editing, setEditing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const {
    data: myBroadcasts = [],
    isError: broadcastsFailed,
    error: broadcastsError,
  } = useQuery({
    queryKey: ['myBroadcasts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await getBroadcastsByAuthor(user.id, 50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: connectionsCount = 0 } = useQuery({
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

  return (
    <div className="mx-auto max-w-2xl px-5 pt-5 pb-8">
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ProfileEditForm profile={displayProfile} onDone={() => setEditing(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile Header */}
            <div className="relative mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6">
              <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
              <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  {displayProfile?.avatar_url && !avatarError ? (
                    <div className="rounded-full bg-gradient-to-br from-primary/40 to-primary/10 p-[3px] shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
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
                    </div>
                  ) : (
                    <div className="rounded-full bg-gradient-to-br from-primary/40 to-primary/10 p-[3px] shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-display text-3xl font-bold text-primary-foreground">
                        {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    </div>
                  )}
                  {/* Online indicator */}
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-[hsl(220_20%_7%)] bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                </div>

                {/* Name & Username */}
                <h1 className="font-display text-[clamp(1.25rem,5vw,1.75rem)] font-extrabold leading-tight tracking-[-0.04em]">
                  {displayProfile?.display_name || user?.email}
                </h1>
                {displayProfile?.username && (
                  <p className="mt-1 text-sm text-muted-foreground">@{displayProfile.username}</p>
                )}

                {/* Edit button */}
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 min-h-[44px]"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </button>
              </div>

              {/* Stats Row */}
              <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
                <RiderMetric icon={Radio} label="Signals" value={active.length} />
                <RiderMetric icon={Users} label="Pack" value={connectionsCount} />
                <RiderMetric icon={ShieldCheck} label="Status" value={displayProfile?.is_public === false ? 'Private' : 'Public'} />
              </div>
            </div>

            {/* Bio Card */}
            {displayProfile?.bio && (
              <div className="mb-4 rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Rider note</div>
                <p className="text-[15px] leading-relaxed text-foreground/90">{displayProfile.bio}</p>
              </div>
            )}

            {/* Bike Info Card */}
            {bikeLabel && (
              <div className="mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)]">
                {displayProfile.bike_photo_url && (
                  <div className="relative h-48 border-b border-border/60 bg-background/40">
                    <OptimizedImage
                      src={displayProfile.bike_photo_url}
                      alt="Bike"
                      containerClassName="h-full w-full"
                      objectFit="cover"
                      loading="lazy"
                      showSkeleton
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Machine</div>
                      <div className="font-display text-lg font-bold text-white drop-shadow-lg">{bikeLabel}</div>
                    </div>
                  </div>
                )}
                {!displayProfile.bike_photo_url && (
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

            {/* Action Buttons */}
            <div className="mb-6 flex gap-3">
              <Link to="/settings" className="flex-1">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-full border-border/60 bg-[hsl(220_20%_7%)] transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-95"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-12 w-12 rounded-full border-destructive/30 text-destructive transition-all hover:bg-destructive/10 active:scale-95 flex items-center justify-center"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Signal Log */}
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active broadcasts</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                <span className="h-1.5 w-1.5 animate-pulse-green rounded-full bg-primary" />
                Signal log
              </span>
            </div>
            {broadcastsFailed ? (
              <div className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5 text-sm text-muted-foreground">
                <h3 className="mb-1 font-display text-base font-bold text-foreground">Broadcasts unavailable</h3>
                <p>{broadcastsError?.message || 'Your profile is available, but active broadcasts could not be loaded.'}</p>
              </div>
            ) : active.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
                <RRLogo size="sm" className="mx-auto mb-3 opacity-50" />
                No active broadcasts
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((b) => (
                  <BroadcastCard key={b.id} broadcast={b} author={displayProfile} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const RiderMetric = memo(function RiderMetric({ icon: Icon, label, value }) {
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
});

export default memo(ProfilePage);
