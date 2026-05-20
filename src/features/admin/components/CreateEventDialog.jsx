import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, CalendarPlus, CheckCircle2, Clock, Loader2, MapPin, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminEvent } from '@/features/admin/api/admin-api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { geocodeAddress } from '@/lib/geocoding.js';
import { cn } from '@/lib/utils.js';

const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title must be 120 characters or fewer'),
    locationText: z.string().trim().min(1, 'Location is required'),
    eventDate: z.string().min(1, 'Start time is required'),
    eventEndTime: z.string().min(1, 'End time is required'),
    body: z.string().max(500, 'Description must be 500 characters or fewer'),
    repeat: z.enum(['none', 'weekly', 'monthly']).default('none'),
  })
  .refine(
    (data) => {
      if (!data.eventDate || !data.eventEndTime) return true;
      return new Date(data.eventEndTime) > new Date(data.eventDate);
    },
    { message: 'End time must be after start time', path: ['eventEndTime'] }
  );

/**
 * CreateEventDialog — Admin-only dialog to create a new official Meetup/Event broadcast.
 * Geocodes the location text using Nominatim (same as the rider event creation flow).
 *
 * Props:
 * - open: boolean
 * - onOpenChange: (open: boolean) => void
 * - onSuccess: () => void
 */
export default function CreateEventDialog({ open, onOpenChange, onSuccess }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState(null);
  const [debouncedLocationText, setDebouncedLocationText] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      locationText: '',
      eventDate: '',
      eventEndTime: '',
      body: '',
      repeat: 'none',
    },
  });

  const locationTextValue = watch('locationText') || '';
  const normalizedLocationText = String(locationTextValue).trim().replace(/\s+/g, ' ');

  useEffect(() => {
    if (!open) {
      reset();
      setApiError(null);
      setDebouncedLocationText('');
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setDebouncedLocationText(normalizedLocationText);
    }, 600);
    return () => clearTimeout(timer);
  }, [normalizedLocationText, open]);

  const locationPreview = useQuery({
    queryKey: ['admin', 'event-location-preview', debouncedLocationText],
    queryFn: () => geocodeAddress(debouncedLocationText),
    enabled: open && debouncedLocationText.length >= 4,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const create = useMutation({
    mutationFn: (values) =>
      createAdminEvent({
        title: values.title,
        locationText: values.locationText,
        eventDate: values.eventDate,
        eventEndTime: values.eventEndTime,
        body: values.body,
        repeat: values.repeat,
      }),
    onSuccess: (result) => {
      if (result.error) {
        setApiError(result.error.message || 'Failed to create event.');
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      setApiError(err.message || 'Failed to create event.');
    },
  });

  function onSubmit(values) {
    setApiError(null);
    create.mutate(values);
  }

  const titleLen = watch('title')?.length || 0;
  const bodyLen = watch('body')?.length || 0;
  const repeatValue = watch('repeat');
  const canPreviewLocation = normalizedLocationText.length >= 4;
  const isLocationPreviewCurrent = normalizedLocationText === debouncedLocationText;
  const showLocationChecking =
    canPreviewLocation && (!isLocationPreviewCurrent || locationPreview.isFetching);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'transition-all duration-200'
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg rounded-[24px]',
            'bg-surface border border-white/[0.06] shadow-depth-5',
            'max-h-[90dvh] overflow-y-auto',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[state=open]:duration-200 data-[state=closed]:duration-150',
            'outline-none'
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby="create-event-desc"
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Header */}
            <HStack
              align="center"
              justify="between"
              className="sticky top-0 z-10 bg-surface px-5 pt-5 pb-4 border-b border-white/[0.06]"
            >
              <HStack align="center" gap={2}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                </div>
                <DialogPrimitive.Title asChild>
                  <Text variant="h3" color="default">Create Event</Text>
                </DialogPrimitive.Title>
              </HStack>
              <DialogPrimitive.Close
                className={cn(
                  'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                  'text-muted-foreground hover:text-foreground transition-all duration-150 pressable',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </HStack>

            {/* Body */}
            <VStack gap={4} className="px-5 py-5">
              <p id="create-event-desc" className="text-xs text-muted-foreground leading-relaxed">
                Creates an official Meetup/Event broadcast. Globally visible to all riders. You will be set as the author.
              </p>

              {/* Title */}
              <VStack gap={1.5}>
                <Label htmlFor="ev-title" className="text-xs font-semibold text-foreground">
                  Event title <span className="text-brand-emergency">*</span>
                </Label>
                <Input
                  id="ev-title"
                  type="text"
                  placeholder="Sunday canyon run"
                  maxLength={120}
                  {...register('title')}
                />
                <div className="flex items-center justify-between">
                  {errors.title ? (
                    <Text variant="caption" className="text-brand-emergency">{errors.title.message}</Text>
                  ) : (
                    <span />
                  )}
                  <Text variant="caption" color="muted">{titleLen} / 120</Text>
                </div>
              </VStack>

              {/* Location */}
              <VStack gap={1.5}>
                <Label
                  htmlFor="ev-location"
                  className="flex items-center gap-1 text-xs font-semibold text-foreground"
                >
                  <MapPin className="h-3 w-3" />
                  Location <span className="text-brand-emergency">*</span>
                </Label>
                <Input
                  id="ev-location"
                  type="text"
                  placeholder="Red Rocks Park, parking lot 2"
                  {...register('locationText')}
                />
                {errors.locationText ? (
                  <Text variant="caption" className="text-brand-emergency">{errors.locationText.message}</Text>
                ) : (
                  <Text variant="caption" color="muted">Used to geocode the event. Be specific — city, landmark, or street.</Text>
                )}
                {canPreviewLocation && (
                  <div
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-xs',
                      showLocationChecking
                        ? 'border-primary/20 bg-primary/5 text-muted-foreground'
                        : locationPreview.isError
                        ? 'border-alert/25 bg-alert/5 text-alert'
                        : locationPreview.data
                        ? 'border-primary/25 bg-primary/5 text-foreground'
                        : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground'
                    )}
                    aria-live="polite"
                  >
                    {showLocationChecking ? (
                      <HStack align="center" gap={2}>
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                        <span>Checking location...</span>
                      </HStack>
                    ) : locationPreview.isError ? (
                      <HStack align="start" gap={2}>
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Could not check location right now. You can still try creating the event.</span>
                      </HStack>
                    ) : locationPreview.data ? (
                      <HStack align="start" gap={2}>
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">
                            Located: {locationPreview.data.displayName}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                            {Number(locationPreview.data.lat).toFixed(4)}, {Number(locationPreview.data.lng).toFixed(4)}
                          </span>
                        </span>
                      </HStack>
                    ) : (
                      <HStack align="start" gap={2}>
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Address not found — try adding city/state or a landmark.</span>
                      </HStack>
                    )}
                  </div>
                )}
              </VStack>

              {/* Start / End times — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <VStack gap={1.5}>
                  <Label
                    htmlFor="ev-start"
                    className="flex items-center gap-1 text-xs font-semibold text-foreground"
                  >
                    <Clock className="h-3 w-3" />
                    Starts <span className="text-brand-emergency">*</span>
                  </Label>
                  <Input
                    id="ev-start"
                    type="datetime-local"
                    className="[color-scheme:dark]"
                    {...register('eventDate')}
                  />
                  {errors.eventDate && (
                    <Text variant="caption" className="text-brand-emergency">{errors.eventDate.message}</Text>
                  )}
                </VStack>

                <VStack gap={1.5}>
                  <Label htmlFor="ev-end" className="text-xs font-semibold text-foreground">
                    Ends <span className="text-brand-emergency">*</span>
                  </Label>
                  <Input
                    id="ev-end"
                    type="datetime-local"
                    className="[color-scheme:dark]"
                    {...register('eventEndTime')}
                  />
                  {errors.eventEndTime && (
                    <Text variant="caption" className="text-brand-emergency">{errors.eventEndTime.message}</Text>
                  )}
                </VStack>
              </div>

              {/* Description — optional */}
              <VStack gap={1.5}>
                <Label htmlFor="ev-body" className="text-xs font-semibold text-foreground">
                  Description{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="ev-body"
                  rows={3}
                  placeholder="Meet at the lot, roll at 9"
                  maxLength={500}
                  className="min-h-0 resize-none"
                  {...register('body')}
                />
                <div className="flex items-center justify-between">
                  {errors.body ? (
                    <Text variant="caption" className="text-brand-emergency">{errors.body.message}</Text>
                  ) : (
                    <span />
                  )}
                  <Text variant="caption" color="muted">{bodyLen} / 500</Text>
                </div>
              </VStack>

              {/* Repeat */}
              <VStack gap={1.5}>
                <Label className="text-xs font-semibold text-foreground">Repeat</Label>
                <ToggleGroup
                  type="single"
                  value={repeatValue}
                  onValueChange={(v) => v && setValue('repeat', v, { shouldValidate: true })}
                  className="justify-start flex-wrap"
                >
                  <ToggleGroupItem value="none" className="min-h-[40px] text-xs">
                    Does not repeat
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weekly" className="min-h-[40px] text-xs">
                    Weekly
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" className="min-h-[40px] text-xs">
                    Monthly
                  </ToggleGroupItem>
                </ToggleGroup>
                <Text variant="caption" color="muted">
                  {repeatValue === 'weekly'
                    ? 'Creates 5 total events: this date plus 4 weekly occurrences.'
                    : repeatValue === 'monthly'
                    ? 'Creates 4 total events: this date plus 3 monthly occurrences.'
                    : 'Creates 1 event.'}
                </Text>
              </VStack>

              {/* Geocoding / API error */}
              {apiError && (
                <div className="rounded-xl border border-brand-emergency/20 bg-brand-emergency/5 px-4 py-3">
                  <Text variant="caption" className="text-brand-emergency leading-relaxed">{apiError}</Text>
                </div>
              )}
            </VStack>

            {/* Footer */}
            <HStack gap={2} justify="end" className="px-5 pb-5">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || create.isPending}
              >
                <CalendarPlus className="h-4 w-4" />
                {create.isPending ? 'Creating…' : 'Create Event'}
              </Button>
            </HStack>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
