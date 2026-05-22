import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeInfo,
  Clock3,
  BellRing,
  LifeBuoy,
  TriangleAlert,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';

const LAST_UPDATED = 'May 2026';

const sections = [
  {
    title: 'Beta status and expectations',
    icon: BadgeInfo,
    body: [
      'Ride Radar beta is a real-world test build. Features may change, intermittent bugs can happen, and some flows are still being refined.',
      'Please treat the app as a community awareness tool, not a guaranteed source of truth or emergency service.',
    ],
  },
  {
    title: 'Current known issues',
    icon: TriangleAlert,
    body: [
      'Known issues and limitations are updated manually as we learn about them during beta.',
      'If something looks wrong, check this page first and then send a report if it is not already listed here.',
    ],
  },
  {
    title: 'Update and refresh behavior',
    icon: BellRing,
    body: [
      'When a new build is available, Ride Radar may show an update banner with a Refresh button.',
      'Refreshing loads the latest build and helps recover from stale app state after a resume, reconnect, or PWA update.',
      'If the app looks stuck after an update, use the banner first before assuming your data is missing.',
    ],
  },
  {
    title: 'How to report bugs',
    icon: LifeBuoy,
    body: [
      'Use Settings > Report an Issue / Feedback to send a structured bug report by email.',
      'If the issue is urgent or safety-related, use the support contact shown in Settings or Support.',
    ],
  },
  {
    title: 'What to include in reports',
    icon: Clock3,
    body: [
      'What happened, what you expected, and the exact steps to reproduce it.',
      'Include the app version, device/platform, screenshot if possible, and whether it happened after an update or reconnect.',
      'If the issue involves location, mention whether it was approximate, precise, or happened after resuming the app.',
    ],
  },
  {
    title: 'Support window',
    icon: LifeBuoy,
    body: [
      'We typically respond within 24-48 hours during beta.',
      'For emergencies, do not wait for a reply. Call 911 or the appropriate emergency service immediately.',
    ],
  },
];

export default function BetaNotesPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="relative overflow-hidden surface-card">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">
              Beta operations
            </Text>
            <HStack align="center" gap={3}>
              <Sparkles className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">
                Beta Notes
              </Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              A lightweight guide for beta testers: what to expect, what is already known, and how to report issues.
            </Text>
            <Text variant="caption" color="muted">
              Last updated: {LAST_UPDATED}
            </Text>
          </VStack>
        </div>

        <div className="surface-card p-5 border-primary/15 bg-primary/[0.03]">
          <HStack align="center" gap={2} className="mb-2">
            <ShieldAlert className="h-4 w-4 text-brand-emergency" />
            <Text variant="bodySm" className="font-semibold text-brand-emergency">
              Safety reminder
            </Text>
          </HStack>
          <Text variant="caption" color="muted" className="leading-relaxed">
            Ride Radar is not an emergency dispatch service. If someone is injured, in danger, or needs immediate help,
            call 911 or the appropriate emergency service first.
          </Text>
        </div>

        <VStack gap={3} className="stagger-children">
          {sections.map((section) => (
            <NotesSection key={section.title} title={section.title} icon={section.icon}>
              <ul className="list-disc space-y-2 pl-5">
                {section.body.map((line) => (
                  <Text key={line} as="li" variant="caption" color="muted" className="leading-relaxed">
                    {line}
                  </Text>
                ))}
              </ul>
            </NotesSection>
          ))}

          <NotesSection title="Recent changes" icon={Sparkles}>
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted" className="leading-relaxed">
                Improved app resume recovery for stale or suspended sessions.
              </Text>
              <Text as="li" variant="caption" color="muted" className="leading-relaxed">
                Added stronger account deletion and local cache cleanup behavior.
              </Text>
              <Text as="li" variant="caption" color="muted" className="leading-relaxed">
                Hardened moderation and realtime health visibility for internal operations.
              </Text>
            </ul>
          </NotesSection>
        </VStack>
      </VStack>
    </div>
  );
}

function NotesSection({ title, children, icon: Icon }) {
  return (
    <section className="surface-card p-5">
      <HStack align="center" gap={2} className="mb-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <Text variant="h3" color="default">
          {title}
        </Text>
      </HStack>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
