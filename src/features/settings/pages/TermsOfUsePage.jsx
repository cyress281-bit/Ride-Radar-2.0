import { Link } from 'react-router-dom';
import { ArrowLeft, ScrollText, TriangleAlert, ListChecks, PenLine, MapPin, ShieldCheck, AlertCircle, Radio } from 'lucide-react';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const LAST_UPDATED = 'May 2026';

export default function TermsOfUsePage() {
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
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">Legal</Text>
            <HStack align="center" gap={3}>
              <ScrollText className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">Terms of Use</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              By using Ride Radar, you agree to these terms. Please read them.
            </Text>
            <Text variant="caption" color="muted">Last updated: {LAST_UPDATED}</Text>
          </VStack>
        </div>

        {/* Sections */}
        <VStack gap={3} className="stagger-children">

          <TermsSection title="What Ride Radar is" icon={Radio} accent="green">
            <VStack gap={2}>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Ride Radar is a motorcycle rider awareness, ride coordination, messaging, and community
                signal app. It helps riders discover nearby activity, coordinate rides, share signals,
                and communicate with other riders.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                It is not a replacement for emergency services, official traffic systems, or safe riding
                judgment.
              </Text>
            </VStack>
          </TermsSection>

          <TermsSection title="Not an emergency service" icon={TriangleAlert} accent="emergency">
            <VStack gap={2}>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Ride Radar is not 911, roadside assistance, law enforcement, medical help, or an
                emergency dispatch system. Do not use it to request emergency assistance.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                <strong className="text-foreground">
                  If someone is hurt, in danger, or involved in a crash, call 911 first.
                </strong>
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Read the full{' '}
                <Link
                  to="/safety-disclaimer"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  Safety Disclaimer
                </Link>
                .
              </Text>
            </VStack>
          </TermsSection>

          <TermsSection title="Acceptable use" icon={ListChecks} accent="green">
            <VStack gap={3}>
              <div>
                <Text variant="caption" className="font-semibold text-foreground mb-2 block">
                  You may:
                </Text>
                <ul className="list-disc space-y-1.5 pl-5">
                  <Text as="li" variant="caption" color="muted">
                    Post rides, meetups, signals, events, comments, messages, and photos
                  </Text>
                  <Text as="li" variant="caption" color="muted">
                    Connect with riders and use live presence when you choose to be visible
                  </Text>
                </ul>
              </div>
              <div>
                <Text variant="caption" className="font-semibold text-foreground mb-2 block">
                  You may not:
                </Text>
                <ul className="list-disc space-y-1.5 pl-5">
                  <Text as="li" variant="caption" color="muted">
                    Harass, threaten, stalk, impersonate, or abuse other riders
                  </Text>
                  <Text as="li" variant="caption" color="muted">
                    Post false, misleading, spammy, illegal, or dangerous content
                  </Text>
                  <Text as="li" variant="caption" color="muted">
                    Use Ride Radar to endanger yourself or others
                  </Text>
                  <Text as="li" variant="caption" color="muted">
                    <strong className="text-foreground">
                      Interact with the app while actively operating a motorcycle or vehicle
                    </strong>
                  </Text>
                  <Text as="li" variant="caption" color="muted">
                    Attempt to misuse, scrape, attack, reverse engineer, or disrupt the app
                  </Text>
                </ul>
              </div>
            </VStack>
          </TermsSection>

          <TermsSection title="User content" icon={PenLine} accent="green">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                You are responsible for what you post, send, upload, or share — including broadcasts,
                signals, comments, posts, photos, profile content, and messages
              </Text>
              <Text as="li" variant="caption" color="muted">
                By posting content, you give Ride Radar permission to store, display, transmit, and
                process that content as needed to operate the app
              </Text>
              <Text as="li" variant="caption" color="muted">
                You are responsible for the accuracy of signals and alerts you create
              </Text>
            </ul>
          </TermsSection>

          <TermsSection title="Location and live presence" icon={MapPin} accent="amber">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Some features use location or approximate location
              </Text>
              <Text as="li" variant="caption" color="muted">
                You control whether you share live presence or create location-based signals
              </Text>
              <Text as="li" variant="caption" color="muted">
                GPS, device settings, connectivity, permissions, and outages can affect accuracy
              </Text>
              <Text as="li" variant="caption" color="muted">
                Ride Radar does not guarantee that any location, signal, or rider status is accurate
                or current
              </Text>
            </ul>
          </TermsSection>

          <TermsSection title="Account suspension and termination" icon={ShieldCheck} accent="amber">
            <VStack gap={2}>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Ride Radar may remove content, restrict access, or suspend accounts that violate these
                terms, harm the community, create safety risks, or misuse the app.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                You can delete your own account at any time.{' '}
                <Link
                  to="/account-deletion"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  Delete my account
                </Link>
                .
              </Text>
            </VStack>
          </TermsSection>

          <TermsSection title="App limitations and no warranty" icon={AlertCircle} accent="emergency">
            <VStack gap={2}>
              <ul className="list-disc space-y-2 pl-5">
                <Text as="li" variant="caption" color="muted">
                  Ride Radar may be delayed, unavailable, inaccurate, interrupted, or contain errors
                </Text>
                <Text as="li" variant="caption" color="muted">
                  Ride Radar does not guarantee uptime, signal delivery, emergency response, rider
                  safety, rescue, or accuracy
                </Text>
                <Text as="li" variant="caption" color="muted">
                  You use the app at your own risk and remain responsible for your own decisions and
                  safety
                </Text>
              </ul>
              <Text variant="caption" color="muted" className="leading-relaxed mt-1">
                For data and privacy details, see the{' '}
                <Link
                  to="/privacy-policy"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  Privacy Policy
                </Link>
                .
              </Text>
            </VStack>
          </TermsSection>

        </VStack>
      </VStack>
    </div>
  );
}

function TermsSection({ title, children, icon: Icon, accent = 'green' }) {
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
