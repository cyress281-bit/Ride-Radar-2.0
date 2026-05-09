import { useState, memo, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { prepareLocalImage, getImagePreview, uploadImageIfNeeded } from '@/lib/localImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, Edit2, Check, X, Bike, Radio, ShieldCheck } from 'lucide-react';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import BikePhotoUploader from '@/components/profile/BikePhotoUploader';
import OptimizedImage from '@/components/OptimizedImage';
import { isExpired } from '@/lib/broadcastUtils';

import { Link } from 'react-router-dom';
import { MOTORCYCLE_MAKES, getModelSuggestions } from '@/lib/motorcycleCatalog';

const currentYear = new Date().getFullYear();
const normalizeBikeYear = (value) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= currentYear + 1 ? year : null;
};

const getBroadcastTime = (broadcast) => broadcast?.created_at ?? '';

const sortNewestFirst = (broadcasts) => [...broadcasts].sort((a, b) => (
  new Date(getBroadcastTime(b) || 0).getTime() - new Date(getBroadcastTime(a) || 0).getTime()
));

async function fetchMyBroadcasts(userId) {
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return sortNewestFirst(data || []);
}

export default function Profile() {
  const { user, profile, signOut } = useSupabaseAuth();
  const [editing, setEditing] = useState(false);

  const { data: myBroadcasts = [], isError: broadcastsFailed, error: broadcastsError } = useQuery({
    queryKey: ['myBroadcasts', user?.id],
    enabled: !!user,
    queryFn: () => fetchMyBroadcasts(user.id),
  });

  // Memoize filtered active broadcasts - recalculates only when broadcast data changes,
  // not on editing state toggle. Must be called before early returns (React hooks rule).
  const active = useMemo(
    () => (broadcastsFailed ? [] : myBroadcasts.filter((b) => b.status === 'active' && !isExpired(b))),
    [broadcastsFailed, myBroadcasts]
  );
  const displayProfile = useMemo(() => profile || {
    user_id: user?.id,
    display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || user?.email || 'Rider',
    bio: '',
    bike_year: '',
    bike_make: '',
    bike_model: '',
    avatar_url: '',
    bike_photo_url: '',
    is_public: true,
  }, [profile, user]);
  const bikeLabel = useMemo(() => {
    const parts = [displayProfile?.bike_year, displayProfile?.bike_make, displayProfile?.bike_model]
      .filter(Boolean)
      .map(String);
    return parts.join(' ') || null;
  }, [displayProfile]);

  if (!user) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="px-5 pt-5 pb-8">
      {editing ? (
        <ProfileEdit profile={displayProfile} onDone={() => setEditing(false)} />
      ) : (
        <>
          {/* Identity Card */}
          <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
            <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="relative z-10 flex items-start gap-4">
              {displayProfile?.avatar_url ? (
                <div className="rr-avatar-ring shrink-0">
                  <OptimizedImage
                    src={displayProfile.avatar_url}
                    alt=""
                    containerClassName="w-[4.5rem] h-[4.5rem] rounded-full border border-primary/30 shadow-[0_0_18px_rgba(0,0,0,0.48)] shrink-0"
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
                  <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.26)] border border-primary/20 shrink-0">
                    {displayProfile?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              )}
              <div className="flex-1 pt-1 min-w-0">
                <div className="rr-kicker mb-1">Rider ID</div>
                <div className="flex items-start gap-2 min-w-0">
                  <h1 className="font-display text-[clamp(1.15rem,5vw,1.65rem)] leading-tight font-extrabold tracking-[-0.04em] break-words [overflow-wrap:anywhere] min-w-0">{displayProfile?.display_name || user?.email}</h1>
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="rr-haptic p-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border/50 shadow-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Dashboard Gauges */}
            <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
              <RiderMetric icon={Radio} label="Signals" value={active.length} />
              <RiderMetric icon={Bike} label="Bike" value={bikeLabel || 'Not set'} />
              <RiderMetric icon={ShieldCheck} label="Status" value={displayProfile?.is_public === false ? 'Private' : 'Public'} />
            </div>
          </div>

          {/* Bio Card */}
          {displayProfile?.bio && (
            <div className="mb-3 rounded-2xl rr-surface p-4">
              <div className="rr-kicker text-muted-foreground mb-2">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{displayProfile.bio}</p>
            </div>
          )}

          {/* Cinematic Bike Photo */}
          {bikeLabel && (
            <div className="mb-4 rounded-2xl rr-surface overflow-hidden">
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
                    <div className="rr-kicker text-primary mb-1">Machine</div>
                    <div className="font-display text-lg font-bold text-white drop-shadow-lg">{bikeLabel}</div>
                  </div>
                </div>
              )}
              {!displayProfile.bike_photo_url && (
                <div className="flex items-center gap-3 p-4 text-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Bike className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{bikeLabel}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-5">
            <Link to="/settings" className="flex-1">
              <Button variant="outline" className="w-full rounded-full h-11 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all">
                <Settings className="w-4 h-4 mr-1.5" />Settings
              </Button>
            </Link>
            <Button variant="outline" className="rounded-full h-11 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all" onClick={() => signOut()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Signal Log */}
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="rr-kicker text-muted-foreground">Active broadcasts</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" />
              Signal log
            </span>
          </div>
          {broadcastsFailed ? (
            <div className="rr-surface rounded-[20px] p-4 text-sm text-muted-foreground">
              <h3 className="font-display text-base font-bold text-foreground mb-1">Broadcasts unavailable</h3>
              <p>{broadcastsError?.message || 'Your profile is available, but active broadcasts could not be loaded.'}</p>
            </div>
          ) : active.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border/60 rounded-xl rr-surface bg-transparent">
              <Radio className="w-5 h-5 mx-auto mb-2 text-muted-foreground/50" />
              No active broadcasts
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((b) => <BroadcastCard key={b.id} broadcast={b} author={displayProfile} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Memoized rider metric card - rendered 3x in Profile header.
 * Props (icon, label, value) only change when profile data changes,
 * not on editing state toggle or broadcast list updates.
 */
const RiderMetric = memo(function RiderMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-black/30 p-3 min-w-0 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse-green" />
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
        <span className="h-6 w-6 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-3.5 h-3.5 drop-shadow-[0_0_4px_currentColor]" />
        </span>
        {label}
      </div>
      <div className="font-display text-sm font-extrabold tracking-[-0.03em] truncate capitalize text-foreground">{value}</div>
    </div>
  );
});

function ProfileEdit({ profile, onDone }) {
  const { user, refreshProfile } = useSupabaseAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    bike_year: profile?.bike_year || '',
    bike_make: profile?.bike_make || '',
    bike_model: profile?.bike_model || '',
    avatar_url: profile?.avatar_url || '',
    bike_photo_url: profile?.bike_photo_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const [avatar_url, bike_photo_url] = await Promise.all([
        uploadImageIfNeeded(form.avatar_url),
        uploadImageIfNeeded(form.bike_photo_url),
      ]);

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: form.display_name || user.email,
          bio: form.bio,
          bike_year: normalizeBikeYear(form.bike_year),
          bike_make: form.bike_make.trim(),
          bike_model: form.bike_model.trim(),
          avatar_url,
          bike_photo_url,
          is_public: profile?.is_public !== false,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['myBroadcasts'] });
      onDone();
    },
  });

  const handleAvatar = async ({ target }) => {
    const file = target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const localImage = await prepareLocalImage(file, 'avatar');
      setForm({ ...form, avatar_url: localImage });
    } catch (error) {
      setUploadError(error?.response?.data?.error || error.message || 'Image validation failed. Please try another image.');
    } finally { setUploading(false); }
  };

  const modelSuggestions = getModelSuggestions(form.bike_make);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="rr-kicker mb-1">Identity config</div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Edit profile</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onDone} className="rounded-full border border-border/50"><X className="w-4 h-4" /></Button>
          <Button size="icon" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full glow-green-sm"><Check className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Avatar Upload */}
        <div className="rr-glass-panel p-4">
          <div className="flex items-center gap-4">
            <span className="rr-avatar-ring shrink-0">
              {getImagePreview(form.avatar_url) ? (
                <img src={getImagePreview(form.avatar_url)} className="relative w-16 h-16 rounded-full object-cover border border-primary/30" alt="" />
              ) : (
                <div className="relative flex w-16 h-16 items-center justify-center rounded-full border border-primary/25 bg-[rgba(57,255,20,0.06)] font-display text-2xl font-bold text-primary">
                  {form.display_name?.[0] || '?'}
                </div>
              )}
            </span>
            <label className="rr-shimmer-button flex min-w-0 flex-1 cursor-pointer justify-center rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/15 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/80">
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              {uploading ? 'Preparing...' : 'Change avatar'}
            </label>
          </div>
          {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
        </div>

        {/* Form Fields */}
        <div className="rr-glass-panel p-4 space-y-4">
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Display name</Label>
            <Input 
              value={form.display_name} 
              onChange={(e) => setForm({ ...form, display_name: e.target.value })} 
              className="rr-premium-input rounded-xl" 
            />
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Year</Label>
              <Input type="number" inputMode="numeric" min="1900" max={currentYear + 1} value={form.bike_year || ''} onChange={(e) => setForm({ ...form, bike_year: e.target.value })} className="rr-premium-input rounded-xl" />
            </div>
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Bike make</Label>
              <Input value={form.bike_make || ''} onChange={(e) => setForm({ ...form, bike_make: e.target.value })} className="rr-premium-input rounded-xl" list="profile-bike-make-options" />
            </div>
          </div>
          <datalist id="profile-bike-make-options">
            {MOTORCYCLE_MAKES.map((make) => (
              <option key={make} value={make} />
            ))}
          </datalist>
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Bike model</Label>
            <Input value={form.bike_model || ''} onChange={(e) => setForm({ ...form, bike_model: e.target.value })} className="rr-premium-input rounded-xl" list="profile-bike-model-options" />
          </div>
          <datalist id="profile-bike-model-options">
            {modelSuggestions.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Bike photo</Label>
            <div className="mt-1.5">
              <BikePhotoUploader image={form.bike_photo_url} onChange={(bike_photo_url) => setForm({ ...form, bike_photo_url })} />
            </div>
          </div>
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Bio</Label>
            <Textarea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rr-premium-input rounded-xl" maxLength={200} rows={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
