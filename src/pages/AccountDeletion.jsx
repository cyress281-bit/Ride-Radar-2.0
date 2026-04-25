import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/pages/PrivacyPolicy';

export default function AccountDeletion() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const { logout } = useAuth();

  const startDeletion = async () => {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) {
      await base44.auth.redirectToLogin('/account-deletion');
      return;
    }
    setStatus('working');
    const res = await base44.functions.invoke('deleteMyAccount', {});
    setMessage(res.data?.message || 'Your deletion request was completed.');
    setStatus('done');
    if (res.data?.shouldLogout) {
      setTimeout(() => logout(true), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="rounded-2xl border border-destructive/35 bg-black/35 p-5">
          <Trash2 className="mb-3 h-7 w-7 text-destructive" />
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Delete Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">This removes your Ride Radar app profile and associated app data where technically possible. This is not just a logout or deactivation.</p>
        </div>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-black/30 p-5 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Deleted app data:</strong> profile, settings, broadcasts, RSVPs, connection requests, friendships, conversations, messages you sent, notifications, reports you filed, and block records tied to your rider profile.</p>
          <p><strong className="text-foreground">Possible retention exceptions:</strong> limited records may be retained if required for law, security, fraud prevention, backups, payment/tax obligations if added later, or unresolved safety/moderation investigations.</p>
          <p><strong className="text-foreground">Public deletion URL:</strong> use <span className="text-primary">https://rideradarapp.com/account-deletion</span> for App Store and Google Play account deletion requirements.</p>
          {status === 'done' ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-primary">{message}</div>
          ) : (
            <Button onClick={startDeletion} disabled={status === 'working'} variant="destructive" className="w-full rounded-lg">
              {status === 'working' ? 'Deleting account data...' : 'Delete my Ride Radar account'}
            </Button>
          )}
          <p>Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">{SUPPORT_EMAIL}</a>.</p>
        </div>
      </div>
    </div>
  );
}