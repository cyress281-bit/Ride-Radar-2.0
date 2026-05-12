import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Route, Search, CalendarClock, ArrowLeft, Upload, MapPin } from 'lucide-react';
import AlertPhotoUploader from './AlertPhotoUploader';
import SignalIcon from '@/components/brand/SignalIcon';
import { cn } from '@/lib/utils.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useCreateBroadcast } from '@/features/broadcast/hooks/use-create-broadcast.js';
import { prepareLocalImage } from '@/lib/image-utils.js';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger.js';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

const TYPE_STYLE_MAP = {
  solo: {
    hover: 'hover:border-solo/40 hover:bg-solo/5',
    glow: 'bg-solo',
    border: 'border-solo/25',
    text: 'text-solo',
    bg: 'bg-solo/10',
  },
  iso: {
    hover: 'hover:border-iso/40 hover:bg-iso/5',
    glow: 'bg-iso',
    border: 'border-iso/25',
    text: 'text-iso',
    bg: 'bg-iso/10',
  },
  event: {
    hover: 'hover:border-event/40 hover:bg-event/5',
    glow: 'bg-event',
    border: 'border-event/25',
    text: 'text-event',
    bg: 'bg-event/10',
  },
  alert: {
    hover: 'hover:border-alert/40 hover:bg-alert/5',
    glow: 'bg-alert',
    border: 'border-alert/25',
    text: 'text-alert',
    bg: 'bg-alert/10',
  },
};

const baseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(120),
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
  exactLocationText: z.string().min(1, 'Approximate area is required'),
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
 * Two-step broadcast creation form.
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

  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [eventImage, setEventImage] = useState(null);
  const [alertImages, setAlertImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [geoError, setGeoError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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
    type === 'event' ? eventSchema : type === 'alert' ? alertSchema : type === 'iso' ? isoSchema : baseSchema;

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
      eventImage: eventImage?.previewUrl || eventImage || '',
      alertImages: alertImages.map((img) => img.previewUrl || img),
      isoSubtype: values.isoSubtype,
      lookingTo: values.lookingTo,
      lat: coords.lat,
      lng: coords.lng,
    };

    post.mutate(payload, {
      onSuccess: () => {
        toast({
          title: `${typeMeta.label} broadcasted`,
          description: 'Your signal is now live on the radar.',
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
    (type !== 'alert' || exactLocationTextValue) &&
    ((type !== 'solo_ride' && type !== 'iso') || (coords.lat != null && coords.lng != null));

  return (
    <div className="px-5 pt-5 pb-8">
      <button onClick={onBack} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
        <ArrowLeft className="w-4 h-4" /> All types
      </button>

      <div className="flex items-center gap-4 mb-5 rr-surface-strong p-5 rounded-[20px] relative overflow-hidden border-l-[3px] border-l-primary/40">
        <div className={cn('absolute top-0 right-0 w-40 h-40 opacity-[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2', typeStyles.glow)} />
        <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0 relative z-10', typeStyles.border, typeStyles.bg)}>
          <SignalIcon type={type} size="lg" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em]">{typeMeta.label}</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{typeMeta.desc}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rr-surface rounded-[20px] p-5">
        {type === 'iso' && (
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Looking for</Label>
            <Select value={isoSubtype} onValueChange={(v) => setValue('isoSubtype', v)}>
              <SelectTrigger className="rr-premium-input rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanic">Mechanic</SelectItem>
                <SelectItem value="bike_crew">Bike Crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'iso' && isoSubtype === 'bike_crew' ? (
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Looking to</Label>
            <Select value={watch('lookingTo')} onValueChange={(v) => setValue('lookingTo', v)}>
              <SelectTrigger className="rr-premium-input rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="join_crew">Join a crew</SelectItem>
                <SelectItem value="start_crew">Start a crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Title *</Label>
            <Input
              {...register('title')}
              placeholder={
                type === 'alert'
                  ? 'Deer on I-70 near exit 252'
                  : type === 'event'
                    ? 'Sunday canyon run'
                    : type === 'iso'
                      ? 'Need a mechanic tonight'
                      : "Who's rolling tonight?"
              }
              className="rr-premium-input rounded-xl mt-1.5"
              maxLength={120}
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
          </div>
        )}

        <div>
          <Label className="rr-kicker text-muted-foreground mb-2 block">Details</Label>
          <Textarea
            {...register('body')}
            placeholder={
              type === 'iso' && isoSubtype === 'mechanic'
                ? 'Describe what is happening with your bike...'
                : type === 'iso' && isoSubtype === 'bike_crew'
                  ? 'Add your area, riding style, pace, or timing...'
                  : 'Add context...'
            }
            className="rr-premium-input rounded-xl mt-1.5"
            rows={4}
            maxLength={500}
          />
        </div>

        {type === 'event' && (
          <>
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Location *</Label>
              <Input
                {...register('exactLocationText')}
                placeholder="Red Rocks Park, parking lot 2"
                className="rr-premium-input rounded-xl mt-1.5"
              />
              {errors.exactLocationText && <p className="mt-1 text-xs text-destructive">{errors.exactLocationText.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="rr-kicker text-muted-foreground mb-2 block">Start *</Label>
                <Input type="datetime-local" {...register('eventDate')} className="rr-premium-input rounded-xl mt-1.5" />
                {errors.eventDate && <p className="mt-1 text-xs text-destructive">{errors.eventDate.message}</p>}
              </div>
              <div>
                <Label className="rr-kicker text-muted-foreground mb-2 block">End *</Label>
                <Input type="datetime-local" {...register('eventEndTime')} className="rr-premium-input rounded-xl mt-1.5" />
                {errors.eventEndTime && <p className="mt-1 text-xs text-destructive">{errors.eventEndTime.message}</p>}
              </div>
            </div>
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Event poster (optional)</Label>
              <div className="mt-1.5 rounded-[20px] border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                {eventImage ? (
                  <div className="space-y-3">
                    <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-black/45 p-2">
                      <img
                        src={eventImage.previewUrl || eventImage}
                        className="max-h-64 w-full object-contain"
                        alt="Event poster preview"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="rr-haptic flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary transition hover:bg-primary/15">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {uploading ? 'Preparing...' : 'Replace'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setEventImage(null)}
                        className="rr-haptic h-11 min-h-[44px] rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-primary/10 rr-haptic">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Upload className="mb-2 h-6 w-6 text-primary" />
                    <div className="text-sm font-bold text-foreground">{uploading ? 'Preparing preview...' : 'Upload event poster'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Drag and drop or tap to browse</div>
                  </label>
                )}
              </div>
              {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
            </div>
          </>
        )}

        {type === 'alert' && (
          <>
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Approximate area *</Label>
              <Input
                {...register('exactLocationText')}
                placeholder="I-70 westbound near Idaho Springs"
                className="rr-premium-input rounded-xl mt-1.5"
              />
              {errors.exactLocationText && <p className="mt-1 text-xs text-destructive">{errors.exactLocationText.message}</p>}
              <p className="text-xs text-muted-foreground mt-1.5">Describe the area. No exact pin is shared.</p>
            </div>
            <AlertPhotoUploader images={alertImages} onChange={setAlertImages} />
          </>
        )}

        {(type === 'solo_ride' || type === 'iso') && (
          <div className="p-3 bg-primary/5 rounded-xl text-xs text-primary border border-primary/15 flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your location will be fuzzed and frozen at post time. No live tracking.</span>
          </div>
        )}

        {post.isError && <p className="text-sm text-destructive">{post.error?.message || 'Failed to create broadcast'}</p>}
        {geoError && (
          <p className="text-sm text-alert">
            Location access is required for this signal type. Enable location or try again.
          </p>
        )}
        <Button
          type="submit"
          disabled={!canPost || post.isPending || !user}
          className={cn(
            'w-full h-14 rounded-full mt-2 text-base font-bold rr-haptic transition-colors',
            type === 'alert'
              ? 'bg-alert hover:bg-alert/90 text-alert-foreground glow-honda'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground glow-kawasaki-sm'
          )}
        >
          {post.isPending ? 'Broadcasting...' : `Publish ${typeMeta.label}`}
        </Button>
      </form>
    </div>
  );
}
