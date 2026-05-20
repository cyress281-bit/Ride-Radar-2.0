import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Pencil, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateAdminEvent } from '@/features/admin/api/admin-api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { geocodeAddress } from '@/lib/geocoding.js';
import { cn } from '@/lib/utils.js';

const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(120, 'Title must be 120 characters or fewer'),
    body: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
    locationText: z.string().trim().min(1, 'Location is required'),
    eventDate: z.string().min(1, 'Start time is required'),
    eventEndTime: z.string().min(1, 'End time is required'),
  })
  .refine(
    (data) => {
      if (!data.eventDate || !data.eventEndTime) return true;
      return new Date(data.eventEndTime) > new Date(data.eventDate);
    },
    { message: 'End time must be after start time', path: ['eventEndTime'] }
  );

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function normalizeLocationText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

/**
 * EditEventDialog - Admin-only dialog for editing an existing event broadcast.
 *
 * Props:
 * - event: event broadcast row
 * - open: boolean
 * - onOpenChange: (open: boolean) => void
 * - onSuccess: () => void
 */
export default function EditEventDialog({ event, open, onOpenChange, onSuccess }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState(null);
  const [debouncedLocationText, setDebouncedLocationText] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      body: '',
      locationText: '',
      eventDate: '',
      eventEndTime: '',
    },
  });

  useEffect(() => {
    if (open && event) {
      reset({
        title: event.title || '',
        body: event.body || '',
        locationText: event.location_name || '',
        eventDate: toDatetimeLocalValue(event.event_date),
        eventEndTime: toDatetimeLocalValue(event.expires_at),
      });
      setApiError(null);
      setDebouncedLocationText(normalizeLocationText(event.location_name || ''));
      return;
    }

    if (!open) {
      reset({
        title: '',
        body: '',
        locationText: '',
        eventDate: '',
        eventEndTime: '',
      });
      setApiError(null);
      setDebouncedLocationText('');
    }
  }, [event, open, reset]);

  const locationTextValue = watch('locationText') || '';
  const normalizedLocationText = normalizeLocationText(locationTextValue);

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

  const update = useMutation({
    mutationFn: (values) =>
      updateAdminEvent(event?.id, {
        title: values.title,
        body: values.body,
        locationText: values.locationText,
        eventDate: values.eventDate,
        eventEndTime: values.eventEndTime,
      }),
    onSuccess: (result) => {
      if (result.error) {
        setApiError(result.error.message || 'Failed to update event.');
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      setApiError(err.message || 'Failed to update event.');
    },
  });

  function onSubmit(values) {
    setApiError(null);
    update.mutate(values);
  }

  if (!event) return null;

  const titleLen = watch('title')?.length || 0;
  const bodyLen = watch('body')?.length || 0;
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
          aria-describedby="edit-event-desc"
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <HStack
              align="center"
              justify="between"
              className="sticky top-0 z-10 bg-surface px-5 pt-5 pb-4 border-b border-white/[0.06]"
            >
              <HStack align="center" gap={2}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
                <DialogPrimitive.Title asChild>
                  <Text variant="h3" color="default">Edit Event</Text>
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

            <VStack gap={4} className="px-5 py-5">
              <p id="edit-event-desc" className="text-xs text-muted-foreground leading-relaxed">
                Updates this standalone event broadcast. RSVP history, comments, and the event ID stay the same.
              </p>

              <VStack gap={1.5}>
                <Label htmlFor="edit-title" className="text-xs font-semibold text-foreground">
                  Event title <span className="text-brand-emergency">*</span>
                </Label>
                <Input
                  id="edit-title"
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

              <VStack gap={1.5}>
                <Label htmlFor="edit-location" className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <MapPin className="h-3 w-3" />
                  Location <span className="text-brand-emergency">*</span>
                </Label>
                <Input
                  id="edit-location"
                  type="text"
                  placeholder="Red Rocks Park, parking lot 2"
                  {...register('locationText')}
                />
                {errors.locationText ? (
                  <Text variant="caption" className="text-brand-emergency">{errors.locationText.message}</Text>
                ) : (
                  <Text variant="caption" color="muted">Used to geocode the event. Be specific - city, landmark, or street.</Text>
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
                        <span>Could not check location right now. You can still try saving the event.</span>
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
                        <span>Address not found - try adding city/state or a landmark.</span>
                      </HStack>
                    )}
                  </div>
                )}
              </VStack>

              <div className="grid grid-cols-2 gap-3">
                <VStack gap={1.5}>
                  <Label htmlFor="edit-start" className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Clock className="h-3 w-3" />
                    Starts <span className="text-brand-emergency">*</span>
                  </Label>
                  <Input
                    id="edit-start"
                    type="datetime-local"
                    className="[color-scheme:dark]"
                    {...register('eventDate')}
                  />
                  {errors.eventDate && (
                    <Text variant="caption" className="text-brand-emergency">{errors.eventDate.message}</Text>
                  )}
                </VStack>

                <VStack gap={1.5}>
                  <Label htmlFor="edit-end" className="text-xs font-semibold text-foreground">
                    Ends <span className="text-brand-emergency">*</span>
                  </Label>
                  <Input
                    id="edit-end"
                    type="datetime-local"
                    className="[color-scheme:dark]"
                    {...register('eventEndTime')}
                  />
                  {errors.eventEndTime && (
                    <Text variant="caption" className="text-brand-emergency">{errors.eventEndTime.message}</Text>
                  )}
                </VStack>
              </div>

              <VStack gap={1.5}>
                <Label htmlFor="edit-body" className="text-xs font-semibold text-foreground">
                  Description{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="edit-body"
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

              {apiError && (
                <div className="rounded-xl border border-brand-emergency/20 bg-brand-emergency/5 px-4 py-3">
                  <Text variant="caption" className="text-brand-emergency leading-relaxed">{apiError}</Text>
                </div>
              )}
            </VStack>

            <HStack gap={2} justify="end" className="px-5 pb-5">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || update.isPending}
              >
                <Pencil className="h-4 w-4" />
                {update.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </HStack>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
