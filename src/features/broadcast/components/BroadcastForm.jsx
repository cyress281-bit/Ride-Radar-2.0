import { useState, useEffect } from 'react';
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
import { useRadarLocation } from '@/features/broadcast/hooks/use-radar-location';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useCreateBroadcast } from '@/features/broadcast/hooks/use-create-broadcast.js';
import { prepareLocalImage } from '@/lib/image-utils.js';
import { toast } from '@/components/ui/use-toast';
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
    hover: 'hover:border-primary/40 hover:bg-primary/5',
    glow: 'bg-primary',
    border: 'border-primary/25',
    text: 'text-primary',
    bg: 'bg-primary/10',
    neonClass: 'rr-neon-green',
    glowClass: 'glow-kawasaki-sm',
  },
  event: {
    hover: 'hover:border-event/40 hover:bg-event/5',
    glow: 'bg-event',
    border: 'border-event/25',
    text: 'text-event',
    bg: 'bg-event/10',
    neonClass: '',
    glowClass: '',
  },
  iso: {
    hover: 'hover:border-iso/40 hover:bg-iso/5',
    glow: 'bg-iso',
    border: 'border-iso/25',
    text: 'text-iso',
    bg: 'bg-iso/10',
    neonClass: '',
    glowClass: '',
  },
  alert: {
    hover: 'hover:border-alert/40 hover:bg-alert/5',
    glow: 'bg-alert',
    border: 'border-alert/25',
    text: 'text-alert',
    bg: 'bg-alert/10',
    neonClass: '',
    glowClass: '',
  },
  bike_down: {
    hover: 'hover:border-destructive/40 hover:bg-destructive/5',
    glow: 'bg-destructive',
    border: 'border-destructive/25',
    text: 'text-destructive',
    bg: 'bg-destructive/10',
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
  const { effectiveLoc: radarDefaultLoc, userLoc, hasUserLocation } = useRadarLocation();

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [eventImage, setEventImage] = useState(null);
  const [alertImages, setAlertImages] = useState([]);
  const [alertPin, setAlertPin] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [geoError, setGeoError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPrecision, setLocationPrecision] = useState('approximate');

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
      lat: alertPin?.lat ?? coords.lat,
      lng: alertPin?.lng ?? coords.lng,
      locationPrecision: type === 'solo_ride' ? locationPrecision : undefined,
    };

    post.mutate(payload, {
      onSuccess: () => {
        toast({
          title: type === 'solo_ride' ? 'Ride signal sent' :
                 type === 'event' ? 'Meetup created' :
                 type === 'iso' ? 'Help request sent' :
                 type === 'bike_down' ? 'Bike Down alert sent' :
                 'Warning sent',
          description: 'Riders nearby can see it.',
        });
        reset();
        setEventImage(null);
        setAlertImages([]);
        setUploadError('');
        onPosted();
      },
    });
  };

  const canPost =
    !uploading &&
    !uploadError &&
    !isLocating &&
    (type !== 'iso' || isoSubtype === 'mechanic' || watch('lookingTo')) &&
    (type !== 'event' || (exactLocationTextValue && eventDateValue && eventEndTimeValue)) &&
    (type !== 'bike_down' || exactLocationTextValue || (alertPin?.lat != null && alertPin?.lng != null)) &&
    (type !== 'alert' || (alertPin?.lat != null && alertPin?.lng != null)) &&
    ((type !== 'solo_ride' && type !== 'iso') || (coords.lat != null && coords.lng != null));

  return (
    <div className="px-5 pt-5 bg-background scroll-smooth">{/* AppLayout <main> applies pb-nav-safe globally */}
      <button onClick={onBack} aria-label="Back to signal type" className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 min-h-[44px] px-1 transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Type header */}
      <HStack gap={3} align="center" className="mb-4">
        <SignalIcon type={type} size="sm" />
        <VStack gap={0.5}>
          <Text as="h1" variant="h2" className={cn('rr-heading text-base', typeStyles.text)}>{typeMeta.label}</Text>
        </VStack>
      </HStack>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rr-surface p-5 relative overflow-hidden">
        <div className={cn('absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-[0.03] blur-3xl', typeStyles.glow)} />

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
                    'flex items-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all active:scale-[0.96]',
                    isoSubtype === opt.value
                      ? 'border-cyan/40 bg-cyan/10 text-cyan glow-yamaha'
                      : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
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
              <SelectTrigger id="lookingTo" className="rr-premium-input rounded-xl mt-1.5">
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
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-alert/30 bg-alert/8 text-alert hover:bg-alert/15 transition-colors pressable"
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
              className="rr-premium-input rounded-xl mt-1.5"
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
            className="rr-premium-input rounded-xl mt-1.5"
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
              <Label htmlFor="location" className="rr-kicker text-muted-foreground mb-1 block">Where is it?</Label>
              <Input
                id="location"
                {...register('exactLocationText')}
                placeholder="Red Rocks Park, parking lot 2"
                className="rr-premium-input rounded-xl mt-1.5"
              />
              {errors.exactLocationText && <p className="mt-1 text-xs text-destructive">{errors.exactLocationText.message}</p>}
            </VStack>
            {/* Event poster upload */}
            <VStack gap={2}>
              <Label className="rr-kicker text-muted-foreground mb-1 block">Event poster (optional)</Label>
              <div id="eventPoster" className="mt-1.5 rounded-[20px] border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                {eventImage ? (
                  <VStack gap={3}>
                    <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-black/45 p-2">
                      <img
                        src={eventImage.previewUrl || eventImage}
                        className="max-h-64 w-full object-contain"
                        alt="Event poster preview"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="pressable flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary transition hover:bg-primary/15">
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                        {uploading ? 'Preparing...' : 'Replace'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setEventImage(null)}
                        className="pressable h-11 min-h-[44px] rounded-full border border-border/80 bg-surface-elevated/50 text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </VStack>
                ) : (
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-primary/10 pressable">
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                    <Upload className="mb-2 h-6 w-6 text-primary" />
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
                <Input id="start" type="datetime-local" {...register('eventDate')} className="rr-premium-input rounded-xl mt-1.5" />
                {errors.eventDate && <p className="mt-1 text-xs text-destructive">{errors.eventDate.message}</p>}
              </VStack>
              <VStack gap={2}>
                <Label htmlFor="end" className="rr-kicker text-muted-foreground mb-1 block">Ends</Label>
                <Input id="end" type="datetime-local" {...register('eventEndTime')} className="rr-premium-input rounded-xl mt-1.5" />
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
                className="flex items-center gap-2 text-sm font-bold text-alert border border-alert/30 bg-alert/8 rounded-xl px-4 py-2.5 min-h-[44px] w-full hover:bg-alert/15 transition-colors pressable"
              >
                <LocateFixed className="w-4 h-4 shrink-0" />
                Use my current location
              </button>
            )}
            <AlertPinMap
              defaultCenter={radarDefaultLoc}
              value={alertPin}
              onChange={setAlertPin}
            />
            <Text variant="caption" color="muted">Drop a pin or use your current location. Exact location stays private.</Text>
            <VStack gap={2}>
              <Label htmlFor="approximateArea" className="rr-kicker text-muted-foreground mb-1 block">Area note (optional)</Label>
              <Input
                id="approximateArea"
                {...register('exactLocationText')}
                placeholder="I-70 westbound near Idaho Springs"
                className="rr-premium-input rounded-xl mt-1.5"
              />
            </VStack>
            <AlertPhotoUploader images={alertImages} onChange={setAlertImages} color="alert" />
          </VStack>
        )}

        {/* Bike Down fields */}
        {type === 'bike_down' && (
          <VStack gap={5}>
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-3">
              <span className="mt-0.5 text-destructive" aria-hidden="true">⚠</span>
              <p className="text-xs leading-snug text-destructive/90 font-medium">
                Bike Down alerts are community safety signals, not emergency services. If someone may be injured or in danger, <strong>call 911 first</strong>.
              </p>
            </div>
            <VStack gap={2}>
              <Label htmlFor="approximateArea" className="rr-kicker text-muted-foreground mb-1 block">Where did you see it?</Label>
              <Input
                id="approximateArea"
                {...register('exactLocationText')}
                placeholder="I-70 westbound near Idaho Springs"
                className="rr-premium-input rounded-xl mt-1.5"
              />
              {errors.exactLocationText && <p className="mt-1 text-xs text-destructive">{errors.exactLocationText.message}</p>}
              <Text variant="caption" color="muted" className="mt-1.5">Describe the area. Your exact location stays private.</Text>
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
                className="flex items-center gap-2 text-sm font-bold text-destructive border border-destructive/30 bg-destructive/8 rounded-xl px-4 py-2.5 min-h-[44px] w-full hover:bg-destructive/15 transition-colors pressable"
              >
                <LocateFixed className="w-4 h-4 shrink-0" />
                Use my current location
              </button>
            )}
            <AlertPinMap
              defaultCenter={radarDefaultLoc}
              value={alertPin}
              onChange={setAlertPin}
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
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors min-h-[40px]',
                  locationPrecision === 'approximate'
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-transparent border-border/40 text-muted-foreground hover:border-border/70'
                )}
              >
                Approximate
              </button>
              <button
                type="button"
                onClick={() => setLocationPrecision('precise')}
                className={cn(
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors min-h-[40px]',
                  locationPrecision === 'precise'
                    ? 'bg-alert/10 border-alert/40 text-alert'
                    : 'bg-transparent border-border/40 text-muted-foreground hover:border-border/70'
                )}
              >
                Precise
              </button>
            </div>
            <div className={cn(
              'p-3 rounded-xl text-xs flex items-start gap-2 border',
              locationPrecision === 'precise'
                ? 'bg-alert/5 border-alert/15 text-alert'
                : 'bg-primary/5 border-primary/15 text-primary'
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
          <div className="p-3 bg-primary/5 rounded-xl text-xs text-primary border border-primary/15 flex items-start gap-2">
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
              'w-full h-14 rounded-full mt-2 text-base font-bold pressable transition-all duration-200',
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
