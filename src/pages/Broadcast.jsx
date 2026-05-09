import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { useCreateBroadcast } from '@/hooks/useCreateBroadcast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Route, Search, CalendarClock, ArrowLeft, Upload, MapPin } from 'lucide-react';
import AlertPhotoUploader from '@/components/broadcast/AlertPhotoUploader';
import SignalIcon from '@/components/brand/SignalIcon';
import { cn } from '@/lib/utils';
import { prepareLocalImage, getImagePreview, uploadImageIfNeeded, uploadImagesIfNeeded } from '@/lib/localImageUpload';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

const TYPE_STYLE_MAP = {
  solo: {
    hover: 'hover:border-solo/40 hover:bg-solo/8',
    glow: 'bg-solo',
    border: 'border-solo/25',
    text: 'text-solo',
    bg: 'bg-solo/10',
  },
  iso: {
    hover: 'hover:border-iso/40 hover:bg-iso/8',
    glow: 'bg-iso',
    border: 'border-iso/25',
    text: 'text-iso',
    bg: 'bg-iso/10',
  },
  event: {
    hover: 'hover:border-event/40 hover:bg-event/8',
    glow: 'bg-event',
    border: 'border-event/25',
    text: 'text-event',
    bg: 'bg-event/10',
  },
  alert: {
    hover: 'hover:border-alert/40 hover:bg-alert/8',
    glow: 'bg-alert',
    border: 'border-alert/25',
    text: 'text-alert',
    bg: 'bg-alert/10',
  },
};

export default function Broadcast() {
  const urlType = new URLSearchParams(window.location.search).get('type');
  const [type, setType] = useState(TYPES.some((t) => t.id === urlType) ? urlType : null);
  const navigate = useNavigate();

  if (!type) {
    return (
      <div className="px-5 pt-5 pb-8">
        <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Signal console</div>
          <h1 className="rr-heading text-4xl mb-1">Broadcast</h1>
          <p className="text-sm text-muted-foreground">Choose the kind of signal you want to send.</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-gradient-to-r from-primary/50 to-border/40" />
            Broadcast types
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {TYPES.map((t) => {
            const styles = TYPE_STYLE_MAP[t.color];
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "w-full text-left p-5 rounded-[1.35rem] rr-surface transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5 rr-haptic",
                  styles.hover
                )}
              >
                <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-125", styles.glow)} />
                <div className="relative z-10 flex items-center gap-4">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0", styles.border, styles.bg)}>
                    <SignalIcon type={t.id} size="lg" className="transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-extrabold tracking-[-0.03em] text-xl mb-0.5 text-foreground">{t.label}</div>
                    <div className="text-[13px] text-muted-foreground font-medium">{t.desc}</div>
                  </div>
                  <div className={cn("h-2 w-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", styles.glow)} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <BroadcastForm type={type} onBack={() => setType(null)} onPosted={() => navigate('/home')} />;
}

function BroadcastForm({ type, onBack, onPosted }) {
  const { user, profile } = useSupabaseAuth();
  const post = useCreateBroadcast();

  const typeMeta = TYPES.find((t) => t.id === type);
  const typeStyles = TYPE_STYLE_MAP[typeMeta.color];

  const [form, setForm] = useState({
    type,
    title: '',
    body: '',
    isoSubtype: type === 'iso' ? 'mechanic' : undefined,
    exactLocationText: '',
    eventDate: '',
    eventEndTime: '',
    eventImage: '',
    alertImages: [],
    lookingTo: 'join_crew',
  });
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (navigator.geolocation && (type === 'solo_ride' || type === 'iso')) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [type]);

  const handlePost = async () => {
    const [eventImage, alertImages] = await Promise.all([
      uploadImageIfNeeded(form.eventImage),
      uploadImagesIfNeeded(form.alertImages),
    ]);

    post.mutate(
      {
        ...form,
        eventImage,
        alertImages,
        type,
        lat: coords.lat,
        lng: coords.lng,
      },
      {
        onSuccess: () => {
          toast({
            title: `${typeMeta.label} broadcasted`,
            description: 'Your signal is now live on the radar.',
          });
          onPosted();
        },
      }
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const localImage = await prepareLocalImage(file, 'event');
      setForm({ ...form, eventImage: localImage });
      e.target.value = '';
    } catch (error) {
      setUploadError(error?.response?.data?.error || error.message || 'Image validation failed. Please try another image.');
    } finally {
      setUploading(false);
    }
  };

  const isValidEventTime = type !== 'event' || (
    form.eventDate && form.eventEndTime && new Date(form.eventEndTime) > new Date(form.eventDate)
  );

  const hasRequiredTitle = type === 'iso' && form.isoSubtype === 'bike_crew'
    ? !!form.lookingTo
    : form.title.trim().length >= 3;

  const canPost =
    hasRequiredTitle &&
    (type !== 'event' || (form.exactLocationText && isValidEventTime)) &&
    (type !== 'alert' || form.exactLocationText.trim().length > 0);

  return (
    <div className="px-5 pt-5 pb-8">
      <button onClick={onBack} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All types
      </button>

      {/* Type Header */}
      <div className="flex items-center gap-4 mb-5 rr-surface-strong p-5 rounded-[1.45rem] relative overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-40 h-40 opacity-[0.07] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2", typeStyles.glow)} />
        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0 relative z-10", typeStyles.border, typeStyles.bg)}>
          <SignalIcon type={type} size="lg" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em]">{typeMeta.label}</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{typeMeta.desc}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5 rr-glass-panel p-5">
        {type === 'iso' && (
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Looking for</Label>
            <Select value={form.isoSubtype} onValueChange={(v) => setForm({ ...form, isoSubtype: v })}>
              <SelectTrigger className="rr-premium-input rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanic">Mechanic</SelectItem>
                <SelectItem value="bike_crew">Bike Crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'iso' && form.isoSubtype === 'bike_crew' ? (
          <div>
            <Label className="rr-kicker text-muted-foreground mb-2 block">Looking to</Label>
            <Select value={form.lookingTo} onValueChange={(v) => setForm({ ...form, lookingTo: v })}>
              <SelectTrigger className="rr-premium-input rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
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
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={type === 'alert' ? 'Deer on I-70 near exit 252' : type === 'event' ? 'Sunday canyon run' : type === 'iso' ? 'Need a mechanic tonight' : 'Who\'s rolling tonight?'}
              className="rr-premium-input rounded-xl mt-1.5"
              maxLength={120}
            />
          </div>
        )}

        <div>
          <Label className="rr-kicker text-muted-foreground mb-2 block">Details</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={type === 'iso' && form.isoSubtype === 'mechanic' ? 'Describe what is happening with your bike...' : type === 'iso' && form.isoSubtype === 'bike_crew' ? 'Add your area, riding style, pace, or timing...' : 'Add context...'}
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
                value={form.exactLocationText}
                onChange={(e) => setForm({ ...form, exactLocationText: e.target.value })}
                placeholder="Red Rocks Park, parking lot 2"
                className="rr-premium-input rounded-xl mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="rr-kicker text-muted-foreground mb-2 block">Start *</Label>
                <Input type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="rr-premium-input rounded-xl mt-1.5" />
              </div>
              <div>
                <Label className="rr-kicker text-muted-foreground mb-2 block">End *</Label>
                <Input type="datetime-local" value={form.eventEndTime} onChange={(e) => setForm({ ...form, eventEndTime: e.target.value })} className="rr-premium-input rounded-xl mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="rr-kicker text-muted-foreground mb-2 block">Event poster (optional)</Label>
              <div className="mt-1.5 rounded-2xl border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                {form.eventImage ? (
                  <div className="space-y-3">
                    <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-black/45 p-2">
                      <img src={getImagePreview(form.eventImage)} className="max-h-64 w-full object-contain" alt="Event poster preview" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="rr-haptic flex h-10 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary transition hover:bg-primary/15">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {uploading ? 'Preparing...' : 'Replace'}
                      </label>
                      <button type="button" onClick={() => setForm({ ...form, eventImage: '' })} className="rr-haptic h-10 rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive">Remove</button>
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
                value={form.exactLocationText}
                onChange={(e) => setForm({ ...form, exactLocationText: e.target.value })}
                placeholder="I-70 westbound near Idaho Springs"
                className="rr-premium-input rounded-xl mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Describe the area. No exact pin is shared.</p>
            </div>
            <AlertPhotoUploader images={form.alertImages} onChange={(alertImages) => setForm({ ...form, alertImages })} />
          </>
        )}

        {(type === 'solo_ride' || type === 'iso') && (
          <div className="p-3 bg-primary/5 rounded-xl text-xs text-primary border border-primary/15 flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your location will be fuzzed and frozen at post time. No live tracking.</span>
          </div>
        )}

        {post.isError && <p className="text-sm text-destructive">{post.error?.message || 'Failed to create broadcast'}</p>}
        <Button
          onClick={handlePost}
          disabled={!canPost || post.isPending || !user}
          className={cn(
            'w-full h-12 rounded-full mt-2 text-base font-bold rr-haptic glow-green',
            type === 'alert' && 'bg-alert hover:bg-alert/90 text-alert-foreground'
          )}
        >
          {post.isPending ? 'Broadcasting...' : `Publish ${typeMeta.label}`}
        </Button>
      </div>
    </div>
  );
}
