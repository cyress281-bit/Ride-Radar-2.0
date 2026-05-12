/**
 * @fileoverview LandingPage - Marketing landing page for Ride Radar 2.0.
 *
 * Showcases the app's features with a feature grid, brand imagery,
 * and CTA buttons that route to /login.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Radio, Zap } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const FEATURES = [
  {
    type: 'solo_ride',
    label: 'Solo Ride',
    desc: 'Open ride signal',
    color: 'text-solo',
    border: 'border-solo/30',
    bg: 'bg-solo/5',
    accent: 'bg-solo',
    icon: Radio,
  },
  {
    type: 'iso',
    label: 'In Search Of',
    desc: 'Wrench or crew',
    color: 'text-iso',
    border: 'border-iso/30',
    bg: 'bg-iso/5',
    accent: 'bg-iso',
    icon: Zap,
  },
  {
    type: 'event',
    label: 'Events',
    desc: 'Stage a meetup',
    color: 'text-event',
    border: 'border-event/30',
    bg: 'bg-event/5',
    accent: 'bg-event',
    icon: MapPin,
  },
  {
    type: 'alert',
    label: 'Alerts',
    desc: 'Road hazards fast',
    color: 'text-alert',
    border: 'border-alert/30',
    bg: 'bg-alert/5',
    accent: 'bg-alert',
    icon: Zap,
  },
];

const SOCIAL_PROOF = [
  { value: '12K+', label: 'Active riders' },
  { value: '4.9', label: 'App store rating' },
  { value: '48', label: 'States covered' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-hidden relative">
      {/* Live ambient background */}
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%),linear-gradient(180deg,transparent,hsl(var(--background) / 0.55))]" />

      {/* Brand-colored radial glows */}
      <div
        className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-primary/10 ambient-glow"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 ambient-glow"
        style={{ animationDelay: '-4s' }}
      />
      <div
        className="absolute top-[30%] right-[5%] w-[400px] h-[400px] bg-cyan/8 ambient-glow"
        style={{ animationDelay: '-2s' }}
      />
      <div
        className="absolute bottom-[20%] left-[5%] w-[350px] h-[350px] bg-amber/6 ambient-glow"
        style={{ animationDelay: '-6s' }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <HStack gap={2.5} align="center">
          <RRLogo size="md" />
          <Text as="span" variant="h3" className="tracking-tight">
            Ride<span className="text-primary text-glow-green">Radar</span>
          </Text>
        </HStack>
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium active:scale-[0.96] rounded-full"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-16 flex flex-col justify-center">
        <VStack gap={8} className="max-w-2xl">
          <VStack gap={6}>
            {/* Live pill */}
            <div className="rr-chip mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" />
              Live rider broadcast network
            </div>

            <RRLogo size="fill" className="mb-2 max-h-[110px] w-full max-w-[320px]" />

            <Text as="h1" variant="h1" className="rr-heading text-5xl md:text-7xl leading-[0.94]">
              <span className="text-foreground">Signal out.</span>
              <br />
              <span className="text-primary text-glow-green">Find your ride.</span>
            </Text>

            <Text variant="body" color="muted" className="text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              A real-time radar for motorcyclists. Post a solo ride, find a mechanic,
              rally a crew, or drop an alert — all within your orbit.
            </Text>

            <VStack gap={3} className="items-stretch sm:flex-row sm:items-center">
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="rounded-full h-14 px-8 text-base font-semibold glow-green bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.96] transition-all duration-150 w-full sm:w-auto"
              >
                Get started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-[0.96] min-h-[44px] flex items-center justify-center"
              >
                Already riding? Sign in
              </button>
            </VStack>
          </VStack>

          {/* Social proof */}
          <HStack gap={6} className="flex-wrap">
            {SOCIAL_PROOF.map((item) => (
              <VStack key={item.label} gap={0.5}>
                <Text variant="h2" className="text-primary">{item.value}</Text>
                <Text variant="micro" color="muted">{item.label}</Text>
              </VStack>
            ))}
          </HStack>
        </VStack>

        {/* Feature highlights — horizontal scrollable */}
        <div className="mt-14 -mx-6 px-6">
          <Text variant="micro" color="muted" className="mb-4">Signal types</Text>
          <div className="flex gap-3 overflow-x-auto scroll-hide pb-2 -mx-6 px-6">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className={cn(
                  'shrink-0 w-[260px] p-6 rounded-[20px] border surface-card transition-all duration-200 hover:scale-[1.02] relative overflow-hidden group active:scale-[0.96]',
                  f.border
                )}
              >
                <div
                  className={cn(
                    'absolute top-4 bottom-4 left-0 w-[3px] rounded-full',
                    f.accent
                  )}
                />
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-current opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150 ${f.color}`}
                />
                <SignalIcon type={f.type} size="sm" className="mb-4 relative z-10" />
                <Text variant="h3" className="mb-1 relative z-10">{f.label}</Text>
                <Text variant="bodySm" color="muted" className="relative z-10">{f.desc}</Text>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-xs text-muted-foreground/50 text-center">
        © 2025 Ride Radar · Ride smart. Signal loud.
      </footer>
    </div>
  );
}
