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
import RRLogo from '@/components/RRLogo';

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Radar grid */}
      <div className="absolute inset-0 radar-grid pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-primary/6 blur-[90px] pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-5 py-10">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-10">
          <RRLogo size="md" />
          <span className="font-display font-bold text-xl tracking-tight">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>

        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1 text-foreground">
          Set up your profile
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">Takes a minute. You can edit anything later.</p>

        <div className="space-y-5">
          {/* Username */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Username *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm">@</span>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="rider_handle"
                className="pl-8"
                maxLength={24}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Lowercase, letters/numbers/underscore. Min 3.</p>
          </div>

          {/* Display name */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Display name *
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="How others see you"
            />
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Location
            </Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Denver, CO"
            />
          </div>

          {/* Bike */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Bike
            </Label>
            <Input
              value={form.bike}
              onChange={(e) => setForm({ ...form, bike: e.target.value })}
              placeholder="2022 Triumph Speed Triple"
            />
          </div>

          {/* Ride style */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Ride style
            </Label>
            <Select value={form.rideStyle} onValueChange={(v) => setForm({ ...form, rideStyle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['street', 'sport', 'cruiser', 'adventure', 'touring', 'offroad', 'track', 'other'].map(s => (
                  <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bio */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Bio
            </Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="A little about your ride..."
              maxLength={200}
              rows={3}
            />
          </div>

          {create.isError && (
            <p className="text-sm text-destructive">{create.error.message}</p>
          )}

          <Button
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
            className="w-full h-12 rounded-full text-base font-semibold glow-green"
          >
            {create.isPending ? 'Creating...' : 'Join the network'}
          </Button>
        </div>
      </div>
    </div>
  );
}