import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { useMyProfile } from '@/lib/useCurrentUser';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

const TYPE_STYLE_MAP = {
  solo: {
    hover: 'hover:border-solo/35 hover:bg-solo/5',
    glow: 'bg-solo',
  },
  iso: {
    hover: 'hover:border-iso/35 hover:bg-iso/5',
    glow: 'bg-iso',
  },
  event: {
    hover: 'hover:border-event/35 hover:bg-event/5',
    glow: 'bg-event',
  },
  alert: {
    hover: 'hover:border-alert/35 hover:bg-alert/5',
    glow: 'bg-alert',
  },
};

export default function Broadcast() {
  const urlType = new URLSearchParams(window.location.search).get('type');
  const [type, setType] = useState(TYPES.some((t) => t.id === urlType) ? urlType : null);
  const navigate = useNavigate();

  if (!type) {
    return (
      <div className="px-5 pt-5">
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
        <div className="grid grid-cols-1 gap-2.5">
          {TYPES.map((t) => {
            const styles = TYPE_STYLE_MAP[t.color];
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "w-full text-left p-4 rounded-[1.35rem] rr-surface transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5",
                  styles.hover
                )}
              >
                <div className={cn("absolute top-0 right-0 w-28 h-28 opacity-[0.055] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-125", styles.glow)} />
                <div className="relative z-10 flex items-center gap-4">
                  <SignalIcon type={t.id} size="lg" className="transition-transform duration-300 group-hover:scale-105" />
                  <div className="flex-1">
                    <div className="font-display font-extrabold tracking-[-0.03em] text-xl mb-1 text-foreground">{t.label}</div>
                    <div className="text-[13px] text-muted-foreground font-medium">{t.desc}</div>
                  </div>
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
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();

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

  const post = useMutation({
    mutationFn: async () => {
      const [eventImage, alertImages] = await Promise.all([
        uploadImageIfNeeded(form.eventImage),
        uploadImagesIfNeeded(form.alertImages),
      ]);
      await base44.functions.invoke('createBroadcast', {
        ...form,
        eventImage,
        alertImages,
        type,
        lat: coords.lat,
        lng: coords.lng
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      onPosted();
    },
  });

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
    <div className="px-5 pt-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All types
      </button>

      <div className="flex items-center gap-4 mb-5 rr-surface-strong p-5 rounded-[1.45rem] relative overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-40 h-40 opacity-[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2", typeStyles.glow)} />
        <SignalIcon type={type} size="lg" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em]">{typeMeta.label}</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{typeMeta.desc}</p>
        </div>
      </div>

      <div className="space-y-4 rr-surface rounded-[1.45rem] p-4">
        {type === 'iso' && (
          <div>
            <Label>Looking for</Label>
            <Select value={form.isoSubtype} onValueChange={(v) => setForm({ ...form, isoSubtype: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanic">Mechanic</SelectItem>
                <SelectItem value="bike_crew">Bike Crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'iso' && form.isoSubtype === 'bike_crew' ? (
          <div>
            <Label>Looking to</Label>
            <Select value={form.lookingTo} onValueChange={(v) => setForm({ ...form, lookingTo: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="join_crew">Join a crew</SelectItem>
                <SelectItem value="start_crew">Start a crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={type === 'alert' ? 'Deer on I-70 near exit 252' : type === 'event' ? 'Sunday canyon run' : type === 'iso' ? 'Need a mechanic tonight' : 'Who\'s rolling tonight?'}
              className="mt-1.5"
              maxLength={120}
            />
          </div>
        )}

        <div>
          <Label>Details</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder={type === 'iso' && form.isoSubtype === 'mechanic' ? 'Describe what is happening with your bike...' : type === 'iso' && form.isoSubtype === 'bike_crew' ? 'Add your area, riding style, pace, or timing...' : 'Add context...'}
            className="mt-1.5"
            rows={4}
            maxLength={500}
          />
        </div>

        {type === 'event' && (
          <>
            <div>
              <Label>Location *</Label>
              <Input
                value={form.exactLocationText}
                onChange={(e) => setForm({ ...form, exactLocationText: e.target.value })}
                placeholder="Red Rocks Park, parking lot 2"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start *</Label>
                <Input type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>End *</Label>
                <Input type="datetime-local" value={form.eventEndTime} onChange={(e) => setForm({ ...form, eventEndTime: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Event poster (optional)</Label>
              <div className="mt-1.5 rounded-2xl border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                {form.eventImage ? (
                  <div className="space-y-3">
                    <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-black/45 p-2">
                      <img src={getImagePreview(form.eventImage)} className="max-h-64 w-full object-contain" alt="Event poster preview" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        {uploading ? 'Preparing...' : 'Replace'}
                      </label>
                      <button type="button" onClick={() => setForm({ ...form, eventImage: '' })} className="h-10 rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive">Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-6 text-center transition hover:border-primary/50 hover:bg-primary/10">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Upload className="mb-2 h-5 w-5 text-primary" />
                    <div className="text-sm font-bold text-foreground">{uploading ? 'Preparing preview...' : 'Upload one event poster'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Vertical, square, or horizontal images are preserved.</div>
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
              <Label>Approximate area *</Label>
              <Input
                value={form.exactLocationText}
                onChange={(e) => setForm({ ...form, exactLocationText: e.target.value })}
                placeholder="I-70 westbound near Idaho Springs"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Describe the area. No exact pin is shared.</p>
            </div>
            <AlertPhotoUploader images={form.alertImages} onChange={(alertImages) => setForm({ ...form, alertImages })} />
          </>
        )}

        {(type === 'solo_ride' || type === 'iso') && (
          <div className="p-3 bg-accent/50 rounded-lg text-xs text-accent-foreground">
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            Your location will be fuzzed and frozen at post time. No live tracking.
          </div>
        )}

        {post.isError && <p className="text-sm text-destructive">{post.error?.response?.data?.error || post.error.message}</p>}
        <Button
          onClick={() => post.mutate()}
          disabled={!canPost || post.isPending || !profile}
          className={cn('w-full h-12 rounded-full mt-2', type === 'alert' && 'bg-alert hover:bg-alert/90 text-alert-foreground')}
        >
          {post.isPending ? 'Broadcasting...' : `Broadcast ${typeMeta.label}`}
        </Button>
      </div>
    </div>
  );
}