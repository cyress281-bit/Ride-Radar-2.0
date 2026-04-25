import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/pages/PrivacyPolicy';

export default function Support() {
  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="rr-surface-strong rounded-2xl p-5">
          <div className="rr-kicker mb-2">Ride Radar Support</div>
          <h1 className="rr-heading text-3xl">Ride Radar Support</h1>
          <p className="mt-2 text-sm text-muted-foreground">For support, privacy questions, moderation concerns, or account deletion help, contact:</p>
        </div>
        <div className="mt-4 grid gap-3">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Ride%20Radar%20Support`} className="rounded-xl border border-border/70 bg-black/30 p-4 hover:border-primary/35">
            <Mail className="mb-2 h-5 w-5 text-primary" /><div className="font-bold">Email support</div><div className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</div>
          </a>
        </div>
      </div>
    </div>
  );
}