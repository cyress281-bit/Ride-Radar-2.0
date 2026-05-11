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
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="rr-surface-strong rounded-2xl p-5">
          <div className="rr-kicker mb-2">Ride Radar Privacy Policy</div>
          <div className="flex items-center gap-3 mb-3">
            <RRLogo size="md" />
            <h1 className="rr-heading text-3xl">Privacy Policy</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Ride Radar collects and stores account, profile, content, and app usage information
            needed to operate the app.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-border/70 bg-black/30 p-5 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">
              Information we may collect
            </h2>
            <ul className="list-disc space-y-1 pl-5">
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
          </section>

          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">
              How we use information
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To provide account access and profile features</li>
              <li>To power broadcasts, events, alerts, messaging, and rider discovery</li>
              <li>To improve safety, moderation, and support</li>
              <li>To respond to account, privacy, and deletion requests</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">
              Public vs private information
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Display name, avatar, bike details, and certain broadcast content may be visible to
                other users
              </li>
              <li>Email and private account identity information are not public</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">
              Account deletion
            </h2>
            <p>
              Users can request deletion from inside the app or through the public account deletion
              page. Data is permanently removed and cannot be recovered.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">Support</h2>
            <p>
              For privacy or support questions, contact:
              <br />
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
