/**
 * Privacy Policy page for Ride Radar 2.0.
 *
 * Static content explaining data collection, usage, and user rights.
 * Electric Neon Green redesign with neon accents on headers.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Eye, Database, UserX, Mail, MapPin } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const LAST_UPDATED = 'May 9, 2026';

export default function PrivacyPolicyPage() {
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
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">Ride Radar Privacy Policy</Text>
            <HStack align="center" gap={3}>
              <FileText className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">Privacy Policy</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Ride Radar collects and stores account, profile, content, and app usage information
              needed to operate the app.
            </Text>
            <Text variant="caption" color="muted">Last updated: {LAST_UPDATED}</Text>
          </VStack>
        </div>

        {/* Sections */}
        <VStack gap={3} className="stagger-children">
          <PolicySection title="Information we may collect" icon={Database} accent="green">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Account information such as email and name from login providers
              </Text>
              <Text as="li" variant="caption" color="muted">
                Profile information such as display name, avatar, bike details, and approximate area
              </Text>
              <Text as="li" variant="caption" color="muted">
                User-generated content such as broadcasts, event posters, alert photos, bike photos,
                reports, and messages
              </Text>
              <Text as="li" variant="caption" color="muted">
                Approximate location information for nearby signals, rider discovery, and live map features
              </Text>
              <Text as="li" variant="caption" color="muted">
                Precise location when you choose precise sharing or use exact pin/location flows
              </Text>
              <Text as="li" variant="caption" color="muted">
                Moderation and safety-related information such as reports, blocks, and deletion
                requests
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="How we use information" icon={Eye} accent="radar">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">To provide account access and profile features</Text>
              <Text as="li" variant="caption" color="muted">To power broadcasts, events, alerts, messaging, and rider discovery</Text>
              <Text as="li" variant="caption" color="muted">To improve safety, moderation, and support</Text>
              <Text as="li" variant="caption" color="muted">To respond to account, privacy, and deletion requests</Text>
              <Text as="li" variant="caption" color="muted">
                To operate, secure, diagnose, and improve the app through analytics and crash reporting when configured or enabled, including Plausible and Sentry where used
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="Public vs private information" icon={Shield} accent="amber">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Public or visible in-app information may include profile basics, avatars, bike details, broadcasts,
                events, comments, RSVPs, and other participation-style actions where shown
              </Text>
              <Text as="li" variant="caption" color="muted">
                Private or limited information includes account email, direct messages, moderation data, deletion requests,
                and internal diagnostics
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="Location and visibility" icon={MapPin} accent="radar">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Approximate location may be used for nearby signals, rider discovery, and standard live map presence
              </Text>
              <Text as="li" variant="caption" color="muted">
                Precise location may be used only when you choose precise sharing or use exact pin/location flows
              </Text>
              <Text as="li" variant="caption" color="muted">
                Bike Down can use exact pin or current-location coordinates when you submit it that way
              </Text>
              <Text as="li" variant="caption" color="muted">
                Planned meetup/event pins can be exact when confirmed or adjusted on the map
              </Text>
              <Text as="li" variant="caption" color="muted">
                Ride Now live presence is separate from normal Ride Now broadcasts and may share live visibility or
                location while enabled
              </Text>
              <Text as="li" variant="caption" color="muted">
                Some location details may be visible to other users depending on signal type and privacy settings
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="Account deletion" icon={UserX} accent="emergency">
            <VStack gap={2.5}>
              <Text variant="caption" color="muted" className="leading-relaxed">
                You can delete your account at any time from inside the app. Go to{' '}
                <strong className="text-foreground">Settings → Delete Account</strong> and type DELETE to
                confirm.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                Deletion removes or anonymizes account and profile data and associated in-app content according to
                the current deletion process. Some data may be retained where required for legal, security, abuse
                prevention, backup, or operational reasons. Items removed from the app may still remain in backups
                or logs temporarily while systems process the request.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                If you cannot access the app, email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Data Deletion Request')}&body=${encodeURIComponent('Please delete the account associated with this email address.')}`}
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
                {' '}with the email address associated with your account and request data deletion. We will
                process your request within 30 days.
              </Text>
            </VStack>
          </PolicySection>

          <PolicySection title="Support" icon={Mail} accent="green">
            <Text variant="caption" color="muted">
              For privacy or support questions, contact:
              <br />
              <a
                className="text-primary underline hover:text-primary/80 transition-colors"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>
            </Text>
          </PolicySection>
        </VStack>
      </VStack>
    </div>
  );
}

function PolicySection({ title, children, icon: Icon, accent = 'green' }) {
  const accentStyles = {
    green: 'border-l-primary',
    radar: 'border-l-brand-radar',
    amber: 'border-l-brand-amber',
    emergency: 'border-l-brand-emergency',
  };

  const iconStyles = {
    green: 'bg-primary/10 text-primary border-primary/20',
    radar: 'bg-brand-radar/10 text-brand-radar border-brand-radar/20',
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
