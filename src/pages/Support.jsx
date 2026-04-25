import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import { SUPPORT_EMAIL, ACCOUNT_DELETION_URL } from '@/pages/PrivacyPolicy';

export default function Support() {
  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="rr-surface-strong rounded-2xl p-5">
          <div className="rr-kicker mb-2">Help center</div>
          <h1 className="rr-heading text-3xl">Contact & Support</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use this path for moderation, privacy, safety, account, or app support issues.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Ride%20Radar%20Support`} className="rounded-xl border border-border/70 bg-black/30 p-4 hover:border-primary/35">
            <Mail className="mb-2 h-5 w-5 text-primary" /><div className="font-bold">Email support</div><div className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</div>
          </a>
          <div className="rounded-xl border border-border/70 bg-black/30 p-4"><ShieldAlert className="mb-2 h-5 w-5 text-primary" /><div className="font-bold">Safety or moderation</div><div className="text-sm text-muted-foreground">Use Report or Block in profiles, broadcasts, alerts, and conversations for fastest review.</div></div>
          <Link to={ACCOUNT_DELETION_URL} className="rounded-xl border border-border/70 bg-black/30 p-4 hover:border-destructive/35"><Trash2 className="mb-2 h-5 w-5 text-destructive" /><div className="font-bold">Account deletion</div><div className="text-sm text-muted-foreground">Open the public deletion request page.</div></Link>
        </div>
      </div>
    </div>
  );
}