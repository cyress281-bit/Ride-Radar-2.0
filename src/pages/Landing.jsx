import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Radio, MapPin, Users, AlertTriangle } from 'lucide-react';

export default function Landing() {
  const login = () => base44.auth.redirectToLogin('/home');

  return (
    <div className="min-h-screen bg-background noise flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Radio className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Ride Radar</span>
        </div>
        <Button onClick={login} variant="ghost" size="sm">Sign in</Button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live rider broadcast network
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-6">
            Signal out.<br/>
            <span className="text-primary">Find your ride.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl">
            A real-time radar for motorcyclists. Post a solo ride, find a mechanic,
            rally a crew, or drop an alert — all within your orbit.
          </p>
          <Button onClick={login} size="lg" className="rounded-full h-12 px-8 text-base">
            Get started
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-20">
          {[
            { icon: MapPin, label: 'Solo Ride', desc: 'Ping riders nearby — 90 min window' },
            { icon: Users, label: 'In Search Of', desc: 'Mechanic or crew when you need one' },
            { icon: Radio, label: 'Events', desc: 'Rally, meet, RSVP' },
            { icon: AlertTriangle, label: 'Alerts', desc: 'Broadcast road hazards fast' },
          ].map((f) => (
            <div key={f.label} className="p-5 rounded-2xl bg-card border border-border/60">
              <f.icon className="w-5 h-5 text-primary mb-3" />
              <div className="font-semibold mb-1">{f.label}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-xs text-muted-foreground text-center">
        © 2025 Ride Radar
      </footer>
    </div>
  );
}