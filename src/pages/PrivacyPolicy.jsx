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
          <h1 className="rr-heading mb-3 text-3xl">Privacy & Data Use</h1>
          <p className="text-sm text-muted-foreground">Effective April 25, 2026. This public policy page is suitable for in-app review access and store metadata links.</p>
        </div>

        <div className="mt-4 space-y-4 rounded-2xl border border-border/70 bg-black/30 p-5 text-sm leading-relaxed text-muted-foreground">
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Data we collect</h2><p>Ride Radar stores account identity from the login provider, rider profile details you enter, approximate area/location when you choose location-based broadcasts, uploaded profile/bike/event/alert photos, broadcasts, RSVPs, connection requests, friendships, messages, notifications, reports, blocks, and app settings.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Public vs private data</h2><p>Display name, avatar, bike details, public profile fields, and active broadcasts may be visible to other users. Full legal name, email, notification settings, block lists, reports, private messages, and account deletion requests are treated as private app data.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Location</h2><p>Solo Ride and ISO broadcasts use approximate, fuzzed, frozen location only when enabled. Ride Radar does not provide live turn-by-turn tracking and does not continuously track riders in the background.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Media uploads</h2><p>Photos you upload are stored to display your profile, bike, event poster, or safety alert. Do not upload images containing private documents, plates, addresses, or bystanders without permission.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Safety and moderation</h2><p>Users can report content, report users, and block users in context. Reports are reviewed for safety, harassment, spam, illegal activity, and privacy concerns.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Account deletion</h2><p>You can request deletion from Settings or the public account deletion page. App data tied to your rider profile is removed where technically possible. Limited records may be retained if legally required, for security, fraud prevention, or unresolved safety investigations.</p></section>
          <section><h2 className="mb-1 font-display text-lg font-bold text-foreground">Contact</h2><p>For privacy, moderation, or account requests, contact <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p></section>
        </div>
      </div>
    </div>
  );
}