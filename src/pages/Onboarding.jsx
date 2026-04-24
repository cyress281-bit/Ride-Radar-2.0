import { useState, useEffect } from 'react';
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
import { MapPin, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    detectLocation();
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      // 1. Account-level profile uniqueness validation using stable identity field (email)
      if (user.email) {
        const existingAccountProfile = await base44.entities.UserProfile.filter({ email: user.email });
        if (existingAccountProfile.length > 0) {
          return { existing: true };
        }
      }

      // Fallback check for older profiles that only had userId
      const existingLegacyProfile = await base44.entities.UserProfile.filter({ userId: user.id });
      if (existingLegacyProfile.length > 0) {
        return { existing: true };
      }

      // 2. Username uniqueness validation
      const existingUsername = await base44.entities.UserProfile.filter({ username: form.username });
      if (existingUsername.length > 0) throw new Error('Username taken');
      
      // 3. Create profile
      await base44.entities.UserProfile.create({ 
        ...form, 
        isPublic: true, 
        userId: user.id,
        email: user.email 
      });
      return { existing: false };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['myProfile'] });
      if (data?.existing) {
        // Redirect to home if they already have a profile instead of erroring
        navigate('/home');
      } else {
        navigate('/home');
      }
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
              Approximate Area
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-secondary/30 text-sm text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {detectingLoc ? 'Locating...' : (form.location || 'Location unavailable')}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={detectLocation} 
                disabled={detectingLoc}
                className="shrink-0 rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                {detectingLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Detect'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Privacy-safe: We only save a broad area (e.g. "Dallas area").</p>
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