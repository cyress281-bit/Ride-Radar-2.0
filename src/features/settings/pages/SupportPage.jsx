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
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="relative mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="relative z-10">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Help & Support</div>
            <div className="flex items-center gap-3 mb-3">
              <RRLogo size="md" />
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Support</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Need help? Reach out or browse the frequently asked questions below.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-4 rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5 transition-all hover:border-primary/30 hover:bg-primary/[0.02] active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Email us</div>
              <div className="mt-0.5 text-xs text-muted-foreground truncate">{SUPPORT_EMAIL}</div>
            </div>
          </a>

          <div className="flex items-center gap-4 rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">Response time</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                We typically respond within 24-48 hours
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Frequently Asked Questions</span>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5"
            >
              <h3 className="mb-2 text-sm font-semibold text-foreground">{faq.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
