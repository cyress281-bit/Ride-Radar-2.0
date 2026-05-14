/**
 * @fileoverview LandingPage — Marketing landing page for Ride Radar 2.0.
 *
 * Celebrates all motorcycle OEM brands with a colorful, vibrant design.
 * Yamaha Blue · Kawasaki Green · Honda Red · Ducati Gold
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Radio, Zap, MapPin, AlertTriangle } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const FEATURES = [
  {
    type: 'solo_ride',
    label: 'Ride Now',
    desc: 'Open ride signal — let others know you\'re out there',
    brand: 'kawasaki',
    color: 'text-brand-kawasaki',
    border: 'border-brand-kawasaki/30',
    bg: 'bg-brand-kawasaki/5',
    accent: 'bg-brand-kawasaki',
    glow: 'shadow-[0_0_40px_hsl(var(--brand-kawasaki)/0.15)]',
    icon: Radio,
  },
  {
    type: 'iso',
    label: 'Need Help',
    desc: 'Need a wrench or looking for a crew?',
    brand: 'yamaha',
    color: 'text-brand-yamaha',
    border: 'border-brand-yamaha/30',
    bg: 'bg-brand-yamaha/5',
    accent: 'bg-brand-yamaha',
    glow: 'shadow-[0_0_40px_hsl(var(--brand-yamaha)/0.15)]',
    icon: Zap,
  },
  {
    type: 'event',
    label: 'Events',
    desc: 'Stage a meetup, ride out, or track day',
    brand: 'ducati',
    color: 'text-brand-ducati',
    border: 'border-brand-ducati/30',
    bg: 'bg-brand-ducati/5',
    accent: 'bg-brand-ducati',
    glow: 'shadow-[0_0_40px_hsl(var(--brand-ducati)/0.15)]',
    icon: MapPin,
  },
  {
    type: 'alert',
    label: 'Alerts',
    desc: 'Road hazards, crashes, debris — fast',
    brand: 'honda',
    color: 'text-brand-honda',
    border: 'border-brand-honda/30',
    bg: 'bg-brand-honda/5',
    accent: 'bg-brand-honda',
    glow: 'shadow-[0_0_40px_hsl(var(--brand-honda)/0.15)]',
    icon: AlertTriangle,
  },
];

const BRAND_PILLS = [
  { label: 'Kawasaki', color: 'bg-brand-kawasaki', text: 'text-brand-kawasaki' },
  { label: 'Yamaha', color: 'bg-brand-yamaha', text: 'text-brand-yamaha' },
  { label: 'Honda', color: 'bg-brand-honda', text: 'text-brand-honda' },
  { label: 'Ducati', color: 'bg-brand-ducati', text: 'text-brand-ducati' },
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
      {/* Multi-brand ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--brand-kawasaki)/0.08),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] bg-brand-yamaha/[0.04] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-brand-honda/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] max-w-[350px] max-h-[350px] bg-brand-ducati/[0.04] rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <HStack gap={2.5} align="center">
          <RRLogo size="md" />
          <Text as="span" variant="h3" className="tracking-tight">
            Ride<span className="text-brand-kawasaki">Radar</span>
          </Text>
        </HStack>
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium active:scale-[0.96] rounded-full"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-16 flex flex-col justify-center">
        <VStack gap={8} className="max-w-2xl">
          <VStack gap={6}>
            {/* Multi-brand rider pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-white/[0.06] w-fit">
              <div className="flex -space-x-1">
                {BRAND_PILLS.map((b) => (
                  <span key={b.label} className={cn('w-2 h-2 rounded-full border border-background', b.color)} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-medium">For riders of every brand</span>
            </div>

            <RRLogo size="fill" className="mb-2 max-h-[110px] w-full max-w-[320px]" />

            <Text as="h1" variant="h1" className="text-5xl md:text-7xl leading-[0.94]">
              <span className="text-foreground">Signal out.</span>
              <br />
              <span className="text-brand-kawasaki">Find your </span>
              <span className="text-brand-yamaha">ride.</span>
            </Text>

            <Text variant="body" color="muted" className="text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              A real-time radar for motorcyclists. Post a solo ride, find a mechanic,
              rally a crew, or drop an alert — all within your orbit.
            </Text>

            <VStack gap={3} className="items-stretch sm:flex-row sm:items-center">
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="rounded-full h-14 px-8 text-base font-semibold bg-white text-background hover:bg-white/90 active:scale-[0.96] transition-all duration-150 w-full sm:w-auto"
                style={{
                  boxShadow: '0 4px 24px rgba(255,255,255,0.12), 0 0 40px hsl(var(--brand-kawasaki)/0.2), 0 0 80px hsl(var(--brand-yamaha)/0.1)',
                }}
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
                <Text variant="h2" className="text-brand-ducati">{item.value}</Text>
                <Text variant="micro" color="muted">{item.label}</Text>
              </VStack>
            ))}
          </HStack>
        </VStack>

        {/* Feature highlights */}
        <div className="mt-14 -mx-6 px-6">
          <Text variant="micro" color="muted" className="mb-4 uppercase tracking-widest">Signal types</Text>
          <div className="flex gap-3 overflow-x-auto scroll-hide pb-2 -mx-6 px-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className={cn(
                    'shrink-0 w-[260px] p-6 rounded-[20px] border surface-card transition-all duration-200 hover:scale-[1.02] relative overflow-hidden group active:scale-[0.96]',
                    f.border,
                    f.glow
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-4 bottom-4 left-0 w-[3px] rounded-full',
                      f.accent
                    )}
                  />
                  <div
                    className={cn(
                      'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150 opacity-20',
                      f.bg
                    )}
                  />
                  <div className={cn('mb-4 relative z-10 flex items-center gap-2', f.color)}>
                    <div className={cn('flex items-center justify-center w-9 h-9 rounded-full', f.bg)}>
                      <Icon className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                  </div>
                  <Text variant="h3" className="mb-1 relative z-10">{f.label}</Text>
                  <Text variant="bodySm" color="muted" className="relative z-10">{f.desc}</Text>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-xs text-muted-foreground/50 text-center">
        © 2025 Ride Radar · Ride smart. Signal loud.
      </footer>
    </div>
  );
}
