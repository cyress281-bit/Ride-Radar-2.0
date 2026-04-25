import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PRIVACY_POLICY_URL = 'https://rideradarapp.com/privacy-policy';
export const SUPPORT_EMAIL = 'support@rideradarapp.com';
export const SUPPORT_URL = 'https://rideradarapp.com/support';
export const ACCOUNT_DELETION_URL = 'https://rideradarapp.com/account-deletion';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="rr-surface-strong rounded-2xl p-5">
          <div className="rr-kicker mb-2">Ride Radar Privacy Policy</div>
          <h1 className="rr-heading mb-3 text-3xl">Ride Radar Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Ride Radar collects and stores account, profile, content, and app usage information needed to operate the app.</p>
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-border/70 bg-black/30 p-5 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">Information we may collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>account information such as email and name from login providers</li>
              <li>profile information such as display name, avatar, bike details, and approximate area</li>
              <li>user-generated content such as broadcasts, event posters, alert photos, bike photos, reports, and messages</li>
              <li>approximate location information when needed for core app features</li>
              <li>moderation and safety-related information such as reports, blocks, and deletion requests</li>
            </ul>
          </section>
          <section>
            <h2 className="mb-1 font-display text-lg font-bold text-foreground">How we use information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>to provide account access and profile features</li>
              <li>to power broadcasts, events, alerts, messaging, and rider discovery</li>
              <li>to improve safety, moderation, and support</li>
              <li>to respond to account, privacy, and deletion requests</li>
            </ul>
          </section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Public vs private information</h2><ul className="list-disc space-y-1 pl-5"><li>display name, avatar, bike details, and certain broadcast content may be visible to other users</li><li>email and private account identity information are not public</li></ul></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Account deletion</h2><p>Users can request deletion from inside the app or through the public account deletion page.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Support</h2><p>For privacy or support questions, contact:<br /><a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p></section>
        </div>
      </div>
    </div>
  );
}