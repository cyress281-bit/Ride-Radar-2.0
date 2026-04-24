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
import { Settings, LogOut, Edit2, Check, X, Bike } from 'lucide-react';
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
          <div className="flex items-start gap-4 mb-6">
            {profile.avatar ? (
              <img src={profile.avatar} className="w-20 h-20 rounded-2xl object-cover" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground">
                {profile.displayName?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">{profile.displayName}</h1>
                {user?.role === 'admin' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Admin</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">@{profile.username}</div>
              {profile.location && <div className="text-xs text-muted-foreground mt-1">{profile.location}</div>}
            </div>
            <button onClick={() => setEditing(true)} className="p-2 rounded-full hover:bg-secondary">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {profile.bio && <p className="text-[15px] mb-4 leading-relaxed">{profile.bio}</p>}

          {profile.bike && (
            <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-secondary/50 text-sm">
              <Bike className="w-4 h-4 text-muted-foreground" />
              <span>{profile.bike}</span>
              {profile.rideStyle && <span className="ml-auto text-xs text-muted-foreground capitalize">{profile.rideStyle}</span>}
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

  const save = useMutation({
    mutationFn: async () => {
      await base44.entities.UserProfile.update(profile.id, {
        displayName: form.displayName,
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
          <Label>Location</Label>
          <Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1.5" />
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