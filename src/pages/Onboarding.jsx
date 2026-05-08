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
import { MOTORCYCLE_MAKES, getModelSuggestions } from '@/lib/motorcycleCatalog';

const currentYear = new Date().getFullYear();
const normalizeBikeYear = (value) => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= currentYear + 1 ? year : null;
};

export default function Onboarding() {
  const { user, profile, refreshProfile } = useSupabaseAuth();
  const navigate = useNavigate();
  const redirectPath = '/home';
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

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: form.displayName.trim() || user.email,
          bio: form.bio.trim(),
          avatar_url,
          bike_year: normalizeBikeYear(form.bikeYear),
          bike_make: form.bikeMake.trim(),
          bike_model: form.bikeModel.trim(),
          bike_photo_url,
          is_public: true,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile'] });
      navigate(redirectPath, { replace: true });
    },
  });

  const modelSuggestions = getModelSuggestions(form.bikeMake);
  const canSubmit = form.displayName.trim().length >= 2;
  const inputClassName = 'rr-premium-input';
  const labelClassName = 'mb-2 block text-xs font-semibold uppercase rr-premium-label';
  const panelClassName = 'rr-glass-panel p-4 rr-stagger';

  return (
    <div className="rr-carbon-bg min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-5 py-8">
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.12),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.58))]" />

      <div className="relative z-10 w-full max-w-md rounded-[1.7rem] rr-premium-shell px-6 py-8">
        <div className="mb-7 flex items-center gap-2.5 rr-stagger" style={{ '--rr-delay': '0ms' }}>
          <span className="rr-led-logo"><RRLogo size="md" /></span>
          <span className="font-display text-2xl font-bold uppercase tracking-[0.04em]">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>

        <div className="rr-chip mb-4 rr-stagger" style={{ '--rr-delay': '80ms' }}><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Rider profile</div>
        <h1 className="rr-aggressive-heading mb-1 text-5xl font-bold leading-none text-foreground rr-stagger" style={{ '--rr-delay': '160ms' }}>Set up your profile</h1>
        <p className="mb-6 text-sm text-muted-foreground rr-stagger" style={{ '--rr-delay': '240ms' }}>Add your rider name now. Bike, photo, and bio details can be finished later.</p>

        <div className="space-y-4">
          <div className={panelClassName} style={{ '--rr-delay': '320ms' }}>
            <Label className="mb-3 block text-xs font-semibold uppercase rr-premium-label">
              Profile picture
            </Label>
            <div className="flex items-center gap-4">
              <span className="rr-avatar-ring shrink-0">
                {getImagePreview(form.avatar) ? (
                  <img src={getImagePreview(form.avatar)} className="relative h-16 w-16 rounded-full border border-primary/30 object-cover" alt="" />
                ) : (
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-[rgba(57,255,20,0.06)] font-display text-2xl font-bold text-primary">
                    {form.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </span>
              <label className="rr-shimmer-button cursor-pointer rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/15 hover:text-primary">
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                {uploading ? 'Preparing...' : 'Upload picture'}
              </label>
            </div>
            {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
          </div>

          <div className={panelClassName} style={{ '--rr-delay': '400ms' }}>
            <Label className={labelClassName}>
              Display name *
            </Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="How riders see you"
              className={inputClassName}
            />
          </div>

          <div className={panelClassName} style={{ '--rr-delay': '480ms' }}>
            <Label className={labelClassName}>
              Bio
            </Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Your riding style, local area, and what kind of rides you like."
              maxLength={220}
              rows={3}
              className={inputClassName}
            />
          </div>

          <div className={`grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 ${panelClassName}`} style={{ '--rr-delay': '560ms' }}>
            <div>
              <Label className={labelClassName}>
                Year
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1900"
                max={currentYear + 1}
                value={form.bikeYear}
                onChange={(e) => setForm({ ...form, bikeYear: e.target.value })}
                placeholder="2024"
                className={inputClassName}
              />
            </div>
            <div>
              <Label className={labelClassName}>
                Bike make
              </Label>
              <Input
                value={form.bikeMake}
                onChange={(e) => setForm({ ...form, bikeMake: e.target.value })}
                placeholder="Yamaha"
                list="onboarding-bike-make-options"
                className={inputClassName}
              />
            </div>
          </div>
          <datalist id="onboarding-bike-make-options">
            {MOTORCYCLE_MAKES.map((make) => (
              <option key={make} value={make} />
            ))}
          </datalist>

          <div className={panelClassName} style={{ '--rr-delay': '640ms' }}>
            <Label className={labelClassName}>
              Bike model
            </Label>
            <Input
              value={form.bikeModel}
              onChange={(e) => setForm({ ...form, bikeModel: e.target.value })}
              placeholder="MT-09"
              list="onboarding-bike-model-options"
              className={inputClassName}
            />
          </div>
          <datalist id="onboarding-bike-model-options">
            {modelSuggestions.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>

          <div className={panelClassName} style={{ '--rr-delay': '720ms' }}>
            <Label className={labelClassName}>
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
            className="rr-shimmer-button h-12 w-full rounded-full text-base font-semibold glow-green rr-stagger"
            style={{ '--rr-delay': '800ms' }}
          >
            {saveProfile.isPending ? 'Creating profile...' : 'Join the network'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(redirectPath, { replace: true })}
            disabled={!canSubmit || saveProfile.isPending}
            className="h-11 w-full rounded-full rr-stagger"
            style={{ '--rr-delay': '880ms' }}
          >
            Finish details later
          </Button>
        </div>
      </div>
    </div>
  );
}
