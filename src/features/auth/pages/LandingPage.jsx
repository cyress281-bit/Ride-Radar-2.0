/**
 * @fileoverview LandingPage - Marketing landing page for Ride Radar 2.0.
 *
 * Showcases the app's features with a feature grid, brand imagery,
 * and CTA buttons that route to /login.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import SignalIcon from '@/components/brand/SignalIcon';

const FEATURES = [
  {
    type: 'solo_ride',
    label: 'Solo Ride',
    desc: 'Open ride signal',
    color: 'text-solo',
    border: 'border-solo/30',
    bg: 'bg-solo/5',
  },
  {
    type: 'iso',
    label: 'In Search Of',
    desc: 'Wrench or crew',
    color: 'text-iso',
    border: 'border-iso/30',
    bg: 'bg-iso/5',
  },
  {
    type: 'event',
    label: 'Events',
    desc: 'Stage a meetup',
    color: 'text-event',
    border: 'border-event/30',
    bg: 'bg-event/5',
  },
  {
    type: 'alert',
    label: 'Alerts',
    desc: 'Road hazards fast',
    color: 'text-alert',
    border: 'border-alert/30',
    bg: 'bg-alert/5',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-hidden relative">
      {/* Live ambient background */}
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%),linear-gradient(180deg,transparent,hsl(var(--background) / 0.55))]" />
      <div
        className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-primary/10 ambient-glow"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 ambient-glow"
        style={{ animationDelay: '-4s' }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <RRLogo size="md" />
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-20 flex flex-col justify-center">
        <div className="max-w-2xl">
          {/* Live pill */}
          <div className="rr-chip mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" />
            Live rider broadcast network
          </div>

          <RRLogo size="fill" className="mb-6 max-h-[110px] w-full max-w-[320px]" />

          <h1 className="rr-heading text-5xl md:text-7xl leading-[0.94] mb-6">
            <span className="text-foreground">Signal out.</span>
            <br />
            <span className="text-primary text-glow-green">Find your ride.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl font-medium">
            A real-time radar for motorcyclists. Post a solo ride, find a mechanic,
            rally a crew, or drop an alert — all within your orbit.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="rounded-full h-12 px-8 text-base font-semibold glow-green bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Already riding? Sign in
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className={`p-6 rounded-[1.15rem] border ${f.border} ${f.bg} transition-all duration-300 hover:scale-[1.02] rr-surface relative overflow-hidden group`}
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-current opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150 ${f.color}`}
              />
              <SignalIcon type={f.type} size="sm" className="mb-4 relative z-10" />
              <div className="font-semibold text-[15px] mb-1.5 relative z-10">{f.label}</div>
              <div className="text-sm text-muted-foreground relative z-10">{f.desc}</div>
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
