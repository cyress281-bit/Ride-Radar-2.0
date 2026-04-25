import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Trash2, Mail } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/pages/PrivacyPolicy';

export default function DeletedAccount() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background px-5 py-8 text-foreground flex items-center justify-center">
      <div className="w-full max-w-md rounded-[1.45rem] border border-border/70 bg-black/35 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
          <Trash2 className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em]">Account deleted</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This Ride Radar account’s app data has already been deleted or anonymized. You cannot recreate a rider profile from this deleted account automatically.
        </p>
        <div className="mt-5 space-y-2">
          <Button onClick={() => logout(true)} className="w-full rounded-full">Log out</Button>
          <Link to="/support" className="flex items-center justify-center gap-2 text-sm text-primary hover:underline">
            <Mail className="h-4 w-4" /> Contact support
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Need help? Email {SUPPORT_EMAIL}.</p>
      </div>
    </div>
  );
}