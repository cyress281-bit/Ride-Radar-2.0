/**
 * Privacy Policy page for Ride Radar 2.0.
 *
 * Static content explaining data collection, usage, and user rights.
 * Clean readable layout with section cards.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';

const LAST_UPDATED = 'May 9, 2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        {/* Header */}
        <div className="surface-card p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={2} className="relative z-10">
            <Text variant="micro" color="primary">Ride Radar Privacy Policy</Text>
            <HStack align="center" gap={3}>
              <FileText className="h-8 w-8 text-primary" />
              <Text as="h1" variant="h2" color="default">Privacy Policy</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Ride Radar collects and stores account, profile, content, and app usage information
              needed to operate the app.
            </Text>
            <Text variant="caption" color="muted">Last updated: {LAST_UPDATED}</Text>
          </VStack>
        </div>

        {/* Sections */}
        <VStack gap={3}>
          <PolicySection title="Information we may collect">
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
                Approximate location information when needed for core app features
              </Text>
              <Text as="li" variant="caption" color="muted">
                Moderation and safety-related information such as reports, blocks, and deletion
                requests
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="How we use information">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">To provide account access and profile features</Text>
              <Text as="li" variant="caption" color="muted">To power broadcasts, events, alerts, messaging, and rider discovery</Text>
              <Text as="li" variant="caption" color="muted">To improve safety, moderation, and support</Text>
              <Text as="li" variant="caption" color="muted">To respond to account, privacy, and deletion requests</Text>
            </ul>
          </PolicySection>

          <PolicySection title="Public vs private information">
            <ul className="list-disc space-y-2 pl-5">
              <Text as="li" variant="caption" color="muted">
                Display name, avatar, bike details, and certain broadcast content may be visible to
                other users
              </Text>
              <Text as="li" variant="caption" color="muted">
                Email and private account identity information are not public
              </Text>
            </ul>
          </PolicySection>

          <PolicySection title="Account deletion">
            <Text variant="caption" color="muted">
              Users can request deletion from inside the app or through the public account deletion
              page. Data is permanently removed and cannot be recovered.
            </Text>
          </PolicySection>

          <PolicySection title="Support">
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

function PolicySection({ title, children }) {
  return (
    <section className="surface-card p-5">
      <Text variant="h3" color="default" className="mb-3">{title}</Text>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
