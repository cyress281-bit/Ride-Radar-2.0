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
import SignalIcon from '@/components/brand/SignalIcon';
import { cn } from '@/lib/utils';
import { computeExpiresAt, fuzzLocation } from '@/lib/broadcastUtils';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, one-way broadcast', icon: ShieldAlert, color: 'alert' },
];

export default function Broadcast() {
  const [type, setType] = useState(null);
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
        <div className="grid grid-cols-1 gap-2.5 relative before:absolute before:left-7 before:top-5 before:bottom-5 before:w-px before:bg-gradient-to-b before:from-primary/35 before:via-border/70 before:to-transparent before:pointer-events-none">
          {TYPES.map((t) => {
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "w-full text-left p-4 pl-6 rounded-[1.35rem] rr-surface transition-all duration-300 group flex flex-col gap-4 relative overflow-hidden",
                  `hover:border-${t.color}/60 hover:shadow-[0_12px_40px_-12px_hsl(var(--${t.color})/0.3)] hover:-translate-y-0.5`
                )}
              >
                <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150", `bg-${t.color}`)} />
                <span className="absolute left-[23px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-background border border-current/50 shadow-[0_0_14px_currentColor] z-20" />
                <div className="flex items-center gap-5 z-10 ml-5">
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
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const list = await base44.entities.UserSettings.filter({ userId: user.id });
      return list[0];
    }
  });

  const typeMeta = TYPES.find((t) => t.id === type);

  const [form, setForm] = useState({
    type,
    title: '',
    body: '',
    isoSubtype: type === 'iso' ? 'mechanic' : undefined,
    exactLocationText: '',
    eventDate: '',
    eventEndTime: '',
    eventImage: '',
  });
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [uploading, setUploading] = useState(false);

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
      const payload = {
        authorId: profile.id,
        type,
        title: form.title,
        body: form.body,
        status: 'active',
      };

      if (type === 'solo_ride' || type === 'iso') {
        if (settings?.showLocation !== false && coords.lat != null) {
          const fuzzed = fuzzLocation(coords.lat, coords.lng);
          payload.frozenLat = fuzzed.lat;
          payload.frozenLng = fuzzed.lng;
        }
      }
      if (type === 'iso') payload.isoSubtype = form.isoSubtype;
      if (type === 'event') {
        payload.exactLocationText = form.exactLocationText;
        payload.eventDate = form.eventDate ? new Date(form.eventDate).toISOString() : undefined;
        payload.eventEndTime = form.eventEndTime ? new Date(form.eventEndTime).toISOString() : undefined;
        if (form.eventImage) payload.eventImage = form.eventImage;
      }
      if (type === 'alert') {
        payload.exactLocationText = form.exactLocationText;
      }

      payload.expiresAt = computeExpiresAt(payload);
      await base44.entities.Broadcast.create(payload);
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
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, eventImage: file_url });
    } finally {
      setUploading(false);
    }
  };

  const isValidEventTime = type !== 'event' || (
    form.eventDate && form.eventEndTime && new Date(form.eventEndTime) > new Date(form.eventDate)
  );

  const canPost =
    form.title.trim().length >= 3 &&
    (type !== 'event' || (form.exactLocationText && isValidEventTime)) &&
    (type !== 'alert' || form.exactLocationText.trim().length > 0);

  return (
    <div className="px-5 pt-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All types
      </button>

      <div className="flex items-center gap-4 mb-8 bg-card/60 backdrop-blur-xl p-5 rounded-3xl border border-border/50 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-40 h-40 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2", `bg-${typeMeta.color}`)} />
        <SignalIcon type={type} size="lg" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-bold tracking-tight">{typeMeta.label}</h1>
          <p className="text-xs text-muted-foreground font-medium">{typeMeta.desc}</p>
        </div>
      </div>

      <div className="space-y-4">
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

        <div>
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={type === 'alert' ? 'Deer on I-70 near exit 252' : type === 'event' ? 'Sunday canyon run' : 'Who\'s rolling tonight?'}
            className="mt-1.5"
            maxLength={120}
          />
        </div>

        <div>
          <Label>Details</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Add context..."
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
              <Label>Photo (optional)</Label>
              <div className="mt-1.5">
                {form.eventImage ? (
                  <div className="relative">
                    <img src={form.eventImage} className="w-full h-40 object-cover rounded-lg" alt="" />
                    <button onClick={() => setForm({ ...form, eventImage: '' })} className="absolute top-2 right-2 px-2 py-1 bg-background/90 rounded text-xs">Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center h-24 border border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload photo'}
                    </div>
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        {type === 'alert' && (
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
        )}

        {(type === 'solo_ride' || type === 'iso') && (
          <div className="p-3 bg-accent/50 rounded-lg text-xs text-accent-foreground">
            <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
            Your location will be fuzzed and frozen at post time. No live tracking.
          </div>
        )}

        <Button
          onClick={() => post.mutate()}
          disabled={!canPost || post.isPending || !profile}
          className={cn('w-full h-12 rounded-full mt-4', type === 'alert' && 'bg-alert hover:bg-alert/90 text-alert-foreground')}
        >
          {post.isPending ? 'Broadcasting...' : `Broadcast ${typeMeta.label}`}
        </Button>
      </div>
    </div>
  );
}