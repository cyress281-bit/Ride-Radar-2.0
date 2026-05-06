import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/pages/PrivacyPolicy';
import { logger } from '@/lib/logger';

export default function AccountDeletion() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const { user, signOut } = useSupabaseAuth();
  const navigate = useNavigate();

  const CONFIRM_PHRASE = 'DELETE';

  const startDeletion = async () => {
    if (!user) {
      navigate('/login?redirect=/account-deletion');
      return;
    }

    if (confirmText !== CONFIRM_PHRASE) {
      setMessage(`Please type "${CONFIRM_PHRASE}" to confirm account deletion.`);
      setStatus('error');
      return;
    }

    setStatus('working');

    try {
      // Call the secure server-side RPC function (SECURITY DEFINER)
      // This function runs with elevated privileges on the database server,
      // so it can delete the auth.users row without exposing the service role key.
      const { data, error } = await supabase.rpc('delete_user_account');

      if (error) {
        throw new Error(error.message || 'Account deletion request failed.');
      }

      // The RPC function returns a JSONB object with success/error fields
      if (!data?.success) {
        throw new Error(data?.error || 'Account deletion failed on the server.');
      }

      setMessage('Your account and all associated data have been permanently deleted.');
      setStatus('done');

      // Sign out locally after a short delay so the user sees the confirmation
      setTimeout(async () => {
        try {
          await signOut();
        } catch {
          // Session may already be invalidated server-side; force navigate
          navigate('/');
        }
      }, 2000);
    } catch (error) {
      logger.error('Deletion error:', error);
      const userMessage = error.message?.includes('Not authenticated')
        ? 'Your session has expired. Please sign in and try again.'
        : `Deletion failed: ${error.message || 'Unknown error'}. Please contact support at ${SUPPORT_EMAIL}.`;
      setMessage(userMessage);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="rounded-2xl border border-destructive/35 bg-black/35 p-5">
          <Trash2 className="mb-3 h-7 w-7 text-destructive" />
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Ride Radar Account Deletion</h1>
          <p className="mt-2 text-sm text-muted-foreground">You can request deletion of your Ride Radar account and associated app data from inside the app or through this page.</p>
        </div>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-black/30 p-5 text-sm text-muted-foreground">
          <p>If you need help with account deletion, contact:<br /><a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">{SUPPORT_EMAIL}</a></p>

          {status === 'done' ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-primary">{message}</div>
          ) : (
            <>
              {status === 'error' && message && (
                <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-destructive">
                  {message}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="confirm-delete" className="block text-xs text-muted-foreground">
                  Type <span className="font-bold text-destructive">{CONFIRM_PHRASE}</span> to confirm permanent account deletion:
                </label>
                <input
                  id="confirm-delete"
                  type="text"
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={CONFIRM_PHRASE}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                  disabled={status === 'working'}
                  autoComplete="off"
                />
              </div>
              <Button
                onClick={startDeletion}
                disabled={status === 'working' || confirmText !== CONFIRM_PHRASE}
                variant="destructive"
                className="w-full rounded-lg"
              >
                {status === 'working' ? 'Deleting account data...' : 'Permanently delete my account'}
              </Button>
            </>
          )}

          <p>Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">{SUPPORT_EMAIL}</a>.</p>
        </div>
      </div>
    </div>
  );
}