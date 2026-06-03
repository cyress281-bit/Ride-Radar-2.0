import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  TriangleAlert,
  Ban,
  ShieldCheck,
  Eye,
  Radio,
} from 'lucide-react';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const LAST_UPDATED = 'May 2026';

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="relative overflow-hidden surface-card">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">
              Community
            </Text>
            <HStack align="center" gap={3}>
              <HeartHandshake className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">
                Community Guidelines
              </Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Ride Radar works best when riders treat each other with respect. These guidelines
              keep the community safe, useful, and welcoming.
            </Text>
            <Text variant="caption" color="muted">Last updated: {LAST_UPDATED}</Text>
          </VStack>
        </div>

        {/* Sections */}
        <VStack gap={3} className="stagger-children">
          <GuidelineSection title="Be respectful" icon={HeartHandshake} accent="green">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Treat other riders the way you would want to be treated on the road
              </Text>
              <Text as="li" variant="caption" color="muted">
                Disagreements happen — keep them civil and avoid personal attacks
              </Text>
              <Text as="li" variant="caption" color="muted">
                Help newcomers. Everyone was a new rider once
              </Text>
            </ul>
          </GuidelineSection>

          <GuidelineSection title="No harassment or abuse" icon={Ban} accent="emergency">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Do not harass, threaten, stalk, intimidate, or abuse other riders
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not send unwanted repeated messages or connection requests
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not target someone based on their identity, riding style, or background
              </Text>
            </ul>
          </GuidelineSection>

          <GuidelineSection title="No spam or misleading content" icon={Radio} accent="amber">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Do not post spam, scams, phishing links, or promotional content unrelated to riding
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not create false signals, fake meetups, or misleading alerts
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not misuse Bike Down or emergency-style alerts for non-emergencies
              </Text>
            </ul>
          </GuidelineSection>

          <GuidelineSection title="No dangerous or illegal activity" icon={TriangleAlert} accent="emergency">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Do not use Ride Radar while actively operating a motorcycle or vehicle
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not post content that encourages reckless, illegal, or dangerous riding
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not use the app to plan or promote illegal activity of any kind
              </Text>
            </ul>
          </GuidelineSection>

          <GuidelineSection title="No impersonation or doxxing" icon={Eye} accent="amber">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Do not impersonate other riders, admins, brands, or organizations
              </Text>
              <Text as="li" variant="caption" color="muted">
                Do not share someone else&apos;s private information without consent
              </Text>
              <Text as="li" variant="caption" color="muted">
                Use your real identity or a consistent rider persona — fake profiles undermine trust
              </Text>
            </ul>
          </GuidelineSection>

          <GuidelineSection title="Enforcement" icon={ShieldCheck} accent="green">
            <VStack gap={2}>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Violations of these guidelines may result in content removal, temporary
                restrictions, or permanent account suspension. Decisions are made by Ride Radar
                moderators to protect the community.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                If you see something that breaks these rules, report it from the user&apos;s profile
                or the content menu. Reports are reviewed within 24 hours.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                For the full legal terms, see the{' '}
                <Link
                  to="/terms-of-use"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  Terms of Use
                </Link>
                .
              </Text>
            </VStack>
          </GuidelineSection>
        </VStack>
      </VStack>
    </div>
  );
}

function GuidelineSection({ title, children, icon: Icon, accent = 'green' }) {
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
