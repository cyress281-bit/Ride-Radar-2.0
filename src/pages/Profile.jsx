import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { validateImageUpload } from '@/lib/uploadValidation';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, LogOut, Edit2, Check, X, Bike, MapPin, Loader2, Gauge, Radio, ShieldCheck } from 'lucide-react';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import BikePhotoUploader from '@/components/profile/BikePhotoUploader';
import { isExpired } from '@/lib/broadcastUtils';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { data: profile, isError, error } = useMyProfile();
  const { data: user } = useCurrentUser();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: myBroadcasts = [] } = useQuery({
    queryKey: ['myBroadcasts', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Broadcast.filter({ authorId: profile.id }, '-created_date', 50),
  });

  if (isError) {
    return (
      <div className="px-5 pt-6">
        <div className="text-center py-16 rounded-3xl border border-destructive/30 bg-card/40 backdrop-blur-xl mt-8">
          <h3 className="font-display font-bold text-xl mb-2">Profile failed to load</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error?.message || 'Please refresh and try again.'}</p>
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const active = myBroadcasts.filter((b) => b.status === 'active' && !isExpired(b));

  return (
    <div className="px-5 pt-5">
      {editing ? (
        <ProfileEdit profile={profile} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="mb-4 rr-surface-strong p-5 rounded-[1.45rem] relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-primary/15" />
            <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="relative z-10 flex items-start gap-4">
              {profile.avatar ? (
                <img src={profile.avatar} className="w-20 h-20 rounded-2xl object-cover border border-border/50 shadow-[0_0_18px_rgba(0,0,0,0.48)] shrink-0" alt="" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.26)] border border-primary/20 shrink-0">
                  {profile.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 pt-1 min-w-0">
                <div className="rr-kicker mb-1">Rider ID</div>
                <div className="flex items-start gap-2 min-w-0">
                  <h1 className="font-display text-[clamp(1.15rem,5vw,1.65rem)] leading-tight font-extrabold tracking-[-0.04em] break-words [overflow-wrap:anywhere] min-w-0">{profile.displayName}</h1>
                  {user?.role === 'admin' && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded shadow-sm">Admin</span>
                  )}
                </div>
                {profile.location && <div className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{profile.location}</div>}
              </div>
              <button onClick={() => setEditing(true)} className="p-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all border border-border/50 shadow-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
              <RiderMetric icon={Radio} label="Signals" value={active.length} compact />
              <RiderMetric icon={Gauge} label="Style" value={profile.rideStyle || 'street'} compact />
              <RiderMetric icon={ShieldCheck} label="Status" value={profile.isPublic === false ? 'private' : 'public'} compact />
            </div>
          </div>

          {profile.bio && (
            <div className="mb-3 rounded-2xl rr-surface p-4">
              <div className="rr-kicker text-muted-foreground mb-2">Rider note</div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
            </div>
          )}

          {profile.bike && (
            <div className="mb-4 rounded-2xl rr-surface overflow-hidden">
              {profile.bikePhoto && (
                <div className="relative h-36 border-b border-border/60 bg-black/40">
                  <img src={profile.bikePhoto} className="h-full w-full object-cover" alt="Bike" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                </div>
              )}
              <div className="flex items-center gap-3 p-4 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">{profile.bike}</span>
                {profile.rideStyle && <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/80 px-2 py-1 rounded-md">{profile.rideStyle}</span>}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-5">
            <Link to="/settings" className="flex-1">
              <Button variant="outline" className="w-full rounded-full"><Settings className="w-4 h-4 mr-1.5" />Settings</Button>
            </Link>
            <Button variant="outline" className="rounded-full" onClick={() => logout(true)}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="rr-kicker text-muted-foreground">Active broadcasts</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Rider signal</span>
          </div>
          {active.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-xl">
              No active broadcasts
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((b) => <BroadcastCard key={b.id} broadcast={b} author={profile} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RiderMetric({ icon: Icon, label, value, compact }) {
  return (
    <div className={compact ? 'rounded-2xl border border-border/70 bg-black/30 p-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] min-w-0 relative overflow-hidden' : 'rounded-2xl border border-border/70 bg-black/25 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] min-w-0 relative overflow-hidden'}>
      <span className="absolute right-2 top-2 h-1 w-1 rounded-full bg-primary/65" />
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
        <span className="h-5 w-5 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-3.5 h-3.5 drop-shadow-[0_0_4px_currentColor]" />
        </span>
        {label}
      </div>
      <div className="font-display text-sm font-extrabold tracking-[-0.03em] truncate capitalize">{value}</div>
    </div>
  );
}

function ProfileEdit({ profile, onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...profile });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [detectingLoc, setDetectingLoc] = useState(false);

  const detectLocation = () => {
    setDetectingLoc(true);
    if (!navigator.geolocation) {
      setForm(f => ({ ...f, location: 'Location unavailable' }));
      setDetectingLoc(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
          const data = await res.json();
          const area = data.city || data.locality || 'Unknown area';
          const state = data.principalSubdivision || '';
          setForm(f => ({ ...f, location: `${area} area` + (state ? `, ${state}` : '') }));
        } catch (e) {
          setForm(f => ({ ...f, location: 'Location unavailable' }));
        }
        setDetectingLoc(false);
      },
      () => {
        setForm(f => ({ ...f, location: 'Location unavailable' }));
        setDetectingLoc(false);
      },
      { timeout: 10000 }
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      await base44.entities.UserProfile.update(profile.id, {
        displayName: form.displayName || profile.fullName || profile.username,
        bio: form.bio,
        location: form.location,
        rideStyle: form.rideStyle,
        bike: form.bike,
        bikePhoto: form.bikePhoto,
        avatar: form.avatar,
        userId: profile.userId,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myProfile'] }); onDone(); },
  });

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await validateImageUpload(file, 'avatar');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, avatar: file_url });
    } catch (error) {
      setUploadError(error?.response?.data?.error || error.message || 'Image upload failed. Please try another image.');
    } finally { setUploading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Edit profile</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onDone}><X className="w-4 h-4" /></Button>
          <Button size="icon" onClick={() => save.mutate()} disabled={save.isPending}><Check className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {form.avatar ? (
            <img src={form.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center font-bold text-xl">
              {form.displayName?.[0] || '?'}
            </div>
          )}
          <label className="text-sm text-primary hover:underline cursor-pointer">
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            {uploading ? 'Uploading...' : 'Change avatar'}
          </label>
        </div>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        <div>
          <Label>Display name</Label>
          <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Approximate Area</Label>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 rounded-lg border border-input bg-secondary/30 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {detectingLoc ? 'Locating...' : (form.location || 'Location unavailable')}
            </div>
            <Button type="button" variant="outline" onClick={detectLocation} disabled={detectingLoc} className="rounded-lg">
              {detectingLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Detect'}
            </Button>
          </div>
        </div>
        <div>
          <Label>Bike</Label>
          <Input value={form.bike || ''} onChange={(e) => setForm({ ...form, bike: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Bike photo</Label>
          <div className="mt-1.5">
            <BikePhotoUploader image={form.bikePhoto} onChange={(bikePhoto) => setForm({ ...form, bikePhoto })} />
          </div>
        </div>
        <div>
          <Label>Ride style</Label>
          <Select value={form.rideStyle || 'street'} onValueChange={(v) => setForm({ ...form, rideStyle: v })}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['street', 'sport', 'cruiser', 'adventure', 'touring', 'offroad', 'track', 'other'].map(s => (
                <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1.5" maxLength={200} rows={3} />
        </div>
      </div>
    </div>
  );
}