/**
 * THEME PREVIEW PAGE — for visual QA only, no auth required
 * Route: /preview
 */
import { MapPin, Calendar, AlertTriangle, Radio, Bell, ArrowRight, Bike, Clock, Check, Heart, Wrench, Route, Search, CalendarClock, Gauge, Radar, MessagesSquare, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RRLogo from '@/components/RRLogo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const MOCK_BROADCASTS = [
  {
    id: '1', type: 'alert', title: 'Deer on I-70 near exit 252 — blind curve', body: 'Large deer spotted. High risk at speed. Caution.', exactLocationText: 'I-70 WB near Idaho Springs', created_date: new Date(Date.now() - 8 * 60000).toISOString(), expiresAt: new Date(Date.now() + 220 * 60000).toISOString(),
    author: { username: 'ridersafety', displayName: 'Rider Safety CO' }
  },
  {
    id: '2', type: 'solo_ride', title: "Who's rolling the canyon tonight?", body: 'Leaving Denver at 7pm, heading up 285 toward Kenosha.', frozenLat: 39.7, frozenLng: -105.0, created_date: new Date(Date.now() - 25 * 60000).toISOString(), expiresAt: new Date(Date.now() + 65 * 60000).toISOString(),
    author: { username: 'moto_jake', displayName: 'Jake R.' }
  },
  {
    id: '3', type: 'iso', isoSubtype: 'mechanic', title: 'Need a mechanic — clutch cable snapped', body: 'Stranded near Morrison. Can anyone help or point me to a shop?', frozenLat: 39.65, frozenLng: -105.19, created_date: new Date(Date.now() - 45 * 60000).toISOString(), expiresAt: new Date(Date.now() + 675 * 60000).toISOString(),
    author: { username: 'stranded_in_co', displayName: 'Stranded Rider' }
  },
  {
    id: '4', type: 'event', title: 'Sunday Canyon Run — Red Rocks Meetup', body: 'All styles welcome. Easy pace, great views. Parking lot 2.', exactLocationText: 'Red Rocks Park, Denver CO', eventDate: new Date(Date.now() + 2 * 86400000).toISOString(), created_date: new Date(Date.now() - 2 * 3600000).toISOString(), expiresAt: new Date(Date.now() + 54 * 3600000).toISOString(),
    author: { username: 'denverriders', displayName: 'Denver Riders Club' }
  },
];

const typeStyles = {
  alert: { card: 'bg-alert/5 border-alert/30', badge: 'bg-alert text-alert-foreground', icon: 'bg-alert text-alert-foreground', label: 'text-alert', topBar: 'bg-alert' },
  solo_ride: { card: 'bg-card border-border', badge: 'bg-solo text-solo-foreground', icon: 'bg-solo text-solo-foreground', label: 'text-solo', topBar: '' },
  iso: { card: 'bg-card border-border', badge: 'bg-iso text-iso-foreground', icon: 'bg-iso text-iso-foreground', label: 'text-primary', topBar: 'bg-primary/70' },
  event: { card: 'bg-card border-border', badge: 'bg-event text-event-foreground', icon: 'bg-event text-event-foreground', label: 'text-event', topBar: '' },
};
const iconMap = { solo_ride: Route, iso: Search, event: CalendarClock, alert: AlertTriangle };
const labelMap = { solo_ride: 'Solo Ride', iso: 'In Search Of', event: 'Event', alert: 'Alert' };

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
function timeLeft(iso) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'expired';
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  return `${Math.floor(diff / 3600)}h left`;
}

function MockCard({ b }) {
  const s = typeStyles[b.type];
  const Icon = iconMap[b.type];
  const subLabel = b.isoSubtype === 'mechanic' ? 'Mechanic' : b.isoSubtype === 'bike_crew' ? 'Bike Crew' : null;
  return (
    <div className={cn('relative rounded-[1.15rem] overflow-hidden rr-scanline', s.card, 'rr-surface')}>
      {b.type === 'alert' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-alert animate-pulse-alert" />}
      {b.type === 'iso' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/70" />}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.icon)}>
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-widest', s.label)}>
                {labelMap[b.type]}{subLabel && ` · ${subLabel}`}
              </span>
              <span className="text-muted-foreground text-xs">· {timeAgo(b.created_date)}</span>
            </div>
            <h3 className="font-semibold text-[15px] leading-tight mb-1 text-foreground">{b.title}</h3>
            {b.body && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{b.body}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-1">
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-secondary border border-border" />
                @{b.author.username}
              </span>
              {(b.type === 'event' || b.type === 'alert') && b.exactLocationText && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.exactLocationText}</span>
              )}
              {b.type === 'event' && b.eventDate && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              )}
              {b.isoSubtype === 'mechanic' && <Wrench className="w-3 h-3" />}
              <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{timeLeft(b.expiresAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_CONVOS = [
  { id: '1', displayName: 'Jake R.', username: 'moto_jake', type: 'connection', lastMsg: '25m ago', unread: true },
  { id: '2', displayName: 'Denver Riders Club', username: 'denverriders', type: 'friendship', lastMsg: '2h ago', unread: false },
  { id: '3', displayName: 'Stranded Rider', username: 'stranded_in_co', type: 'connection', lastMsg: '4h ago', unread: false },
];

const BROADCAST_TYPES = [
  { id: 'solo_ride', label: 'Solo Ride', desc: 'Open a live riding signal', icon: Route, color: 'solo' },
  { id: 'iso', label: 'In Search Of', desc: 'Find wrench help or a bike crew', icon: Search, color: 'iso' },
  { id: 'event', label: 'Event', desc: 'Stage a meetup or group ride', icon: CalendarClock, color: 'event' },
  { id: 'alert', label: 'Alert', desc: 'Road hazard, incident — one-way broadcast', icon: AlertTriangle, color: 'alert' },
];

const TABS = [
  { icon: Gauge, label: 'Radar' },
  { icon: Radar, label: 'Signal', active: false },
  { icon: MessagesSquare, label: 'Comms' },
  { icon: UserRound, label: 'Rider' },
];

function Section({ title, children }) {
  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary px-3">{title}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

export default function ThemePreview() {
  const { navigateToLogin } = useAuth();
  
  return (
    <div className="bg-background min-h-screen pb-20 relative">
      <div className="fixed inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.4))]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-2">
          <RRLogo size="lg" />
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>
        <p className="text-muted-foreground text-sm mb-12 font-medium">Theme Preview — premium dark rider-performance system</p>

        {/* ── LANDING ── */}
        <Section title="Landing Page">
          <div className="rounded-[1.35rem] rr-surface-strong overflow-hidden">
            <div className="relative p-8 bg-background radar-grid">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[150px] rounded-full bg-primary/8 blur-[60px]" />
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-8">
                  <RRLogo size="md" />
                  <span className="font-display font-bold text-xl">Ride<span className="text-primary text-glow-green">Radar</span></span>
                  <button onClick={() => navigateToLogin('/home')} className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</button>
                </div>
                <div className="rr-chip mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Live rider broadcast network
                </div>
                <h1 className="rr-heading text-4xl leading-[0.96] mb-4">
                  Signal out.<br /><span className="text-primary text-glow-green">Find your ride.</span>
                </h1>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">A real-time radar for motorcyclists. Post a solo ride, find a mechanic, rally a crew, or drop an alert.</p>
                <Button onClick={() => navigateToLogin('/home')} className="rounded-full glow-green h-11 px-6">Get started <ArrowRight className="w-4 h-4" /></Button>
                <div className="grid grid-cols-4 gap-2 mt-8">
                  {[
                    { icon: Route, label: 'Solo Ride', c: 'text-solo', b: 'border-solo/30', bg: 'bg-solo/8' },
                    { icon: Search, label: 'ISO', c: 'text-iso', b: 'border-iso/30', bg: 'bg-iso/8' },
                    { icon: CalendarClock, label: 'Events', c: 'text-event', b: 'border-event/30', bg: 'bg-event/8' },
                    { icon: AlertTriangle, label: 'Alerts', c: 'text-alert', b: 'border-alert/30', bg: 'bg-alert/8' },
                  ].map((f) => (
                    <div key={f.label} className={cn('p-3 rounded-xl border', f.b, f.bg)}>
                      <f.icon className={cn('w-4 h-4 mb-1.5', f.c)} />
                      <div className="text-xs font-semibold">{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── HOME FEED ── */}
        <Section title="Home Feed">
          {/* Top bar */}
          <div className="rounded-t-2xl border border-b-0 border-border bg-background/85 backdrop-blur-xl px-5 h-14 flex items-center justify-between mb-0">
            <div className="flex items-center gap-2">
              <RRLogo size="sm" />
              <span className="font-display font-bold text-lg">Ride<span className="text-primary">Radar</span></span>
            </div>
            <div className="flex gap-1">
              <div className="p-2 rounded-full text-muted-foreground"><Bell className="w-5 h-5" /></div>
            </div>
          </div>
          <div className="border border-t-0 border-border/70 bg-background rounded-b-2xl p-5 space-y-3">
            <div className="flex items-end justify-between mb-3">
              <div>
                <h1 className="rr-heading text-3xl">Radar</h1>
                <p className="text-xs text-muted-foreground">Live signals in your area</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Live
              </div>
            </div>
            {MOCK_BROADCASTS.map((b) => <MockCard key={b.id} b={b} />)}
          </div>
        </Section>

        {/* ── BROADCAST CREATION ── */}
        <Section title="Broadcast Creation">
          <div className="rounded-[1.35rem] rr-surface-strong p-5">
            <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Broadcast</h1>
            <p className="text-sm text-muted-foreground mb-5">Signal out to the network</p>
            <div className="space-y-3">
              {BROADCAST_TYPES.map((t) => {
                const Icon = t.icon;
                const colorStyles = {
                  solo: 'bg-solo text-solo-foreground',
                  iso: 'bg-iso text-iso-foreground',
                  event: 'bg-event text-event-foreground',
                  alert: 'bg-alert text-alert-foreground',
                };
                return (
                  <div key={t.id} className="w-full text-left p-4 rounded-[1.15rem] rr-surface hover:border-primary/40 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colorStyles[t.color])}>
                        <Icon className="w-5 h-5" strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="font-semibold text-base mb-0.5">{t.label}</div>
                        <div className="text-sm text-muted-foreground">{t.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── MESSAGES ── */}
        <Section title="Messages">
          <div className="rounded-[1.35rem] rr-surface-strong p-5">
            <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Messages</h1>
            <p className="text-sm text-muted-foreground mb-5">Active threads and conversations</p>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Active</div>
            <div className="space-y-2">
              {MOCK_CONVOS.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl rr-surface">
                  <div className={cn('w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center font-semibold shrink-0', c.unread && 'border-primary/50')}>
                    {c.displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.displayName}</div>
                    <div className="text-xs text-muted-foreground">{c.type === 'connection' ? 'Connection thread' : 'Friend'} · {c.lastMsg}</div>
                  </div>
                  {c.unread && <div className="w-2 h-2 rounded-full bg-primary glow-green-sm shrink-0" />}
                  {c.type === 'connection' && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" /> 72h
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── PROFILE ── */}
        <Section title="Profile">
          <div className="rounded-[1.35rem] rr-surface-strong p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center font-display font-bold text-2xl text-primary-foreground glow-green-sm">
                J
              </div>
              <div className="flex-1 pt-1">
                <div className="font-display text-2xl font-bold tracking-tight">Jake Rider</div>
                <div className="text-sm text-muted-foreground">@moto_jake</div>
                <div className="text-xs text-muted-foreground mt-1">Denver, CO</div>
              </div>
            </div>
            <p className="text-[15px] mb-4 leading-relaxed text-muted-foreground">Weekend canyon carver. Adventure tourer on weekdays.</p>
            <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-secondary/50 text-sm">
              <Bike className="w-4 h-4 text-muted-foreground" />
              <span>2022 Triumph Speed Triple 1200</span>
              <span className="ml-auto text-xs text-muted-foreground capitalize">street</span>
            </div>
            <div className="flex gap-2 mb-6">
              <Button variant="outline" className="flex-1 rounded-full">Settings</Button>
              <Button variant="outline" className="rounded-full px-3">
                <UserRound className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Active broadcasts</div>
            <MockCard b={MOCK_BROADCASTS[1]} />
          </div>
        </Section>

        {/* ── TAB BAR ── */}
        <Section title="Bottom Tab Bar">
          <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-xl overflow-hidden">
            <div className="grid grid-cols-4">
              {TABS.map((t, i) => {
                const Icon = t.icon;
                const active = i === 0;
                return (
                  <div key={t.label} className="flex flex-col items-center gap-1 py-4 transition-colors">
                    <div className={cn('p-1.5 rounded-lg', active ? 'text-primary' : 'text-muted-foreground')}>
                      <Icon
                        className="w-[22px] h-[22px]"
                        strokeWidth={active ? 2.5 : 2}
                        style={active ? { filter: 'drop-shadow(0 0 5px hsl(142 100% 47% / 0.7))' } : {}}
                      />
                    </div>
                    <span className={cn('text-[10px] tracking-wide font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-border" />
            <div className="px-4 py-2 text-[10px] text-muted-foreground/40 text-center">Active = Home (neon green glow)</div>
          </div>
          {/* Second tab bar showing Broadcast active */}
          <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-xl overflow-hidden mt-3">
            <div className="grid grid-cols-4">
              {TABS.map((t, i) => {
                const Icon = t.icon;
                const active = i === 1;
                return (
                  <div key={t.label} className="flex flex-col items-center gap-1 py-4 transition-colors">
                    <div className={cn('p-1.5 rounded-lg', active ? 'text-primary' : 'text-muted-foreground')}>
                      <Icon
                        className="w-[22px] h-[22px]"
                        strokeWidth={active ? 2.5 : 2}
                        style={active ? { filter: 'drop-shadow(0 0 5px hsl(142 100% 47% / 0.7))' } : {}}
                      />
                    </div>
                    <span className={cn('text-[10px] tracking-wide font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-border" />
            <div className="px-4 py-2 text-[10px] text-muted-foreground/40 text-center">Active = Broadcast</div>
          </div>
        </Section>

        {/* ── BUTTONS & COMPONENTS ── */}
        <Section title="Buttons, Inputs & Chips">
          <div className="rounded-2xl border border-border bg-background p-6 space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full glow-green">Primary CTA</Button>
              <Button variant="outline" className="rounded-full">Secondary</Button>
              <Button variant="ghost" className="rounded-full">Ghost</Button>
              <Button variant="destructive" className="rounded-full">Danger</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['street', 'sport', 'adventure', 'offroad'].map(s => (
                <span key={s} className={cn('px-3 py-1 rounded-full text-xs font-semibold border', s === 'street' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground')}>
                  {s}
                </span>
              ))}
            </div>
            <Input placeholder="Search riders, broadcasts..." />
            <div className="flex gap-3">
              <Button variant={true ? 'default' : 'outline'} className="flex-1 h-11 rounded-full">
                <Heart className="w-4 h-4 mr-1.5" /> Interested · 4
              </Button>
              <Button variant="outline" className="flex-1 h-11 rounded-full">
                <Check className="w-4 h-4 mr-1.5" /> Going · 12
              </Button>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}