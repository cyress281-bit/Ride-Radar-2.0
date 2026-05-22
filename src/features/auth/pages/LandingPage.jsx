/**
 * @fileoverview LandingPage — Marketing landing page for Ride Radar 2.0.
 *
 * Celebrates all motorcycle OEM brands with a colorful, vibrant design.
 * Yamaha Blue · Kawasaki Green · Honda Red · Ducati Gold
 */

import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
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
  const { isAuthenticated } = useAuthState();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const heroPanelClass = 'relative overflow-hidden rounded-[32px] border border-white/[0.07] bg-white/[0.035] px-6 py-7 shadow-[0_24px_90px_hsl(0_0%_0%/0.34),inset_0_1px_0_hsl(0_0%_100%/0.05)] backdrop-blur-2xl md:px-8 md:py-8';
  const featureCardClass = 'group shrink-0 w-[260px] overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-5 shadow-[0_18px_60px_hsl(0_0%_0%/0.28),inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] relative';

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-hidden relative pb-safe">
      {/* Multi-brand ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(var(--primary)/0.16),transparent_30%),radial-gradient(circle_at_18%_78%,hsl(var(--brand-yamaha)/0.06),transparent_24%),radial-gradient(circle_at_82%_12%,hsl(var(--brand-ducati)/0.05),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.98)_58%,hsl(var(--background))_100%)]" />
        <div className="absolute inset-0 radar-grid-animated opacity-[0.08]" />
        <div className="absolute left-1/2 top-[18%] h-[480px] w-[480px] -translate-x-1/2 rounded-full border border-primary/[0.07] opacity-60 blur-[1px]" />
        <div className="absolute left-1/2 top-[24%] h-[280px] w-[280px] -translate-x-1/2 rounded-full border border-primary/[0.10] opacity-35" />
        <div className="absolute left-1/2 top-[24%] h-[280px] w-[2px] -translate-x-1/2 bg-[linear-gradient(180deg,transparent,hsl(var(--primary)/0.28),transparent)] opacity-45" />
        <div className="absolute bottom-[-6%] right-[-4%] h-[420px] w-[420px] rounded-full bg-brand-ducati/[0.04] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-2 shadow-[0_12px_32px_hsl(0_0%_0%/0.22)] backdrop-blur-xl">
          <RRLogo size="md" />
          <Text as="span" variant="h3" className="tracking-tight">
            Ride<span className="text-brand-kawasaki">Radar</span>
          </Text>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/login')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium active:scale-[0.96] rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 md:py-16 flex flex-col justify-center">
        <VStack gap={8} className="max-w-3xl">
          <div className={heroPanelClass}>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0%_0%,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_100%_0%,hsl(var(--brand-yamaha)/0.07),transparent_26%),linear-gradient(135deg,transparent,transparent_52%,hsl(var(--primary)/0.05))]" />
            <VStack gap={6} className="relative z-10">
            {/* Multi-brand rider pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-white/[0.06] w-fit">
              <div className="flex -space-x-1">
                {BRAND_PILLS.map((b) => (
                  <span key={b.label} className={cn('w-2 h-2 rounded-full border border-background', b.color)} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-medium">For riders of every brand</span>
            </div>

            <RRLogo size="fill" className="mb-2 max-h-[110px] w-full max-w-[320px] drop-shadow-[0_0_28px_hsl(var(--primary)/0.16)]" />

            <Text as="h1" variant="h1" className="text-5xl md:text-7xl leading-[0.94]">
              <span className="text-foreground">Find riders.</span>
              <br />
              <span className="text-brand-kawasaki">Send signals.</span>
              <br />
              <span className="text-brand-yamaha">Stay connected.</span>
            </Text>

            <Text variant="body" color="muted" className="text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              A real-time radar for motorcyclists. Broadcast a ride, find help, rally a crew,
              or drop an alert - all within your orbit.
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
          </div>

          {/* Social proof */}
          <HStack gap={3} className="flex-wrap">
            {SOCIAL_PROOF.map((item) => (
              <VStack key={item.label} gap={0.5} className="min-w-[96px] rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 shadow-[0_14px_36px_hsl(0_0%_0%/0.22)] backdrop-blur-xl">
                <Text variant="h2" className="text-brand-ducati">{item.value}</Text>
                <Text variant="micro" color="muted">{item.label}</Text>
              </VStack>
            ))}
          </HStack>
        </VStack>

        {/* Feature highlights */}
        <div className="mt-14 -mx-6 px-6">
          <HStack justify="between" align="end" className="mb-4">
            <div>
              <Text variant="micro" color="muted" className="uppercase tracking-widest">Signal types</Text>
              <Text variant="bodySm" color="muted" className="mt-1 max-w-lg">
                The core tools riders use to move together, get help, and stay aware.
              </Text>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-green" />
              Live preview
            </div>
          </HStack>
          <div className="flex gap-3 overflow-x-auto scroll-hide pb-2 -mx-6 px-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className={cn(
                    featureCardClass,
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
                      'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150 opacity-16',
                      f.bg
                    )}
                  />
                  <div className={cn('mb-4 relative z-10 flex items-center gap-2', f.color)}>
                    <div className={cn('flex items-center justify-center w-9 h-9 rounded-full border border-white/[0.06] bg-black/20', f.border)}>
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

      <footer className="relative z-10 px-6 py-5 text-xs text-muted-foreground/50 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/terms-of-use" className="hover:text-muted-foreground transition-colors">Terms of Use</Link>
          <span>·</span>
          <Link to="/privacy-policy" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/community-guidelines" className="hover:text-muted-foreground transition-colors">Community Guidelines</Link>
          <span>·</span>
          <Link to="/safety-disclaimer" className="hover:text-muted-foreground transition-colors">Safety Disclaimer</Link>
        </div>
        <div>© 2025 Ride Radar · Ride smart. Signal loud.</div>
      </footer>
    </div>
  );
}
