import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Radio } from 'lucide-react';

export default function Onboarding() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    username: '',
    displayName: user?.full_name || '',
    bio: '',
    location: '',
    rideStyle: 'street',
    bike: '',
  });

  const create = useMutation({
    mutationFn: async () => {
      // Check username uniqueness
      const existing = await base44.entities.UserProfile.filter({ username: form.username });
      if (existing.length > 0) throw new Error('Username taken');
      await base44.entities.UserProfile.create({ ...form, isPublic: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myProfile'] });
      navigate('/home');
    },
  });

  const canSubmit = form.username.trim().length >= 3 && form.displayName.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background noise px-5 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Ride Radar</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Set up your profile</h1>
        <p className="text-muted-foreground mb-8">Takes a minute. You can edit anything later.</p>

        <div className="space-y-5">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder="rider_handle"
              className="mt-1.5"
              maxLength={24}
            />
            <p className="text-xs text-muted-foreground mt-1.5">Lowercase, letters/numbers/underscore. Min 3.</p>
          </div>
          <div>
            <Label htmlFor="displayName">Display name *</Label>
            <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="location">Location (city / region)</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Denver, CO" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bike">Bike</Label>
            <Input id="bike" value={form.bike} onChange={(e) => setForm({ ...form, bike: e.target.value })} placeholder="2022 Triumph Speed Triple" className="mt-1.5" />
          </div>
          <div>
            <Label>Ride style</Label>
            <Select value={form.rideStyle} onValueChange={(v) => setForm({ ...form, rideStyle: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['street', 'sport', 'cruiser', 'adventure', 'touring', 'offroad', 'track', 'other'].map(s => (
                  <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A little about your ride..." className="mt-1.5" maxLength={200} />
          </div>

          {create.isError && <p className="text-sm text-destructive">{create.error.message}</p>}

          <Button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending} className="w-full h-11 rounded-full">
            {create.isPending ? 'Creating...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}