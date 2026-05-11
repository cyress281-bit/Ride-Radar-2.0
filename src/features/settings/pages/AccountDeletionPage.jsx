/**
 * Self-service account deletion page for Ride Radar 2.0.
 *
 * Warns the user about data loss, requires typing DELETE to confirm,
 * calls the `delete_user_account()` RPC, then signs out and redirects.
 */

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthActions } from '@/features/auth/hooks/use-auth.js';
import { deleteAccount } from '@/features/settings/api/settings-api.js';
import { trackAccountDeleted } from '@/lib/analytics.js';
import { logger } from '@/lib/logger.js';
import { queryClient } from '@/lib/query-client.js';
import RRLogo from '@/components/RRLogo';

export default function AccountDeletionPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const canDelete = confirmText.trim() === 'DELETE';

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const { error: rpcError } = await deleteAccount();

      if (rpcError) {
        throw rpcError;
      }

      trackAccountDeleted();
      setSuccess(true);
      queryClient.clear();

      // Sign out and redirect after a short delay
      setTimeout(async () => {
        try {
          await signOut();
        } catch (e) {
          logger.warn('[AccountDeletion] Sign-out after deletion failed:', e);
        }
        navigate('/landing');
      }, 2000);
    } catch (err) {
      logger.error('[AccountDeletion] Error:', err);
      setError(err.message || 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  }, [canDelete, signOut, navigate]);

  return (
    <div className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/settings"
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="rr-surface-strong relative mb-6 overflow-hidden rounded-2xl p-5">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-destructive/15" />
          <div className="relative z-10">
            <div className="rr-chip mb-3 text-destructive">
              <ShieldCheck className="h-3.5 w-3.5" /> Account safety
            </div>
            <div className="flex items-center gap-3 mb-2">
              <RRLogo size="md" />
              <h1 className="rr-heading text-3xl">Delete Account</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Permanently remove your Ride Radar data. This action cannot be undone.
            </p>
          </div>
        </div>

        {success ? (
          <div className="rr-surface rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="mb-1 font-display text-xl font-bold">Account deleted</h2>
            <p className="text-sm text-muted-foreground">
              Your account and associated data have been removed. Redirecting...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warnings */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">Warning: irreversible action</span>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Your profile, posts, and uploads will be permanently deleted</li>
                <li>Your messages and conversations will be removed</li>
                <li>Your connections and follower relationships will be cleared</li>
                <li>This action cannot be reversed by support</li>
              </ul>
            </div>

            {/* Confirm input */}
            <div className="rr-surface rounded-2xl p-5">
              <label className="mb-2 block text-sm font-medium">
                Type <strong>DELETE</strong> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="rr-premium-input rounded-xl"
                autoComplete="off"
              />

              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}

              <Button
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                variant="destructive"
                className="mt-4 h-12 w-full rounded-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Permanently delete my account'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
