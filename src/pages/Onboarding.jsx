import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { prepareLocalImage, getImagePreview, uploadImageIfNeeded } from '@/lib/localImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RRLogo from '@/components/RRLogo';
import BikePhotoUploader from '@/components/profile/BikePhotoUploader';

export default function Onboarding() {
  const { user, profile, refreshProfile } = useSupabaseAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    displayName: profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    bio: profile?.bio || '',
    avatar: profile?.avatar_url || '',
    bikeYear: profile?.bike_year || '',
    bikeMake: profile?.bike_make || '',
    bikeModel: profile?.bike_model || '',
    bikePhoto: profile?.bike_photo_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const localImage = await prepareLocalImage(file, 'avatar');
      setForm({ ...form, avatar: localImage });
      e.target.value = '';
    } catch (error) {
      setUploadError(error?.response?.data?.error || error.message || 'Image validation failed. Please try another image.');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const [avatar_url, bike_photo_url] = await Promise.all([
        uploadImageIfNeeded(form.avatar),
        uploadImageIfNeeded(form.bikePhoto),
      ]);

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: form.displayName.trim() || user.email,
          bio: form.bio.trim(),
          avatar_url,
          bike_year: form.bikeYear ? Number(form.bikeYear) : null,
          bike_make: form.bikeMake.trim(),
          bike_model: form.bikeModel.trim(),
          bike_photo_url,
          is_public: true,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile'] });
      navigate('/home', { replace: true });
    },
  });

  const hasBike = form.bikeMake.trim().length > 1 && form.bikeModel.trim().length > 1;
  const canSubmit =
    form.displayName.trim().length >= 2 &&
    form.bio.trim().length >= 10 &&
    !!form.avatar &&
    hasBike;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-5 py-8">
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.5))]" />

      <div className="relative z-10 w-full max-w-md rounded-[1.7rem] rr-surface-strong px-6 py-8">
        <div className="mb-7 flex items-center gap-2.5">
          <RRLogo size="md" />
          <span className="font-display text-xl font-bold tracking-tight">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>

        <div className="rr-chip mb-4"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Rider profile</div>
        <h1 className="rr-heading mb-1 text-4xl text-foreground">Set up your profile</h1>
        <p className="mb-6 text-sm text-muted-foreground">Add the details other riders expect to see before you enter the network.</p>

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Profile picture *
            </Label>
            <div className="flex items-center gap-4">
              {getImagePreview(form.avatar) ? (
                <img src={getImagePreview(form.avatar)} className="h-16 w-16 rounded-2xl border border-border object-cover" alt="" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/50 font-display text-xl font-bold text-muted-foreground">
                  {form.displayName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <label className="cursor-pointer rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:text-primary/80">
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                {uploading ? 'Preparing...' : 'Upload picture'}
              </label>
            </div>
            {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Display name *
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="How riders see you"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bio *
            </Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Your riding style, local area, and what kind of rides you like."
              maxLength={220}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Year
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.bikeYear}
                onChange={(e) => setForm({ ...form, bikeYear: e.target.value })}
                placeholder="2024"
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bike make *
              </Label>
              <Input
                value={form.bikeMake}
                onChange={(e) => setForm({ ...form, bikeMake: e.target.value })}
                placeholder="Yamaha"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bike model *
            </Label>
            <Input
              value={form.bikeModel}
              onChange={(e) => setForm({ ...form, bikeModel: e.target.value })}
              placeholder="MT-09"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bike photo
            </Label>
            <BikePhotoUploader image={form.bikePhoto} onChange={(bikePhoto) => setForm({ ...form, bikePhoto })} />
          </div>

          {saveProfile.isError && (
            <p className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              {saveProfile.error?.message || 'Failed to create profile'}
            </p>
          )}

          <Button
            onClick={() => saveProfile.mutate()}
            disabled={!canSubmit || saveProfile.isPending}
            className="h-12 w-full rounded-full text-base font-semibold glow-green"
          >
            {saveProfile.isPending ? 'Creating profile...' : 'Join the network'}
          </Button>
        </div>
      </div>
    </div>
  );
}
