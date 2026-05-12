/**
 * @fileoverview OnboardingPage - Profile creation for new riders.
 *
 * Collects display name, username, bio, avatar, and bike details.
 * Uploads images via `@/lib/image-utils.js` and upserts the profile row.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth.js';
import {
  prepareLocalImage,
  uploadImage,
} from '@/lib/image-utils.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import RRLogo from '@/components/RRLogo';
import { cn } from '@/lib/utils.js';
import { logger } from '@/lib/logger.js';
import {
  MOTORCYCLE_MAKES,
  getModelSuggestions,
} from '@/lib/motorcycleCatalog.js';
import {
  Check,
  User,
  FileText,
  Bike,
  Camera,
  ImagePlus,
  X,
  AlertCircle,
} from 'lucide-react';

const currentYear = new Date().getFullYear();

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

const onboardingSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be 50 characters or less'),
  username: z
    .string()
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-zA-Z0-9_]*$/, 'Username can only contain letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(220, 'Bio must be 220 characters or less').optional().or(z.literal('')),
  bike_make: z.string().max(50).optional().or(z.literal('')),
  bike_model: z.string().max(50).optional().or(z.literal('')),
  bike_year: z
    .union([z.number().int().min(1900).max(currentYear + 1), z.literal(''), z.nan()])
    .optional()
    .transform((val) => {
      if (val === '' || Number.isNaN(val)) return undefined;
      return val;
    }),
});

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export default function OnboardingPage() {
  const { user, profile, isLoading } = useAuthState();
  const { refreshProfile } = useAuthActions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const redirectPath = '/home';

  // Redirect already-onboarded users away from this page
  useEffect(() => {
    if (!isLoading && profile) {
      navigate(redirectPath, { replace: true });
    }
  }, [isLoading, profile, navigate]);

  const [avatarLocal, setAvatarLocal] = useState(null);
  const [bikePhotoLocal, setBikePhotoLocal] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bikeUploading, setBikeUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      display_name:
        user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
      username: '',
      bio: '',
      bike_make: '',
      bike_model: '',
      bike_year: '',
    },
  });

  const watchBikeMake = form.watch('bike_make');
  const watchDisplayName = form.watch('display_name');

  // ------------------------------------------------------------------
  // Username uniqueness check
  // ------------------------------------------------------------------

  const checkUsernameUnique = useCallback(
    async (username) => {
      const normalized = username?.trim().toLowerCase();
      if (!normalized || normalized.length < 2) {
        setUsernameError('');
        return true;
      }
      setUsernameChecking(true);
      setUsernameError('');
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('username', normalized)
          .neq('user_id', user?.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setUsernameError('That username is already taken.');
          return false;
        }
        return true;
      } catch (err) {
        logger.error('[Onboarding] Username check failed:', err);
        return true; // Allow on error so user isn't blocked
      } finally {
        setUsernameChecking(false);
      }
    },
    [user?.id]
  );

  // ------------------------------------------------------------------
  // Image handlers
  // ------------------------------------------------------------------

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setUploadError('');
    try {
      const local = await prepareLocalImage(file, 'avatar');
      setAvatarLocal(local);
    } catch (err) {
      setUploadError(err.message || 'Failed to process image.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleBikePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBikeUploading(true);
    setUploadError('');
    try {
      const local = await prepareLocalImage(file, 'bike');
      setBikePhotoLocal(local);
    } catch (err) {
      setUploadError(err.message || 'Failed to process image.');
    } finally {
      setBikeUploading(false);
      e.target.value = '';
    }
  };

  const getPreviewUrl = (local) => {
    if (!local) return '';
    return local.previewUrl || '';
  };

  // ------------------------------------------------------------------
  // Save mutation
  // ------------------------------------------------------------------

  const saveProfile = useMutation({
    mutationFn: async (values) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload images if needed
      const [avatar_url, bike_photo_url] = await Promise.all([
        avatarLocal?.file
          ? uploadImage(
              avatarLocal.file,
              'uploads',
              `avatars/${user.id}-${Date.now()}.webp`
            )
          : '',
        bikePhotoLocal?.file
          ? uploadImage(
              bikePhotoLocal.file,
              'uploads',
              `bikes/${user.id}-${Date.now()}.webp`
            )
          : '',
      ]);

      const payload = {
        user_id: user.id,
        display_name: values.display_name.trim(),
        username: values.username?.trim()?.toLowerCase() || null,
        bio: values.bio?.trim() || null,
        avatar_url: avatar_url || null,
        bike_make: values.bike_make?.trim() || null,
        bike_model: values.bike_model?.trim() || null,
        bike_year: values.bike_year || null,
        bike_photo_url: bike_photo_url || null,
        is_public: true,
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
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

  const onSubmit = async (values) => {
    setUploadError('');
    const isUnique = await checkUsernameUnique(values.username);
    if (!isUnique) return;
    saveProfile.mutate(values);
  };

  const handleSkip = useCallback(async () => {
    if (!user?.id) return;
    setUploadError('');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            display_name:
              user?.user_metadata?.full_name ||
              user?.email?.split('@')[0] ||
              'Rider',
            is_public: true,
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      await refreshProfile();
      navigate(redirectPath, { replace: true });
    } catch (err) {
      logger.error('[Onboarding] Skip failed:', err);
      setUploadError('Failed to skip onboarding. Please try again.');
    }
  }, [user, refreshProfile, navigate]);

  // ------------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------------

  const steps = [
    {
      id: 'identity',
      label: 'Identity',
      icon: User,
      done: watchDisplayName?.trim().length >= 2,
    },
    {
      id: 'bike',
      label: 'Machine',
      icon: Bike,
      done: !!(watchBikeMake && form.watch('bike_model')),
    },
    {
      id: 'details',
      label: 'Details',
      icon: FileText,
      done: !!(
        form.watch('bio') ||
        avatarLocal ||
        bikePhotoLocal
      ),
    },
  ];
  const completedSteps = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  const modelSuggestions = getModelSuggestions(watchBikeMake);

  return (
    <div className="min-h-dvh bg-background relative overflow-hidden flex flex-col items-center justify-center px-5 py-8">
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_30%),linear-gradient(180deg,transparent,hsl(var(--background) / 0.58))]" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md rounded-[20px] bg-surface border border-border px-6 py-8 shadow-2xl">
        {/* Logo & Header */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="rr-led-logo">
            <RRLogo size="md" />
          </span>
          <span className="font-display text-2xl font-bold uppercase tracking-[0.04em]">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>

        <div className="rr-chip mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Boot sequence
        </div>
        <h1 className="rr-aggressive-heading mb-1 text-4xl font-bold leading-none text-foreground">
          Join the network
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Set up your rider profile to broadcast signals and connect with the pack.
        </p>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Profile completion
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300',
                  step.done
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground'
                )}
              >
                <step.icon className="w-3 h-3" />
                {step.label}
                {step.done && <Check className="w-3 h-3" />}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Profile picture
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                <span className="rr-avatar-ring shrink-0">
                  {getPreviewUrl(avatarLocal) ? (
                    <img
                      src={getPreviewUrl(avatarLocal)}
                      className="relative h-16 w-16 rounded-full border border-primary/30 object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.06] font-display text-2xl font-bold text-primary">
                      {watchDisplayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </span>
                <label className="flex min-w-0 flex-1 cursor-pointer justify-center rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-center text-sm font-bold text-primary transition-all duration-150 hover:bg-primary/15 hover:text-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/80 active:scale-95">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="sr-only"
                    aria-label="Upload profile picture"
                  />
                  {avatarUploading ? 'Preparing...' : 'Upload picture'}
                </label>
                {avatarLocal && (
                  <button
                    type="button"
                    onClick={() => setAvatarLocal(null)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition active:scale-95"
                    aria-label="Remove avatar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Display Name */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Display name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="How riders see you"
                        autoComplete="nickname"
                        aria-required="true"
                        className="h-12 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value?.trim().length >= 2 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Check className="w-3 h-3" /> Identity confirmed
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Username */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="rider_handle"
                        autoComplete="off"
                        className="h-12 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        {...field}
                        onBlur={async () => {
                          await checkUsernameUnique(field.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-[0.7rem]">
                      Unique handle for your profile URL.
                    </FormDescription>
                    <FormMessage />
                    {usernameChecking && (
                      <p className="text-[11px] text-muted-foreground mt-1">Checking availability...</p>
                    )}
                    {usernameError && (
                      <p className="text-[11px] text-destructive mt-1">{usernameError}</p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Bio */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bio
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your riding style, local area, and what kind of rides you like."
                        maxLength={220}
                        rows={3}
                        className="bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[0.7rem]">
                      {field.value?.length || 0} / 220
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bike Year & Make */}
            <div className="rounded-xl bg-surface border border-border p-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
              <FormField
                control={form.control}
                name="bike_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Year
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1900}
                        max={currentYear + 1}
                        placeholder="2024"
                        className="h-12 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bike_make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bike make
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Yamaha"
                        list="onboarding-bike-make-options"
                        className="h-12 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <datalist id="onboarding-bike-make-options">
                {MOTORCYCLE_MAKES.map((make) => (
                  <option key={make} value={make} />
                ))}
              </datalist>
            </div>

            {/* Bike Model */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <FormField
                control={form.control}
                name="bike_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bike model
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MT-09"
                        list="onboarding-bike-model-options"
                        className="h-12 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {watchBikeMake && field.value && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Check className="w-3 h-3" /> Machine registered
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <datalist id="onboarding-bike-model-options">
                {modelSuggestions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>

            {/* Bike Photo */}
            <div className="rounded-xl bg-surface border border-border p-4">
              <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bike photo
              </Label>

              {getPreviewUrl(bikePhotoLocal) ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-surface">
                    <img
                      src={getPreviewUrl(bikePhotoLocal)}
                      className="h-36 w-full object-cover"
                      alt="Bike preview"
                    />
                    <div className="absolute left-3 top-3 rounded-full border border-primary/30 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur-md">
                      Bike photo
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary active:scale-95">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleBikePhotoChange}
                        className="sr-only"
                        aria-label="Replace bike photo"
                      />
                      Replace
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBikePhotoLocal(null)}
                      className="h-11 rounded-full border-border text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive active:scale-95"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-primary/10 active:scale-95">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleBikePhotoChange}
                    className="sr-only"
                    aria-label="Upload bike photo"
                  />
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    {bikeUploading ? (
                      <ImagePlus className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Bike className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {bikeUploading ? 'Preparing preview...' : 'Add one bike photo'}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Optional. JPG, PNG, or WebP up to 10MB.
                  </div>
                </label>
              )}

              {bikePhotoLocal && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary">
                  <Camera className="w-3 h-3" /> Photo uploaded
                </div>
              )}
            </div>

            {/* Errors */}
            {(uploadError || saveProfile.isError) && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {uploadError || saveProfile.error?.message || 'Failed to create profile'}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={saveProfile.isPending}
              className="h-12 w-full rounded-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150 glow-green"
            >
              {saveProfile.isPending ? 'Creating profile...' : 'Join the network'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={saveProfile.isPending}
              className="h-11 w-full rounded-full text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150"
            >
              Finish details later
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
