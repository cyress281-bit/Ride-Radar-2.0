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
  Lock,
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
  }, [canDelete, signOut, navigate]);

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
              Permanently remove your Ride Radar data. This action cannot be undone.
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
                <WarningItem icon={Radio} text="Your profile, posts, and uploads will be permanently deleted" />
                <WarningItem icon={MessageSquare} text="Your messages and conversations will be removed" />
                <WarningItem icon={Users} text="Your connections and follower relationships will be cleared" />
                <WarningItem icon={Lock} text="This action cannot be reversed by support" />
              </div>
            </div>

            {/* Confirm Input */}
            <div className="rr-glass-panel p-5">
              <Text variant="bodySm" className="font-medium mb-2">
                Type <strong className="text-brand-emergency rr-neon-red">DELETE</strong> to confirm
              </Text>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                aria-label="Type DELETE to confirm account deletion"
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
