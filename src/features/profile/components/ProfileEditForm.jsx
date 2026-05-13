/**
 * Inline profile edit form — Electric Neon Green redesign.
 *
 * Uses react-hook-form + zod for validation.
 * Performs optimistic updates via TanStack Query.
 * Debounced username availability check.
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth';
import { useUpdateProfile, useUsernameAvailability } from '@/features/profile/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Check, X, Loader2, AlertCircle, Camera, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOTORCYCLE_MAKES, getModelSuggestions } from '@/lib/motorcycleCatalog';
import BikePhotoUploader from './BikePhotoUploader';
import { uploadImageIfNeeded, isLocalImage, prepareLocalImage } from '@/lib/image-utils.js';

const currentYear = new Date().getFullYear();

const schema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name too long'),
  username: z
    .string()
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]*$/, 'Only letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(220, 'Bio must be 220 characters or less').optional(),
  bike_make: z.string().max(50).optional().or(z.literal('')),
  bike_model: z.string().max(50).optional().or(z.literal('')),
  bike_year: z
    .union([z.coerce.number().int().min(1900).max(currentYear + 1), z.literal(''), z.literal(null)])
    .optional(),
  avatar_url: z.string().optional().or(z.literal('')),
  bike_photo_url: z.string().optional().or(z.literal('')),
});

/**
 * @param {object} props
 * @param {object} props.profile — existing profile row
 * @param {() => void} props.onDone — called after successful save or cancel
 */
export default function ProfileEditForm({ profile, onDone }) {
  const { user } = useAuthState();
  const { refreshProfile } = useAuthActions();
  const qc = useQueryClient();
  const updateMutation = useUpdateProfile();

  const defaultValues = useMemo(
    () => ({
      display_name: profile?.display_name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      bike_make: profile?.bike_make || '',
      bike_model: profile?.bike_model || '',
      bike_year: profile?.bike_year || '',
      avatar_url: profile?.avatar_url || '',
      bike_photo_url: profile?.bike_photo_url || '',
    }),
    [profile]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Reset form when profile prop changes (e.g. after optimistic update revert)
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchedUsername = form.watch('username');
  const [debouncedUsername, setDebouncedUsername] = useState(watchedUsername);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(watchedUsername), 400);
    return () => clearTimeout(timer);
  }, [watchedUsername]);

  // Debounced username query — only check when dirty and valid format
  const shouldCheckUsername = useMemo(() => {
    const val = String(debouncedUsername || '').trim();
    return (
      val.length >= 3 &&
      /^[a-zA-Z0-9_]+$/.test(val) &&
      val !== profile?.username
    );
  }, [debouncedUsername, profile?.username]);

  const { data: usernameAvailable, isLoading: checkingUsername } = useUsernameAvailability(
    debouncedUsername,
    { enabled: shouldCheckUsername }
  );

  const modelSuggestions = useMemo(
    () => getModelSuggestions(form.watch('bike_make')),
    [form.watch('bike_make')]
  );

  const normalizeBikeYear = (value) => {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 1900 && year <= currentYear + 1) return year;
    return null;
  };

  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = useCallback(
    async (values) => {
      if (!user?.id) return;

      // Block submit if username check is in progress or unavailable
      if (checkingUsername) return;
      if (shouldCheckUsername && usernameAvailable === false) {
        form.setError('username', { type: 'manual', message: 'Username is already taken' });
        return;
      }

      setIsUploading(true);
      try {
        // Upload local images first
        const [avatar_url, bike_photo_url] = await Promise.all([
          uploadImageIfNeeded(values.avatar_url),
          uploadImageIfNeeded(values.bike_photo_url),
        ]);

        if (isLocalImage(avatar_url) || isLocalImage(bike_photo_url)) {
          throw new Error('Image upload failed. Please try again.');
        }

        const updates = {
          display_name: values.display_name.trim() || user.email,
          username: values.username?.trim() || null,
          bio: values.bio?.trim() || null,
          bike_make: values.bike_make?.trim() || null,
          bike_model: values.bike_model?.trim() || null,
          bike_year: normalizeBikeYear(values.bike_year),
          avatar_url,
          bike_photo_url,
        };

        // Optimistic update
        const previous = qc.getQueryData(['profile', user.id]);
        qc.setQueryData(['profile', user.id], (old) => (old ? { ...old, ...updates } : old));

        try {
          await updateMutation.mutateAsync({ userId: user.id, updates });
          await refreshProfile();
          qc.invalidateQueries({ queryKey: ['myBroadcasts'] });
          onDone();
        } catch (mutationErr) {
          // Rollback optimistic update on error
          qc.setQueryData(['profile', user.id], previous);
          // Re-throw so updateMutation.isError is set and the error banner shows
          throw mutationErr;
        }
      } finally {
        setIsUploading(false);
      }
    },
    [user, checkingUsername, shouldCheckUsername, usernameAvailable, form, updateMutation, qc, refreshProfile, onDone]
  );

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      form.setError('avatar_url', { message: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' });
      return;
    }
    if (file.size > MAX_SIZE) {
      form.setError('avatar_url', { message: 'Image must be under 5MB.' });
      return;
    }

    try {
      const local = await prepareLocalImage(file, 'avatar');
      form.setValue('avatar_url', local, { shouldDirty: true });
    } catch (err) {
      form.setError('avatar_url', { message: err.message || 'Failed to prepare image' });
    }
  };

  const avatarValue = form.watch('avatar_url');
  const avatarPreview = isLocalImage(avatarValue)
    ? avatarValue.previewUrl
    : avatarValue || '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="rr-kicker mb-1">Identity config</div>
            <h1 className="font-display text-2xl font-bold tracking-tight rr-neon-green">Edit profile</h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancel editing"
              onClick={() => {
                form.reset(defaultValues);
                onDone();
              }}
              className="rounded-full border border-white/[0.08] hover:bg-white/[0.04] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              aria-label="Save changes"
              disabled={updateMutation.isPending || isUploading || checkingUsername || (shouldCheckUsername && usernameAvailable === false)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(var(--primary)/0.4)] animate-glow-pulse"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="rr-glass-panel p-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="rr-avatar-ring">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    className="relative h-16 w-16 rounded-full border border-primary/30 object-cover"
                    alt=""
                  />
                ) : (
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/[0.08] font-display text-2xl font-bold text-primary">
                    {form.watch('display_name')?.[0] || '?'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary border-2 border-background">
                <Camera className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <label className="rr-shimmer-button flex min-w-0 flex-1 cursor-pointer justify-center rounded-full border border-primary/25 bg-primary/10 px-4 py-2.5 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/15 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/80">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              Change avatar
            </label>
          </div>
          {form.formState.errors.avatar_url?.message && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-emergency">
              <AlertCircle className="h-3 w-3" />
              {form.formState.errors.avatar_url.message}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="rr-glass-panel space-y-4 p-4">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="rr-kicker">Display name</FormLabel>
                <FormControl>
                  <Input {...field} className="rr-premium-input rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="rr-kicker">Username</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={cn(
                      'rr-premium-input rounded-xl',
                      usernameAvailable === false && 'border-brand-emergency focus-visible:ring-brand-emergency'
                    )}
                    placeholder="unique_handle"
                  />
                </FormControl>
                <div className="flex items-center gap-1.5">
                  {checkingUsername && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                    </span>
                  )}
                  {!checkingUsername && shouldCheckUsername && usernameAvailable === false && (
                    <span className="flex items-center gap-1 text-[11px] text-brand-emergency">
                      <AlertCircle className="h-3 w-3" /> Taken
                    </span>
                  )}
                  {!checkingUsername && shouldCheckUsername && usernameAvailable === true && (
                    <span className="flex items-center gap-1 text-[11px] text-primary">
                      <Check className="h-3 w-3" /> Available
                    </span>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <FormField
              control={form.control}
              name="bike_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="rr-kicker">Year</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      min={1900}
                      max={currentYear + 1}
                      value={field.value || ''}
                      className="rr-premium-input rounded-xl"
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
                  <FormLabel className="rr-kicker">Bike make</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="rr-premium-input rounded-xl"
                      list="profile-bike-make-options"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <datalist id="profile-bike-make-options">
            {MOTORCYCLE_MAKES.map((make) => (
              <option key={make} value={make} />
            ))}
          </datalist>

          <FormField
            control={form.control}
            name="bike_model"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="rr-kicker">Bike model</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="rr-premium-input rounded-xl"
                    list="profile-bike-model-options"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <datalist id="profile-bike-model-options">
            {modelSuggestions.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>

          <FormField
            control={form.control}
            name="bike_photo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="rr-kicker">Bike photo</FormLabel>
                <FormControl>
                  <BikePhotoUploader
                    image={field.value}
                    onChange={(val) => field.onChange(val)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="rr-kicker">Bio</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="rr-premium-input rounded-xl"
                    maxLength={220}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Save Button */}
        <Button
          type="submit"
          disabled={updateMutation.isPending || isUploading || checkingUsername || (shouldCheckUsername && usernameAvailable === false)}
          className={cn(
            'w-full rounded-full bg-primary text-primary-foreground font-bold',
            'hover:bg-primary/90 transition-all active:scale-[0.98]',
            'shadow-[0_4px_20px_hsl(var(--primary)/0.35)]'
          )}
        >
          {updateMutation.isPending || isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" /> Save Changes
            </span>
          )}
        </Button>

        {updateMutation.isError && (
          <div className="rounded-xl border border-brand-emergency/25 bg-brand-emergency/5 p-3 text-sm text-brand-emergency flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {updateMutation.error?.message || 'Failed to save profile'}
          </div>
        )}
      </form>
    </Form>
  );
}
