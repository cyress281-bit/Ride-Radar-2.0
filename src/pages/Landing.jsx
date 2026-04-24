import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { MapPin, Users, Radio, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import RRLogo from '@/components/RRLogo';

export default function Landing() {
  const login = () => base44.auth.redirectToLogin('/home');

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Radar grid */}
      <div className="absolute inset-0 radar-grid pointer-events-none" />

      {/* Green radial ambient glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <RRLogo size="md" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>
        <button
          onClick={login}
          className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-20 flex flex-col justify-center">
        <div className="max-w-2xl">
          {/* Live pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-xs font-semibold mb-8 glow-green-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" />
            Live rider broadcast network
          </div>

          <img src="https://media.base44.com/images/public/69eaf617762119e163948021/91e2e364b_Neonheartbeatmotorcyclelogo.png" alt="Hero Logo" className="w-full max-w-[320px] mb-6 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />

          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight leading-[0.98] mb-6">
            <span className="text-foreground">Signal out.</span>
            <br />
            <span className="text-primary text-glow-green">Find your ride.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl">
            A real-time radar for motorcyclists. Post a solo ride, find a mechanic,
            rally a crew, or drop an alert — all within your orbit.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={login}
              size="lg"
              className="rounded-full h-12 px-8 text-base font-semibold glow-green bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Button>
            <button onClick={login} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Already riding? Sign in
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-4 gap-3 mt-20">
          {[
            { icon: MapPin, label: 'Solo Ride', desc: 'Ping riders nearby', color: 'text-solo', border: 'border-solo/30', bg: 'bg-solo/8' },
            { icon: Users, label: 'In Search Of', desc: 'Mechanic or crew', color: 'text-iso', border: 'border-iso/30', bg: 'bg-iso/8' },
            { icon: Radio, label: 'Events', desc: 'Rally, meet, RSVP', color: 'text-event', border: 'border-event/30', bg: 'bg-event/8' },
            { icon: AlertTriangle, label: 'Alerts', desc: 'Road hazards fast', color: 'text-alert', border: 'border-alert/30', bg: 'bg-alert/8' },
          ].map((f) => (
            <div key={f.label} className={`p-5 rounded-2xl border ${f.border} ${f.bg} transition-all`}>
              <f.icon className={`w-5 h-5 ${f.color} mb-3`} />
              <div className="font-semibold text-sm mb-1">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-xs text-muted-foreground/50 text-center">
        © 2025 Ride Radar · Ride smart. Signal loud.
      </footer>
    </div>
  );
}