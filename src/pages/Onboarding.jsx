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
    displayName: user?.full_name || '',
    avatar: '',
    location: '',
    bike: '',
  });
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, avatar: file_url });
    } finally { setUploading(false); }
  };

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

      // 2. Auto-generate internal username
      const baseName = user?.full_name ? user.full_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'rider';
      const autoUsername = `${baseName}${Math.floor(Math.random() * 10000)}`;
      
      // 3. Create profile with private full name and auto username
      await base44.entities.UserProfile.create({ 
        ...form, 
        displayName: form.displayName.trim() || user?.full_name || autoUsername,
        isPublic: true, 
        userId: user.id,
        email: user.email,
        fullName: user?.full_name || '',
        username: autoUsername
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

  const canSubmit = form.avatar && form.bike.trim().length > 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-5 py-8">
      {/* Live ambient background */}
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.5))]" />
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/10 ambient-glow" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-[0%] right-[-10%] w-[400px] h-[400px] bg-primary/5 ambient-glow" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10 w-full max-w-md px-6 py-8 rr-surface-strong rounded-[1.7rem] overflow-hidden">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <RRLogo size="md" />
          <span className="font-display font-bold text-xl tracking-tight">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>

        <div className="rr-chip mb-4"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Rider profile</div>
        <h1 className="rr-heading text-4xl mb-1 text-foreground">
          Set up your profile
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">Takes a minute. You can edit anything later.</p>

        <div className="space-y-4">
          {/* Avatar */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Profile Picture *
            </Label>
            <div className="flex items-center gap-4">
              {form.avatar ? (
                <img src={form.avatar} className="w-16 h-16 rounded-2xl object-cover border border-border" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-dashed border-border flex items-center justify-center font-display font-bold text-xl text-muted-foreground">
                  {form.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <label className="text-sm font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                {uploading ? 'Uploading...' : 'Upload picture'}
              </label>
            </div>
          </div>

          {/* Display name */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Display name
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
              Bike *
            </Label>
            <Input
              value={form.bike}
              onChange={(e) => setForm({ ...form, bike: e.target.value })}
              placeholder="2022 Triumph Speed Triple"
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