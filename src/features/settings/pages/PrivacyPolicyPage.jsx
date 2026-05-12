/**
 * Privacy Policy page for Ride Radar 2.0.
 *
 * Static content explaining data collection, usage, and user rights.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { SUPPORT_EMAIL } from '@/lib/constants.js';

const LAST_UPDATED = 'May 9, 2026';

export default function PrivacyPolicyPage() {
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
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Ride Radar Privacy Policy</div>
            <div className="flex items-center gap-3 mb-3">
              <RRLogo size="md" />
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Privacy Policy</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Ride Radar collects and stores account, profile, content, and app usage information
              needed to operate the app.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="space-y-4">
          <PolicySection title="Information we may collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Account information such as email and name from login providers
              </li>
              <li>
                Profile information such as display name, avatar, bike details, and approximate area
              </li>
              <li>
                User-generated content such as broadcasts, event posters, alert photos, bike photos,
                reports, and messages
              </li>
              <li>Approximate location information when needed for core app features</li>
              <li>
                Moderation and safety-related information such as reports, blocks, and deletion
                requests
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="How we use information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To provide account access and profile features</li>
              <li>To power broadcasts, events, alerts, messaging, and rider discovery</li>
              <li>To improve safety, moderation, and support</li>
              <li>To respond to account, privacy, and deletion requests</li>
            </ul>
          </PolicySection>

          <PolicySection title="Public vs private information">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Display name, avatar, bike details, and certain broadcast content may be visible to
                other users
              </li>
              <li>Email and private account identity information are not public</li>
            </ul>
          </PolicySection>

          <PolicySection title="Account deletion">
            <p>
              Users can request deletion from inside the app or through the public account deletion
              page. Data is permanently removed and cannot be recovered.
            </p>
          </PolicySection>

          <PolicySection title="Support">
            <p>
              For privacy or support questions, contact:
              <br />
              <a className="text-primary underline hover:text-primary/80 transition-colors" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </PolicySection>
        </div>
      </div>
    </div>
  );
}

function PolicySection({ title, children }) {
  return (
    <section className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-5 text-sm leading-relaxed text-muted-foreground">
      <h2 className="mb-3 font-display text-lg font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
