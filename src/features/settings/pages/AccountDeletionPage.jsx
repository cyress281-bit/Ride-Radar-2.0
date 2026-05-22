/**
 * Self-service account deletion page for Ride Radar 2.0.
 *
 * Warns the user about data loss, requires typing DELETE to confirm,
 * calls the `delete_user_account()` RPC, then signs out and redirects.
 * Electric Neon Green redesign: emergency red warnings, glassmorphism panels.
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
  Radio,
  MessageSquare,
  Users,
  User,
  Image,
  Lock,
} from 'lucide-react';
import { useAuthActions, useAuthState } from '@/features/auth/hooks/use-auth.js';
import { SUPPORT_EMAIL } from '@/lib/constants.js';
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
  const { user } = useAuthState();

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [storageCleanupWarning, setStorageCleanupWarning] = useState(null);

  const canDelete = confirmText.trim() === 'DELETE';

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);
    setStorageCleanupWarning(null);

    try {
      const { data: deletionData, error: rpcError } = await deleteAccount();

      if (rpcError) {
        throw rpcError;
      }

      if (deletionData?.storageCleanup?.hasWarnings) {
        setStorageCleanupWarning(deletionData.storageCleanup);
      }

      trackAccountDeleted();
      setSuccess(true);
      queryClient.clear();

      // Sign out and redirect after a short delay
      const deletionTimeout = setTimeout(async () => {
        try {
          await signOut();
        } catch (e) {
          logger.warn('[AccountDeletion] Sign-out after deletion failed:', e);
        }
        navigate('/landing');
      }, 2000);

      return () => clearTimeout(deletionTimeout);
    } catch (err) {
      logger.error('[AccountDeletion] Error:', err);
      setError(err.message || 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  }, [canDelete, signOut, navigate, queryClient]);

  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        {/* Header */}
        <div className="relative overflow-hidden surface-card border-brand-emergency/20">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-brand-emergency/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-brand-emergency/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-brand-emergency/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <HStack align="center" gap={1.5} className="px-3 py-1 rounded-full border border-brand-emergency/20 bg-brand-emergency/10 w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-emergency" />
              <Text variant="micro" className="text-brand-emergency font-semibold">Account safety</Text>
            </HStack>
            <HStack align="center" gap={3}>
              <Skull className="h-8 w-8 text-brand-emergency rr-neon-red" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-red">Delete Account</Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Remove or anonymize your Ride Radar account data and associated in-app content according to the current deletion process. Some data may be retained where required for legal, security, abuse prevention, backup, or operational reasons.
            </Text>
          </VStack>
        </div>

        {success ? (
          <div className="surface-card border-primary/30 bg-primary/5 p-6 text-center animate-scale-in">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary animate-glow-pulse" />
            <Text variant="h3" color="default" className="mb-1 rr-neon-green">Account deleted</Text>
            <Text variant="bodySm" color="muted">
              Your account and associated data have been removed. Redirecting...
            </Text>
            {storageCleanupWarning?.hasWarnings && (
              <div className="mt-4 rounded-2xl border border-brand-amber/25 bg-brand-amber/10 px-4 py-3 text-left">
                <Text variant="bodySm" className="font-semibold text-brand-amber">
                  Some uploaded files could not be removed immediately.
                </Text>
                <Text variant="caption" color="muted" className="mt-1 block leading-relaxed">
                  Your account deletion still completed. We logged the cleanup issue so the remaining files can be
                  handled separately.
                </Text>
              </div>
            )}
          </div>
        ) : !user ? (
          <div className="surface-card p-6 animate-fade-up">
            <VStack gap={3}>
              <HStack align="center" gap={2}>
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                <Text variant="bodySm" className="font-bold">Sign in required</Text>
              </HStack>
              <Text variant="caption" color="muted" className="leading-relaxed">
                To delete your account, please sign in first. After signing in, return to this page and
                confirm deletion.
              </Text>
              <Text variant="caption" color="muted" className="leading-relaxed">
                If you cannot sign in, email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Data Deletion Request')}&body=${encodeURIComponent('Please delete the account associated with this email address.')}`}
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
                {' '}with the email address associated with your account and request data deletion. We will
                process your request within 30 days.
              </Text>
            </VStack>
          </div>
        ) : (
          <VStack gap={4} className="animate-fade-up">
            {/* Warning Card */}
            <div className="surface-card border-brand-emergency/30 bg-brand-emergency/[0.04] p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 bg-brand-emergency/[0.03] blur-xl pointer-events-none" />
              <HStack align="center" gap={2} className="mb-4 relative z-10">
                <AlertTriangle className="h-5 w-5 text-brand-emergency" />
                <Text variant="bodySm" className="font-bold text-brand-emergency">Warning: irreversible action</Text>
              </HStack>
              <div className="space-y-3 relative z-10">
                <WarningItem icon={User} text="Your profile and public rider details will be removed or anonymized" />
                <WarningItem icon={Radio} text="Your broadcasts, signals, and ride posts will be removed from normal app access" />
                <WarningItem icon={MessageSquare} text="Your messages, conversations, and comments will be removed from normal app access" />
                <WarningItem icon={Users} text="Your connections, friendships, and notifications will be cleared where supported by the current deletion process" />
                <WarningItem icon={Image} text="Uploaded content may be removed from normal app access; backups or logs may persist temporarily" />
                <WarningItem icon={Lock} text="Some data may be retained for legal, security, abuse prevention, backup, or operational reasons" />
              </div>
            </div>

            {/* Confirm Input */}
            <div className="rr-glass-panel p-5">
              <Text variant="bodySm" className="font-medium mb-2">
                Type <strong className="text-brand-emergency rr-neon-red">DELETE</strong> to confirm
              </Text>
              <input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                aria-label="Type DELETE to confirm account deletion"
                aria-required="true"
                className={cn(
                  'w-full rounded-xl border bg-surface-elevated/60 px-4 py-3 text-sm text-foreground',
                  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-emergency/40 focus-visible:border-brand-emergency/50',
                  'transition-colors border-border/60',
                  canDelete && 'border-brand-emergency/40 text-brand-emergency'
                )}
              />

              {error && (
                <Text variant="caption" className="text-brand-emergency mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> {error}
                </Text>
              )}

              <button
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                className={cn(
                  'mt-4 w-full flex items-center justify-center gap-2 rounded-full',
                  'px-5 py-3 text-sm font-bold text-destructive-foreground',
                  'bg-brand-emergency transition-all hover:bg-brand-emergency/90 pressable',
                  'shadow-[0_4px_20px_hsl(var(--brand-emergency)/0.35)]',
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

function WarningItem({ icon: Icon, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-emergency/15 bg-brand-emergency/5 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-brand-emergency/70" />
      </div>
      <Text variant="caption" color="muted" className="leading-relaxed pt-1">{text}</Text>
    </div>
  );
}
