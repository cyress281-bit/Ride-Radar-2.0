import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, MapPin, Users, LocateFixed, Wrench } from 'lucide-react';
import AlertPhotoUploader from './AlertPhotoUploader';
import AlertPinMap from './AlertPinMap';
import LocationPickerMap from './LocationPickerMap';
import AddressAutocomplete from '@/components/shared/AddressAutocomplete';
import { useRadarLocation } from '@/features/broadcast/hooks/use-radar-location';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useCreateBroadcast } from '@/features/broadcast/hooks/use-create-broadcast.js';
import { prepareLocalImage } from '@/lib/image-utils.js';
import { logger } from '@/lib/logger.js';

const TYPES = [
  { id: 'solo_ride', label: 'Ride Now', desc: 'Open a live riding signal', color: 'solo' },
  { id: 'event', label: 'Plan a Meetup', desc: 'Stage a meetup or group ride', color: 'event' },
  { id: 'iso', label: 'Need Help', desc: 'Find wrench help or a bike crew', color: 'iso' },
  { id: 'alert', label: 'Road Warning', desc: 'Road hazard, one-way broadcast', color: 'alert' },
  { id: 'bike_down', label: 'Bike Down', desc: 'Fast safety alert — accident or rider down', color: 'bike_down' },
];

const TYPE_STYLE_MAP = {
  solo: {
    panel: 'border-primary/18 bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(var(--primary)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    glow: 'bg-primary',
    glowTone: 'shadow-[0_0_28px_hsl(var(--primary)/0.18)]',
    border: 'border-primary/25',
    text: 'text-primary',
    bg: 'bg-primary/10',
    input: 'border-primary/20 focus-within:border-primary/45 focus-within:shadow-[0_0_0_2px_hsl(var(--primary)/0.18),0_0_22px_hsl(var(--primary)/0.12)]',
    chip: 'border-primary/20 bg-primary/10 text-primary',
    chipInactive: 'border-border/40 bg-white/[0.03] text-muted-foreground hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground',
    panelSoft: 'border-primary/18 bg-primary/[0.05]',
    section: 'border-primary/16 bg-surface/82',
    sectionGlow: 'shadow-[0_0_24px_hsl(var(--primary)/0.10)]',
    neonClass: 'rr-neon-green',
    glowClass: 'glow-kawasaki-sm',
  },
  event: {
    panel: 'border-event/18 bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(var(--event)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    glow: 'bg-event',
    glowTone: 'shadow-[0_0_28px_hsl(var(--event)/0.18)]',
    border: 'border-event/25',
    text: 'text-event',
    bg: 'bg-event/10',
    input: 'border-event/20 focus-within:border-event/45 focus-within:shadow-[0_0_0_2px_hsl(var(--event)/0.16),0_0_22px_hsl(var(--event)/0.12)]',
    chip: 'border-event/20 bg-event/10 text-event',
    chipInactive: 'border-border/40 bg-white/[0.03] text-muted-foreground hover:border-event/25 hover:bg-event/[0.06] hover:text-foreground',
    panelSoft: 'border-event/18 bg-event/[0.05]',
    section: 'border-event/16 bg-surface/82',
    sectionGlow: 'shadow-[0_0_24px_hsl(var(--event)/0.10)]',
    neonClass: '',
    glowClass: '',
  },
  iso: {
    panel: 'border-iso/18 bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(var(--iso)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    glow: 'bg-iso',
    glowTone: 'shadow-[0_0_28px_hsl(var(--iso)/0.18)]',
    border: 'border-iso/25',
    text: 'text-iso',
    bg: 'bg-iso/10',
    input: 'border-iso/20 focus-within:border-iso/45 focus-within:shadow-[0_0_0_2px_hsl(var(--iso)/0.16),0_0_22px_hsl(var(--iso)/0.10)]',
    chip: 'border-iso/20 bg-iso/10 text-iso',
    chipInactive: 'border-border/40 bg-white/[0.03] text-muted-foreground hover:border-iso/25 hover:bg-iso/[0.06] hover:text-foreground',
    panelSoft: 'border-iso/18 bg-iso/[0.05]',
    section: 'border-iso/16 bg-surface/82',
    sectionGlow: 'shadow-[0_0_24px_hsl(var(--iso)/0.10)]',
    neonClass: '',
    glowClass: '',
  },
  alert: {
    panel: 'border-alert/18 bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(var(--alert)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    glow: 'bg-alert',
    glowTone: 'shadow-[0_0_28px_hsl(var(--alert)/0.18)]',
    border: 'border-alert/25',
    text: 'text-alert',
    bg: 'bg-alert/10',
    input: 'border-alert/20 focus-within:border-alert/45 focus-within:shadow-[0_0_0_2px_hsl(var(--alert)/0.16),0_0_22px_hsl(var(--alert)/0.10)]',
    chip: 'border-alert/20 bg-alert/10 text-alert',
    chipInactive: 'border-border/40 bg-white/[0.03] text-muted-foreground hover:border-alert/25 hover:bg-alert/[0.06] hover:text-foreground',
    panelSoft: 'border-alert/18 bg-alert/[0.05]',
    section: 'border-alert/16 bg-surface/82',
    sectionGlow: 'shadow-[0_0_24px_hsl(var(--alert)/0.10)]',
    neonClass: '',
    glowClass: '',
  },
  bike_down: {
    panel: 'border-destructive/18 bg-surface/88 shadow-[0_24px_80px_hsl(0_0%_0%/0.42),0_0_0_1px_hsl(var(--destructive)/0.04),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    glow: 'bg-destructive',
    glowTone: 'shadow-[0_0_28px_hsl(var(--destructive)/0.18)]',
    border: 'border-destructive/25',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    input: 'border-destructive/20 focus-within:border-destructive/45 focus-within:shadow-[0_0_0_2px_hsl(var(--destructive)/0.18),0_0_22px_hsl(var(--destructive)/0.12)]',
    chip: 'border-destructive/20 bg-destructive/10 text-destructive',
    chipInactive: 'border-border/40 bg-white/[0.03] text-muted-foreground hover:border-destructive/25 hover:bg-destructive/[0.06] hover:text-foreground',
    panelSoft: 'border-destructive/18 bg-destructive/[0.05]',
    section: 'border-destructive/16 bg-surface/82',
    sectionGlow: 'shadow-[0_0_24px_hsl(var(--destructive)/0.10)]',
    neonClass: 'rr-neon-red',
    glowClass: '',
  },
};

const ALERT_PRESETS = [
  'Police', 'Traffic', 'Street closed', 'Flooding', 'Debris', 'Gravel',
  'Oil spill', 'Pothole', 'Construction', 'Animal on road', 'Blocked lane',
];

const baseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  body: z.string().max(500).optional(),
});

const eventSchema = baseSchema.extend({
  exactLocationText: z.string().min(1, 'Location is required'),
  eventDate: z.string().min(1, 'Start time is required'),
  eventEndTime: z.string().min(1, 'End time is required'),
}).refine((data) => {
  if (!data.eventDate || !data.eventEndTime) return true;
  return new Date(data.eventEndTime) > new Date(data.eventDate);
}, { message: 'End time must be after start time', path: ['eventEndTime'] });

const alertSchema = baseSchema.extend({
  exactLocationText: z.string().optional(),
});

const bikeDownSchema = z.object({
  exactLocationText: z.string().max(500).optional(),
  title: z.string().trim().max(120).optional(),
  body: z.string().max(500).optional(),
});

const isoSchema = z.object({
  isoSubtype: z.enum(['mechanic', 'bike_crew']),
  lookingTo: z.enum(['join_crew', 'start_crew']).optional(),
  title: z.string().max(120).optional(),
  body: z.string().max(500).optional(),
}).refine((data) => {
  if (data.isoSubtype === 'mechanic') {
    return data.title && data.title.trim().length >= 3;
  }
  return true;
}, { message: 'Title is required for mechanic requests', path: ['title'] });

function normalizeLocationText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

/**
 * Two-step broadcast creation form — Electric Neon Edition.
 *
 * @param {object} props
 * @param {string} props.type
 * @param {Function} props.onBack
 * @param {Function} props.onPosted
 */
export default function BroadcastForm({ type, onBack, onPosted }) {
  const { user } = useAuthState();
  const post = useCreateBroadcast();
  const typeMeta = TYPES.find((t) => t.id === type);
  const typeStyles = TYPE_STYLE_MAP[typeMeta.color];
  const formSectionClass = cn(
    'space-y-5 rounded-[28px] border bg-surface/88 p-5 relative overflow-hidden backdrop-blur-2xl shadow-[0_24px_80px_hsl(0_0%_0%/0.42),inset_0_1px_0_hsl(0_0%_100%/0.05)]',
    typeStyles.panel
  );
  const fieldCardClass = cn('rounded-[20px] border bg-surface/78 p-3 backdrop-blur-xl shadow-[0_18px_54px_hsl(0_0%_0%/0.28)]', typeStyles.section);
  const controlClass = cn('rr-premium-input rounded-[18px] mt-1.5', typeStyles.input);
  const { effectiveLoc: radarDefaultLoc, userLoc, hasUserLocation } = useRadarLocation();

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [eventImage, setEventImage] = useState(null);
  const [alertImages, setAlertImages] = useState([]);
  const [alertPin, setAlertPin] = useState(null);
  const [eventPin, setEventPin] = useState(null);
  const [eventPinAdjusted, setEventPinAdjusted] = useState(false);
  const [eventLocationPreview, setEventLocationPreview] = useState({
    status: 'idle',
    data: null,
    error: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [geoError, setGeoError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPrecision, setLocationPrecision] = useState('approximate');
  const eventPinSourceRef = useRef('');
  const eventPinAdjustedRef = useRef(false);
  const eventLocationQueryRef = useRef('');

  useEffect(() => {
    if (navigator.geolocation && (type === 'solo_ride' || type === 'iso')) {
      setIsLocating(true);
      setGeoError(false);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoError(false);
          setIsLocating(false);
        },
        (err) => {
          setGeoError(true);
          setIsLocating(false);
          logger.warn('[BroadcastForm] Geolocation error:', err?.message);
        },
        { maximumAge: 60000, timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, [type]);

  const schema =
    type === 'event' ? eventSchema : type === 'alert' ? alertSchema : type === 'bike_down' ? bikeDownSchema : type === 'iso' ? isoSchema : baseSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      isoSubtype: 'mechanic',
      lookingTo: 'join_crew',
      title: '',
      body: '',
      exactLocationText: '',
      eventDate: '',
      eventEndTime: '',
    },
  });

  const isoSubtype = watch('isoSubtype');
  const exactLocationTextValue = watch('exactLocationText');
  const eventDateValue = watch('eventDate');
  const eventEndTimeValue = watch('eventEndTime');
  const normalizedEventLocationText = normalizeLocationText(exactLocationTextValue);

  // When the user types a new address (not from pin drag), reset pin state
  // so the autocomplete can set a fresh pin when a suggestion is selected.
  useEffect(() => {
    if (type !== 'event') return;
    if (!eventPinSourceRef.current) return;
    if (eventPinSourceRef.current === normalizedEventLocationText) return;

    eventPinSourceRef.current = '';
    eventPinAdjustedRef.current = false;
    eventLocationQueryRef.current = normalizedEventLocationText;
    setEventPin(null);
    setEventPinAdjusted(false);
    setEventLocationPreview({ status: 'idle', data: null, error: null });
  }, [normalizedEventLocationText, type]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const localImage = await prepareLocalImage(file, 'event');
      setEventImage(localImage);
      e.target.value = '';
    } catch (error) {
      setUploadError(error?.message || 'Image validation failed. Please try another image.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values) => {
    if (type === 'event' && !(eventPin?.lat != null && eventPin?.lng != null)) {
      toast({
        title: 'Add a meetup pin',
        description: 'Enter a location and select a suggestion, or place the pin manually.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      type,
      title: values.title || '',
      body: values.body || '',
      exactLocationText: values.exactLocationText || '',
      eventDate: values.eventDate || '',
      eventEndTime: values.eventEndTime || '',
      eventImage: eventImage || '',
      alertImages: alertImages,
      isoSubtype: values.isoSubtype,
      lookingTo: values.lookingTo,
      eventPinLat: eventPin?.lat ?? null,
      eventPinLng: eventPin?.lng ?? null,
      eventPinAdjusted,
      lat: alertPin?.lat ?? coords.lat,
      lng: alertPin?.lng ?? coords.lng,
      locationPrecision: type === 'solo_ride' ? locationPrecision : undefined,
    };

    post.mutate(payload, {
      onSuccess: () => {
        reset();
        setEventImage(null);
        setAlertImages([]);
        setUploadError('');
        onPosted();
      },
    });
  };

  const hasEventPin = eventPin?.lat != null && eventPin?.lng != null;
  const canResolveEventLocation = hasEventPin;
  const eventMapCenter = eventPin || radarDefaultLoc;
  const eventMapStatusText = hasEventPin
    ? 'Confirm the meetup pin or drag it to the exact spot.'
    : 'Enter a meetup location, then confirm or adjust the pin on the map.';
  const showEventPinMap = type === 'event';

  const handleEventPinChange = (nextPin) => {
    eventPinAdjustedRef.current = true;
    setEventPinAdjusted(true);
    eventPinSourceRef.current = normalizedEventLocationText;
    setEventPin(nextPin);
  };

  const handleAddressSelect = (displayName, coords) => {
    setValue('exactLocationText', displayName, { shouldValidate: true });
    eventPinSourceRef.current = displayName;
    if (coords) {
      setEventPin({ lat: coords.lat, lng: coords.lng });
      eventPinAdjustedRef.current = false;
      setEventPinAdjusted(false);
      setEventLocationPreview({ status: 'success', data: coords, error: null });
    }
  };

  const canPost =
    !uploading &&
    !uploadError &&
    !isLocating &&
    (type !== 'iso' || isoSubtype === 'mechanic' || watch('lookingTo')) &&
    (type !== 'event' || (exactLocationTextValue && eventDateValue && eventEndTimeValue && canResolveEventLocation)) &&
    (type !== 'bike_down' || exactLocationTextValue || (alertPin?.lat != null && alertPin?.lng != null)) &&
    (type !== 'alert' || (alertPin?.lat != null && alertPin?.lng != null)) &&
    ((type !== 'solo_ride' && type !== 'iso') || (coords.lat != null && coords.lng != null));

  return (
    <div className="px-5 pt-5 pb-2 bg-background scroll-smooth">{/* AppLayout <main> applies pb-nav-safe globally */}
      <button type="button" onClick={onBack} aria-label="Back to signal type" className="pressable mb-3 flex min-h-[44px] items-center gap-1.5 px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Type header */}
      <HStack gap={3} align="center" className="mb-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border backdrop-blur-sm', typeStyles.border, typeStyles.bg, typeStyles.glowClass, typeStyles.glowTone)}>
          <SignalIcon type={type} size="sm" />
        </div>
        <VStack gap={0.5}>
          <Text as="h1" variant="h2" className={cn('rr-heading text-base', typeStyles.text)}>{typeMeta.label}</Text>
          <Text variant="caption" color="muted" className="max-w-[20rem]">
            {typeMeta.desc}
          </Text>
        </VStack>
      </HStack>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className={formSectionClass}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.045] to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/[0.04] blur-3xl" />

        {/* ISO subtype selector */}
        {type === 'iso' && (
          <VStack gap={2}>
            <Label id="isoSubtype-label" className="rr-kicker text-muted-foreground mb-1 block">What do you need?</Label>
            <div role="radiogroup" aria-labelledby="isoSubtype-label" className="grid grid-cols-2 gap-2">
                {[
                  { value: 'mechanic', label: 'Mechanic', icon: Wrench },
                  { value: 'bike_crew', label: 'Bike Crew', icon: Users },
                ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('isoSubtype', opt.value)}
                  className={cn(
                    'flex min-h-[52px] items-center gap-2 rounded-2xl border px-3.5 py-3 text-sm font-bold transition-all active:scale-[0.96] backdrop-blur-xl',
                    isoSubtype === opt.value
                      ? 'border-cyan/40 bg-cyan/10 text-cyan shadow-[0_0_22px_hsl(var(--cyan)/0.14)] glow-yamaha'
                      : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                  )}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </VStack>
        )}

        {type === 'iso' && isoSubtype === 'bike_crew' ? (
          <VStack gap={2}>
            <Label htmlFor="lookingTo" className="rr-kicker text-muted-foreground mb-1 block">Looking to</Label>
            <Select value={watch('lookingTo')} onValueChange={(v) => setValue('lookingTo', v)}>
              <SelectTrigger id="lookingTo" className={controlClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="join_crew">Join a crew</SelectItem>
                <SelectItem value="start_crew">Start a crew</SelectItem>
              </SelectContent>
            </Select>
          </VStack>
        ) : type === 'bike_down' ? null : (
          <VStack gap={2}>
            <Label htmlFor="title" className="rr-kicker text-muted-foreground mb-1 block">
              {type === 'alert' ? 'What should riders know?' :
               type === 'event' ? "What's the meetup?" :
               type === 'iso' ? 'What do you need fixed?' :
               'Where are you riding?'}
            </Label>
            {type === 'alert' && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ALERT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue('title', preset)}
                    className={cn('text-xs font-bold px-3 py-1.5 rounded-full border transition-colors pressable', typeStyles.chipInactive, 'text-alert/90')}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
            <Input
              id="title"
              {...register('title')}
              placeholder={
                type === 'alert'
                  ? 'Deer on I-70 near exit 252'
                  : type === 'event'
                    ? 'Sunday canyon run'
                    : type === 'iso'
                      ? 'Brake pad replacement'
                      : 'Evening cruise, west side loop, or bike night'
              }
              className={controlClass}
              maxLength={120}
            />
            <Text variant="caption" color="muted" className="text-right">
              {watch('title')?.length || 0} / 120
            </Text>
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </VStack>
        )}

        {/* Details */}
        <VStack gap={2}>
          <Label htmlFor="details" className="rr-kicker text-muted-foreground mb-1 block">
            {type === 'solo_ride' ? 'Route, pace, or notes' :
             type === 'event' ? 'More info (optional)' :
             type === 'iso' && isoSubtype === 'mechanic' ? 'Bike model, symptoms, tools' :
             type === 'iso' && isoSubtype === 'bike_crew' ? 'Riding style, pace, or timing' :
             type === 'bike_down' ? 'Details (optional)' :
             'More details (optional)'}
          </Label>
          <Textarea
            id="details"
            {...register('body')}
            placeholder={
              type === 'iso' && isoSubtype === 'mechanic'
                ? '2019 Street Triple, front brake squeal...'
                : type === 'iso' && isoSubtype === 'bike_crew'
                  ? 'Sport touring, all welcome'
                  : type === 'solo_ride'
                    ? 'Cruising pace, no drop, open to nearby riders'
                    : type === 'event'
                      ? 'Meet at the lot, roll at 9'
                      : type === 'bike_down'
                        ? 'Motorcycle down, rider condition, traffic blocked...'
                        : 'Gravel across both lanes'
            }
            className={controlClass}
            rows={4}
            maxLength={500}
          />
          <Text variant="caption" color="muted" className="text-right">
            {watch('body')?.length || 0} / 500
          </Text>
        </VStack>

        {/* Event fields */}
        {type === 'event' && (
          <VStack gap={5}>
            <VStack gap={2}>
              <AddressAutocomplete
                inputId="location"
                label="Where is it?"
                value={exactLocationTextValue || ''}
                onSelect={handleAddressSelect}
                placeholder="Red Rocks Park, parking lot 2"
                typeStyleInput={controlClass}
                error={errors.exactLocationText?.message}
              />
              {!errors.exactLocationText && (
                <Text variant="caption" color="muted">
                  {eventMapStatusText}
                </Text>
              )}
            </VStack>
            {showEventPinMap && (
              <VStack gap={2}>
                <div className={cn('rounded-[20px] p-3', fieldCardClass)}>
                  <LocationPickerMap
                    defaultCenter={eventMapCenter}
                    value={eventPin}
                    onChange={handleEventPinChange}
                    color="event"
                    zoomLevel={hasEventPin ? 15 : 11}
                  />
                  <Text variant="caption" color="muted" className="mt-2 block">
                    Drag the pin to fine-tune the meetup spot.
                  </Text>
                </div>
              </VStack>
            )}
            {/* Event poster upload */}
            <VStack gap={2}>
              <Label className="rr-kicker text-muted-foreground mb-1 block">Event poster (optional)</Label>
              <div id="eventPoster" className={cn('mt-1.5 rounded-[20px] p-3', fieldCardClass)}>
                {eventImage ? (
                  <VStack gap={3}>
                    <div className={cn('flex max-h-72 items-center justify-center overflow-hidden rounded-xl border bg-black/45 p-2', typeStyles.border)}>
                      <img
                        src={eventImage.previewUrl || eventImage}
                        className="max-h-64 w-full object-contain"
                        alt="Event poster preview"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={cn('pressable flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border text-xs font-bold transition hover:bg-event/15', typeStyles.chip)}>
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                        {uploading ? 'Preparing...' : 'Replace'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setEventImage(null)}
                        className="pressable h-11 min-h-[44px] rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </VStack>
                ) : (
                  <label className={cn('flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition hover:bg-event/10 pressable', typeStyles.chipInactive)}>
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                    <Upload className={cn('mb-2 h-6 w-6', typeStyles.text)} />
                    <Text variant="bodySm" className="font-bold">{uploading ? 'Preparing preview...' : 'Upload event poster'}</Text>
                    <Text variant="caption" color="muted" className="mt-1">Drag and drop or tap to browse</Text>
                  </label>
                )}
              </div>
              {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
            </VStack>

            <VStack gap={3}>
              <VStack gap={2}>
                <Label htmlFor="start" className="rr-kicker text-muted-foreground mb-1 block">Starts</Label>
                <Input id="start" type="datetime-local" {...register('eventDate')} className={controlClass} />
                {errors.eventDate && <p className="mt-1 text-xs text-destructive">{errors.eventDate.message}</p>}
              </VStack>
              <VStack gap={2}>
                <Label htmlFor="end" className="rr-kicker text-muted-foreground mb-1 block">Ends</Label>
                <Input id="end" type="datetime-local" {...register('eventEndTime')} className={controlClass} />
                {errors.eventEndTime && <p className="mt-1 text-xs text-destructive">{errors.eventEndTime.message}</p>}
              </VStack>
            </VStack>
          </VStack>
        )}

        {/* Alert fields */}
        {type === 'alert' && (
          <VStack gap={5}>
            {hasUserLocation && (
              <button
                type="button"
                onClick={() => setAlertPin({ lat: userLoc.lat, lng: userLoc.lng })}
                className={cn('flex min-h-[44px] w-full items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors pressable', typeStyles.chip)}
              >
                <LocateFixed className="w-4 h-4 shrink-0" />
                Use my current location
              </button>
            )}
            <AlertPinMap
              defaultCenter={radarDefaultLoc}
              value={alertPin}
              onChange={setAlertPin}
              color="alert"
            />
            <Text variant="caption" color="muted">Drop a pin or use your current location. Exact location stays private.</Text>
            <VStack gap={2}>
              <Label htmlFor="approximateArea" className="rr-kicker text-muted-foreground mb-1 block">Area note (optional)</Label>
              <Input
                id="approximateArea"
                {...register('exactLocationText')}
                placeholder="I-70 westbound near Idaho Springs"
                className={controlClass}
              />
            </VStack>
            <AlertPhotoUploader images={alertImages} onChange={setAlertImages} color="alert" />
          </VStack>
        )}

        {/* Bike Down fields */}
        {type === 'bike_down' && (
          <VStack gap={5}>
            <div className={cn('flex items-start gap-2.5 rounded-2xl px-3.5 py-3', typeStyles.panelSoft, typeStyles.sectionGlow)}>
              <span className="mt-0.5 text-destructive" aria-hidden="true">⚠</span>
              <p className="text-xs leading-snug text-destructive/90 font-medium">
                Bike Down alerts are community safety signals, not emergency dispatch. If someone may be injured or in danger, <strong>call 911 first</strong>. A dropped pin or current location may share a more precise location with other riders.
              </p>
            </div>
            <VStack gap={2}>
              <Label htmlFor="approximateArea" className="rr-kicker text-muted-foreground mb-1 block">Where did you see it?</Label>
              <Input
                id="approximateArea"
                {...register('exactLocationText')}
                placeholder="I-70 westbound near Idaho Springs"
                className={controlClass}
              />
              {errors.exactLocationText && <p className="mt-1 text-xs text-destructive">{errors.exactLocationText.message}</p>}
              <Text variant="caption" color="muted" className="mt-1.5">Text-only fallback can stay approximate. If you use your current location or drop a pin, other riders may see a more precise spot.</Text>
            </VStack>
            {hasUserLocation && (
              <button
                type="button"
                onClick={() => {
                  setAlertPin({ lat: userLoc.lat, lng: userLoc.lng });
                  if (!exactLocationTextValue) {
                    setValue('exactLocationText', 'Near my current location');
                  }
                }}
                className={cn('flex min-h-[44px] w-full items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors pressable', typeStyles.chip)}
              >
                <LocateFixed className="w-4 h-4 shrink-0" />
                Use my current location
              </button>
            )}
            <AlertPinMap
              defaultCenter={radarDefaultLoc}
              value={alertPin}
              onChange={setAlertPin}
              color="bike_down"
            />
            <AlertPhotoUploader images={alertImages} onChange={setAlertImages} color="bike_down" />
          </VStack>
        )}

        {/* Location info */}
        {type === 'solo_ride' && (
          <VStack gap={2.5}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocationPrecision('approximate')}
                className={cn(
                  'flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors min-h-[42px] backdrop-blur-xl',
                  locationPrecision === 'approximate'
                    ? 'bg-primary/10 border-primary/40 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.10)]'
                    : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:border-primary/25 hover:text-foreground'
                )}
              >
                Approximate
              </button>
              <button
                type="button"
                onClick={() => setLocationPrecision('precise')}
                className={cn(
                  'flex-1 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors min-h-[42px] backdrop-blur-xl',
                  locationPrecision === 'precise'
                    ? 'bg-alert/10 border-alert/40 text-alert shadow-[0_0_18px_hsl(var(--alert)/0.10)]'
                    : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:border-alert/25 hover:text-foreground'
                )}
              >
                Precise
              </button>
            </div>
            <div className={cn(
              'p-3 rounded-2xl text-xs flex items-start gap-2 border backdrop-blur-xl',
              locationPrecision === 'precise'
                ? 'bg-alert/5 border-alert/20 text-alert shadow-[0_0_16px_hsl(var(--alert)/0.08)]'
                : 'bg-primary/5 border-primary/20 text-primary shadow-[0_0_16px_hsl(var(--primary)/0.08)]'
            )}>
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {locationPrecision === 'precise'
                  ? 'Your exact GPS location will be shared with nearby riders. No live tracking.'
                  : 'Your location is fuzzed ~1.5 mi and frozen when you send. No live tracking.'}
              </span>
            </div>
          </VStack>
        )}

        {type === 'iso' && (
          <div className="p-3 bg-iso/5 rounded-2xl text-xs text-iso border border-iso/20 flex items-start gap-2 backdrop-blur-xl shadow-[0_0_16px_hsl(var(--iso)/0.08)]">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your location is approximated (~1 mile) and frozen when you send. No live tracking.</span>
          </div>
        )}

        {/* Errors */}
        {post.isError && (
          <p role="alert" className="text-sm text-destructive">
            {post.error?.message || 'Could not send signal. Try again.'}
          </p>
        )}
        {geoError && (
          <p role="alert" className="text-sm text-destructive">
            Location is needed for this signal. Enable location and try again.
          </p>
        )}
        {isLocating && (type === 'solo_ride' || type === 'iso') && (
          <p className="text-sm text-muted-foreground">Acquiring location…</p>
        )}
        {!geoError && !isLocating && coords.lat == null && (type === 'solo_ride' || type === 'iso') && (
          <p role="alert" className="text-sm text-destructive">
            Location services unavailable. This signal requires your location.
          </p>
        )}

        {/* Publish button */}
        <div className={cn(
          type === 'bike_down' && 'sticky bottom-0 z-[60] pb-nav-safe pt-1 bg-background'
        )}>
          <Button
            type="submit"
            disabled={!canPost || post.isPending || !user}
            className={cn(
              'w-full h-14 rounded-full mt-2 text-base font-bold pressable transition-all duration-200 shadow-[0_18px_40px_hsl(0_0%_0%/0.30)]',
              type === 'bike_down'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : type === 'alert'
                  ? 'bg-alert hover:bg-alert/90 text-alert-foreground'
                  : type === 'event'
                    ? 'bg-event hover:bg-event/90 text-event-foreground'
                    : type === 'iso'
                      ? 'bg-iso hover:bg-iso/90 text-iso-foreground'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground glow-kawasaki-sm'
            )}
          >
            {post.isPending
              ? 'Sending...'
              : type === 'solo_ride'
                ? 'Send Ride Signal'
                : type === 'event'
                  ? 'Create Meetup'
                  : type === 'bike_down'
                    ? 'Send Bike Down Alert'
                    : type === 'iso' && isoSubtype === 'mechanic'
                      ? 'Request Help'
                      : type === 'iso' && isoSubtype === 'bike_crew'
                        ? 'Send Crew Request'
                        : 'Send Warning'}
          </Button>
        </div>
      </form>
    </div>
  );
}
