import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ReviewReadiness() {
  const rows = [
    ['Collected data', 'Login identity, email, display profile, avatar, bike details, approximate location for location posts, photos, broadcasts, RSVPs, friendships, messages, notifications, reports, blocks, settings.'],
    ['Public data', 'Display name, avatar, public profile fields, bike details if public, active broadcasts, event details, alert area/photos.'],
    ['Private data', 'Email, full name, settings, block list, reports, private messages, account deletion requests, notification preferences.'],
    ['Review-sensitive features', 'User-generated content, messaging, location, image uploads, reporting/blocking, authentication, notifications.'],
    ['Auth review note', 'Base44 handles login and callbacks. If third-party/social login is enabled for iOS, Sign in with Apple must remain enabled in the auth/provider configuration before App Store submission.'],
    ['Policy disclosures', 'Approximate location, media uploads, public profile visibility, messaging, moderation, deletion, support contact.'],
  ];

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/settings" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <div className="rr-surface-strong rounded-2xl p-5"><div className="rr-kicker mb-2">Store review</div><h1 className="rr-heading text-3xl">Data Safety Summary</h1></div>
        <div className="mt-4 space-y-3">{rows.map(([title, body]) => <div key={title} className="rounded-xl border border-border/70 bg-black/30 p-4"><div className="font-bold">{title}</div><div className="mt-1 text-sm text-muted-foreground">{body}</div></div>)}</div>
      </div>
    </div>
  );
}