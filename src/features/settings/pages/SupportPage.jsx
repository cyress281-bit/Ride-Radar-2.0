/**
 * Support page for Ride Radar 2.0.
 *
 * Provides contact information and FAQ accordion.
 * Electric Neon Green redesign with neon accents and glassmorphism.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, HelpCircle, MessageSquare, ChevronDown, Zap, Clock, MapPin, Shield, Trash2 } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const FAQS = [
  {
    q: 'How do I update my profile?',
    a: 'Go to your Profile tab, tap Edit, and update your display name, avatar, and bike details.',
    icon: Zap,
  },
  {
    q: 'How does the live map work?',
    a: 'Enable "Show me on the live map" in Settings. You can choose Approximate (fuzzed) or Precise location.',
    icon: MapPin,
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Visit Settings > Delete Account to permanently remove your data.',
    icon: Trash2,
  },
  {
    q: 'How do I report a user?',
    a: "Open the user's profile and tap the menu to find the report option.",
    icon: Shield,
  },
  {
    q: 'Official event review',
    a: 'Open the event detail page and tap Request official review. Official badges are reviewed by Ride Radar admins and are not user-assigned. If you need help, contact support.',
    icon: Shield,
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

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
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">Help & Support</Text>
            <HStack align="center" gap={3}>
              <HelpCircle className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">Support</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Need help? Reach out or browse the frequently asked questions below.
            </Text>
          </VStack>
        </div>

        {/* Contact Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn(
              'surface-card p-5 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]',
              'active:scale-[0.99] pressable'
            )}
          >
            <HStack align="center" gap={3}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.1)]">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <VStack className="min-w-0">
                <Text variant="bodySm" className="font-bold">Email us</Text>
                <Text variant="caption" color="muted" truncate>{SUPPORT_EMAIL}</Text>
              </VStack>
            </HStack>
          </a>

          <div className="surface-card p-5">
            <HStack align="center" gap={3}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-radar/10 border border-brand-radar/20 shadow-[0_0_12px_hsl(var(--brand-radar)/0.1)]">
                <Clock className="h-6 w-6 text-brand-radar" />
              </div>
              <VStack className="min-w-0">
                <Text variant="bodySm" className="font-bold">Response time</Text>
                <Text variant="caption" color="muted">We typically respond within 24-48 hours</Text>
              </VStack>
            </HStack>
          </div>
        </div>

        {/* FAQ Accordion */}
        <VStack gap={2}>
          <HStack align="center" gap={2} className="px-1">
            <MessageSquare className="h-4 w-4 text-primary" />
            <Text variant="micro" className="text-muted-foreground font-bold uppercase tracking-wider">Frequently Asked Questions</Text>
          </HStack>

          <VStack gap={2} className="stagger-children">
            {FAQS.map((faq, i) => (
              <div key={i} className="surface-card overflow-hidden">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <HStack align="center" gap={2} className="min-w-0">
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                      openFaq === i ? 'bg-primary/15 border-primary/25' : 'bg-surface-elevated border-border/40'
                    )}>
                      <faq.icon className={cn('h-3.5 w-3.5', openFaq === i ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <Text variant="bodySm" className="font-semibold">{faq.q}</Text>
                  </HStack>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      openFaq === i && 'rotate-180 text-primary'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="px-4 pb-4 pl-12">
                    <Text variant="caption" color="muted" className="leading-relaxed">
                      {faq.a}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </VStack>
        </VStack>
      </VStack>
    </div>
  );
}
