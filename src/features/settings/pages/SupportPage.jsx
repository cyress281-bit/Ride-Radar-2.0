/**
 * Support page for Ride Radar 2.0.
 *
 * Provides contact information and a placeholder FAQ section.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, HelpCircle, MessageSquare } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { SUPPORT_EMAIL } from '@/lib/constants.js';

const FAQS = [
  {
    q: 'How do I update my profile?',
    a: 'Go to your Profile tab, tap Edit, and update your display name, avatar, and bike details.',
  },
  {
    q: 'How does the live map work?',
    a: 'Enable "Show me on the live map" in Settings. You can choose Approximate (fuzzed) or Precise location.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Visit Settings > Delete Account to permanently remove your data.',
  },
  {
    q: 'How do I report a user?',
    a: 'Open the user\'s profile and tap the menu to find the report option.',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/settings"
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="rr-surface-strong rounded-2xl p-5">
          <div className="rr-kicker mb-2">Help & Support</div>
          <div className="flex items-center gap-3 mb-3">
            <RRLogo size="md" />
            <h1 className="rr-heading text-3xl">Support</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Need help? Reach out or browse the frequently asked questions below.
          </p>
        </div>

        {/* Contact */}
        <div className="mt-4 space-y-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rr-haptic flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-4 transition-colors hover:border-primary/35"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">Email us</div>
              <div className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</div>
            </div>
          </a>

          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">Response time</div>
              <div className="text-xs text-muted-foreground">
                We typically respond within 24-48 hours
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-6">
          <div className="rr-kicker mb-3 flex items-center gap-2 text-muted-foreground">
            <HelpCircle className="h-4 w-4" /> Frequently Asked Questions
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rr-surface rounded-xl border border-border/40 p-4"
              >
                <h3 className="mb-1 text-sm font-semibold text-foreground">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
