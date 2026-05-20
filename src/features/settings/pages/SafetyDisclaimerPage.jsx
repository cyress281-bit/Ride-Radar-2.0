import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, TriangleAlert, Radio, AlertCircle } from 'lucide-react';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const LAST_UPDATED = 'May 2026';

export default function SafetyDisclaimerPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden surface-card">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-brand-emergency/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-brand-emergency/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-brand-emergency/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <Text variant="micro" className="text-brand-emergency font-bold uppercase tracking-wider">Safety Information</Text>
            <HStack align="center" gap={3}>
              <ShieldAlert className="h-8 w-8 text-brand-emergency" />
              <Text as="h1" variant="h2" color="default">Safety Disclaimer</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Ride Radar is a community awareness tool for motorcyclists. It is not an emergency service.
            </Text>
            <Text variant="caption" color="muted">Last updated: {LAST_UPDATED}</Text>
          </VStack>
        </div>

        {/* Sections */}
        <VStack gap={3} className="stagger-children">
          <DisclaimerSection title="In an emergency, call 911" icon={TriangleAlert} accent="emergency">
            <Text variant="caption" color="muted" className="leading-relaxed">
              If you or someone else is injured, in danger, involved in a crash, stranded in an unsafe
              location, or facing any emergency —{' '}
              <strong className="text-foreground">call 911 or the appropriate emergency service immediately.</strong>
            </Text>
            <Text variant="caption" color="muted" className="leading-relaxed mt-2">
              Do not use Ride Radar to request emergency assistance. The app is not monitored by emergency
              responders and cannot dispatch help.
            </Text>
          </DisclaimerSection>

          <DisclaimerSection title="What Ride Radar is not" icon={ShieldAlert} accent="emergency">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">Not an emergency response service</Text>
              <Text as="li" variant="caption" color="muted">Not a roadside assistance or rescue service</Text>
              <Text as="li" variant="caption" color="muted">Not a substitute for calling 911</Text>
              <Text as="li" variant="caption" color="muted">Not a law enforcement or traffic authority</Text>
              <Text as="li" variant="caption" color="muted">Not a medical service</Text>
            </ul>
          </DisclaimerSection>

          <DisclaimerSection title="Signal limitations" icon={Radio} accent="amber">
            <Text variant="caption" color="muted" className="leading-relaxed mb-2">
              Bike Down, Need Help, Road Warning, Ride Now, live rider presence, messaging, and community
              signals are awareness tools only.
            </Text>
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Signals may be delayed, inaccurate, incomplete, unavailable, or missed
              </Text>
              <Text as="li" variant="caption" color="muted">
                Availability depends on device settings, app permissions, connectivity, and GPS accuracy
              </Text>
              <Text as="li" variant="caption" color="muted">
                Ride Radar does not guarantee any alert will be received, seen, or acted on
              </Text>
              <Text as="li" variant="caption" color="muted">
                Ride Radar does not guarantee rider safety, rescue, response time, or signal accuracy
              </Text>
            </ul>
          </DisclaimerSection>

          <DisclaimerSection title="Your responsibility" icon={AlertCircle} accent="green">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">Ride safely and obey all traffic laws</Text>
              <Text as="li" variant="caption" color="muted">Use your own judgment — the app does not replace it</Text>
              <Text as="li" variant="caption" color="muted">
                <strong className="text-foreground">
                  Do not view, post, message, or interact with Ride Radar while actively operating a
                  motorcycle or any vehicle.
                </strong>
              </Text>
              <Text as="li" variant="caption" color="muted">
                You remain responsible for your own safety and decisions at all times
              </Text>
            </ul>
          </DisclaimerSection>
        </VStack>
      </VStack>
    </div>
  );
}

function DisclaimerSection({ title, children, icon: Icon, accent = 'green' }) {
  const accentStyles = {
    green: 'border-l-primary',
    amber: 'border-l-brand-amber',
    emergency: 'border-l-brand-emergency',
  };

  const iconStyles = {
    green: 'bg-primary/10 text-primary border-primary/20',
    amber: 'bg-brand-amber/10 text-brand-amber border-brand-amber/20',
    emergency: 'bg-brand-emergency/10 text-brand-emergency border-brand-emergency/20',
  };

  return (
    <section className={cn('surface-card p-5 border-l-2', accentStyles[accent])}>
      <HStack align="center" gap={2} className="mb-3">
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border', iconStyles[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <Text variant="h3" color="default">{title}</Text>
      </HStack>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
