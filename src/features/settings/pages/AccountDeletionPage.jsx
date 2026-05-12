/**
 * Self-service account deletion page for Ride Radar 2.0.
 *
 * Warns the user about data loss, requires typing DELETE to confirm,
 * calls the `delete_user_account()` RPC, then signs out and redirects.
 * Modern design: warning card with Honda Red accents, confirmation flow.
 */

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Skull,
} from 'lucide-react';
import { useAuthActions } from '@/features/auth/hooks/use-auth.js';
import { deleteAccount } from '@/features/settings/api/settings-api.js';
import { trackAccountDeleted } from '@/lib/analytics.js';
import { logger } from '@/lib/logger.js';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

export default function AccountDeletionPage() {
  const queryClient = useQueryClient();
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
    <div className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        {/* Header */}
        <div className="surface-card border-destructive/20 p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-destructive/15" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
          <VStack gap={2} className="relative z-10">
            <HStack align="center" gap={1.5} className="px-3 py-1 rounded-full border border-destructive/20 bg-destructive/10 w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-destructive" />
              <Text variant="micro" color="destructive">Account safety</Text>
            </HStack>
            <HStack align="center" gap={3}>
              <Skull className="h-8 w-8 text-destructive" />
              <Text as="h1" variant="h2" color="default">Delete Account</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Permanently remove your Ride Radar data. This action cannot be undone.
            </Text>
          </VStack>
        </div>

        {success ? (
          <div className="surface-card border-primary/30 bg-primary/5 p-6 text-center animate-scale-in">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <Text variant="h3" color="default" className="mb-1">Account deleted</Text>
            <Text variant="bodySm" color="muted">
              Your account and associated data have been removed. Redirecting...
            </Text>
          </div>
        ) : (
          <VStack gap={4}>
            {/* Warning Card */}
            <div className="surface-card border-destructive/30 bg-destructive/5 p-5">
              <HStack align="center" gap={2} className="mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <Text variant="bodySm" className="font-bold text-destructive">Warning: irreversible action</Text>
              </HStack>
              <ul className="list-disc space-y-2 pl-5">
                <Text as="li" variant="caption" color="muted">Your profile, posts, and uploads will be permanently deleted</Text>
                <Text as="li" variant="caption" color="muted">Your messages and conversations will be removed</Text>
                <Text as="li" variant="caption" color="muted">Your connections and follower relationships will be cleared</Text>
                <Text as="li" variant="caption" color="muted">This action cannot be reversed by support</Text>
              </ul>
            </div>

            {/* Confirm Input */}
            <div className="surface-card p-5">
              <Text variant="bodySm" className="font-medium mb-2">
                Type <strong className="text-destructive">DELETE</strong> to confirm
              </Text>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className={cn(
                  'w-full rounded-xl border bg-surface-elevated/60 px-4 py-3 text-sm text-foreground',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/40 focus-visible:border-destructive/50',
                  'transition-colors border-border/60',
                  canDelete && 'border-destructive/40'
                )}
              />

              {error && (
                <Text variant="caption" color="destructive" className="mt-3">{error}</Text>
              )}

              <button
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                className={cn(
                  'mt-4 w-full flex items-center justify-center gap-2 rounded-full',
                  'px-5 py-3 text-sm font-bold text-destructive-foreground',
                  'bg-destructive transition-all hover:bg-destructive/90 pressable',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
                )}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Permanently delete my account'}
              </button>
            </div>
          </VStack>
        )}
      </VStack>
    </div>
  );
}
