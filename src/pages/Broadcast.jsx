import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Users, Calendar, AlertTriangle, ArrowLeft, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeExpiresAt, fuzzLocation } from '@/lib/broadcastUtils';
import { useMyProfile } from '@/lib/useCurrentUser';

const TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Ping nearby riders for a 90-min window', icon: MapPin, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find a mechanic or a bike crew', icon: Users, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Rally, meet, ride together', icon: Calendar, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, incident — one-way broadcast', icon: AlertTriangle, color: 'alert' },
];

export default function Broadcast() {
  const [type, setType] = useState(null);
  const navigate = useNavigate();

  if (!type) {
    return (
      <div className="px-5 pt-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Broadcast</h1>
        <p className="text-sm text-muted-foreground mb-6">Signal out to the network</p>
        <div className="space-y-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className="w-full text-left p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                    `bg-${t.color} text-${t.color}-foreground`
                  )}>
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-0.5 group-hover:text-primary transition">{t.label}</div>
                    <div className="text-sm text-muted-foreground">{t.desc}</div>
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
  const Icon = typeMeta.icon;

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
        if (coords.lat != null) {
          const fuzzed = fuzzLocation(coords.lat, coords.lng);
          payload.frozenLat = fuzzed.lat;
          payload.frozenLng = fuzzed.lng;
        }
      }
      if (type === 'iso') payload.isoSubtype = form.isoSubtype;
      if (type === 'event') {
        payload.exactLocationText = form.exactLocationText;
        payload.eventDate = form.eventDate || undefined;
        payload.eventEndTime = form.eventEndTime || undefined;
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

  const canPost =
    form.title.trim().length >= 3 &&
    (type !== 'event' || (form.exactLocationText && form.eventDate && form.eventEndTime)) &&
    (type !== 'alert' || form.exactLocationText.trim().length > 0);

  return (
    <div className="px-5 pt-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All types
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', `bg-${typeMeta.color} text-${typeMeta.color}-foreground`)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{typeMeta.label}</h1>
          <p className="text-xs text-muted-foreground">{typeMeta.desc}</p>
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