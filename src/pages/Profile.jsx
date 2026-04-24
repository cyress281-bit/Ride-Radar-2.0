import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, LogOut, Edit2, Check, X, Bike, MapPin, Loader2 } from 'lucide-react';
import BroadcastCard from '@/components/broadcast/BroadcastCard';
import { isExpired } from '@/lib/broadcastUtils';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { data: profile } = useMyProfile();
  const { data: user } = useCurrentUser();
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: myBroadcasts = [] } = useQuery({
    queryKey: ['myBroadcasts', profile?.id],
    enabled: !!profile,
    queryFn: async () => await base44.entities.Broadcast.filter({ authorId: profile.id }, '-created_date', 50),
  });

  if (!profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const active = myBroadcasts.filter((b) => b.status === 'active' && !isExpired(b));

  return (
    <div className="px-5 pt-6">
      {editing ? (
        <ProfileEdit profile={profile} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="flex items-start gap-5 mb-8 bg-card/40 backdrop-blur-xl p-5 rounded-3xl border border-border/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            {profile.avatar ? (
              <img src={profile.avatar} className="w-20 h-20 rounded-2xl object-cover border border-border/50 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] z-10 border border-primary/20">
                {profile.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 pt-1 z-10">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">{profile.displayName}</h1>
                {user?.role === 'admin' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded shadow-sm">Admin</span>
                )}
              </div>
              {profile.location && <div className="text-xs text-muted-foreground mt-1 font-medium">{profile.location}</div>}
            </div>
            <button onClick={() => setEditing(true)} className="p-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all z-10 border border-border/50 shadow-sm">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {profile.bio && <p className="text-[15px] mb-5 leading-relaxed text-foreground/90">{profile.bio}</p>}

          {profile.bike && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/50 text-sm shadow-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bike className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">{profile.bike}</span>
              {profile.rideStyle && <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/80 px-2 py-1 rounded-md">{profile.rideStyle}</span>}
            </div>
          )}

          <div className="flex gap-2 mb-8">
            <Link to="/settings" className="flex-1">
              <Button variant="outline" className="w-full rounded-full"><Settings className="w-4 h-4 mr-1.5" />Settings</Button>
            </Link>
            <Button variant="outline" className="rounded-full" onClick={() => logout(true)}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active broadcasts</h2>
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

function ProfileEdit({ profile, onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...profile });
  const [uploading, setUploading] = useState(false);
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
        avatar: form.avatar,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myProfile'] }); onDone(); },
  });

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, avatar: file_url });
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