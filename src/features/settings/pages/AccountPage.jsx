/**
 * Account management page for Ride Radar.
 *
 * Keeps account identity and security settings separate from the public profile.
 * Only implemented account actions are interactive; future auth capabilities are
 * rendered as disabled rows to avoid fake controls.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as z from 'zod';
import {
  ArrowLeft,
  AtSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Laptop,
  Link2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthActions, useAuthState } from '@/features/auth/hooks/use-auth.js';
import { getSession } from '@/features/auth/api/auth-api.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const emailSchema = z.string().trim().email('Enter a valid email address.');

function getInitial(profile, user) {
  const source = profile?.display_name || user?.email || 'Rider';
  return source.trim().charAt(0).toUpperCase() || 'R';
}

function getProviderLabel(user) {
  const providers = new Set(
    user?.identities
      ?.map((identity) => identity.provider)
      .filter(Boolean)
  );
  if (user?.app_metadata?.provider) providers.add(user.app_metadata.provider);
  if (providers.size === 0) providers.add('email');

  return Array.from(providers)
    .map((provider) => provider === 'email' ? 'Email and password' : provider.charAt(0).toUpperCase() + provider.slice(1))
    .join(', ');
}

function formatSessionExpiry(session) {
  if (!session?.expires_at) return 'Session managed by Supabase Auth';
  const expiresAt = new Date(session.expires_at * 1000);
  if (!Number.isFinite(expiresAt.getTime())) return 'Session managed by Supabase Auth';
  return `Access token refreshes before ${expiresAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

const Section = memo(function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-white/[0.05] px-4 py-2.5">
        <HStack align="center" gap={2}>
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          <Text variant="micro" className="font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </Text>
        </HStack>
      </div>
      <VStack>{children}</VStack>
    </div>
  );
});

const AccountRow = memo(function AccountRow({
  icon: Icon,
  label,
  desc,
  value,
  onClick,
  disabled = false,
  status,
}) {
  const interactive = !!onClick && !disabled;
  const Comp = interactive ? 'button' : 'div';

  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
        interactive && 'hover:bg-white/[0.03] active:bg-white/[0.05] cursor-pointer',
        disabled && 'opacity-70'
      )}
    >
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
        disabled
          ? 'border-white/[0.06] bg-white/[0.025] text-muted-foreground'
          : 'border-primary/20 bg-primary/10 text-primary'
      )}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <VStack flex className="min-w-0">
        <HStack align="center" gap={2} className="min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">
            {label}
          </Text>
          {status && (
            <span className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
              disabled
                ? 'border-white/[0.08] bg-white/[0.025] text-muted-foreground'
                : 'border-primary/20 bg-primary/10 text-primary'
            )}>
              {status}
            </span>
          )}
        </HStack>
        {desc && <Text variant="caption" color="muted" truncate>{desc}</Text>}
      </VStack>
      {value && (
        <Text variant="caption" color="muted" className="max-w-[9rem] shrink-0 truncate text-right">
          {value}
        </Text>
      )}
      {interactive && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </Comp>
  );
});

function AccountPage() {
  const { user, profile } = useAuthState();
  const { resetPassword, updateEmail } = useAuthActions();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState(false);

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || 'Rider';
  const email = user?.email || '';
  const providerLabel = useMemo(() => getProviderLabel(user), [user]);

  useEffect(() => {
    let active = true;
    getSession()
      .then(({ data }) => {
        if (active) setCurrentSession(data?.session ?? null);
      })
      .catch(() => {
        if (active) setCurrentSession(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePasswordReset = async () => {
    if (!email || isSendingReset) return;
    setIsSendingReset(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      toast.success('Password reset email sent', {
        description: 'Check your inbox for the secure reset link.',
      });
    } catch (err) {
      toast.error('Could not send reset email', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleOpenEmailDialog = () => {
    setNewEmail('');
    setEmailError('');
    setEmailChangeSent(false);
    setEmailDialogOpen(true);
  };

  const handleEmailChange = async (event) => {
    event.preventDefault();
    if (isUpdatingEmail) return;

    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message || 'Enter a valid email address.');
      return;
    }

    const nextEmail = parsed.data.toLowerCase();
    if (nextEmail === email.toLowerCase()) {
      setEmailError('That is already your current account email.');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailError('');
    try {
      await updateEmail(nextEmail);
      setEmailChangeSent(true);
      toast.success('Email change requested', {
        description: 'Check your inbox. Supabase may require confirmation from both email addresses.',
      });
    } catch (err) {
      setEmailError(err?.message || 'Supabase could not start the email change.');
      toast.error('Email change failed', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-nav-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground pressable self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>

        <div className="relative overflow-hidden surface-card">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={3} className="relative z-10 p-6">
            <HStack align="center" gap={1.5} className="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <Text variant="micro" className="font-semibold text-primary">Account management</Text>
            </HStack>
            <HStack align="center" gap={3}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <VStack gap={0.5} className="min-w-0">
                <Text as="h1" variant="h2" color="default" className="rr-neon-green">
                  Account
                </Text>
                <Text variant="bodySm" color="muted">
                  Manage private identity and sign-in controls.
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </div>

        <Section title="Account Identity" icon={User}>
          <HStack align="center" gap={3} className="px-4 py-4">
            <Avatar className="h-14 w-14 border-primary/20">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt="" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitial(profile, user)}
              </AvatarFallback>
            </Avatar>
            <VStack flex className="min-w-0">
              <Text variant="body" className="font-bold truncate">{displayName}</Text>
              <Text variant="caption" color="muted" truncate>{email}</Text>
            </VStack>
          </HStack>
        </Section>

        <Section title="Email" icon={Mail}>
          <AccountRow
            icon={AtSign}
            label="Current email"
            desc="Used for sign-in, recovery, and account notices"
            value={email || 'Unavailable'}
          />
          <div className="border-t border-border/40">
            <AccountRow
              icon={Mail}
              label="Change email"
              desc="Start Supabase email confirmation for a new address"
              onClick={handleOpenEmailDialog}
            />
          </div>
        </Section>

        <Section title="Password & Security" icon={LockKeyhole}>
          <AccountRow
            icon={KeyRound}
            label={isSendingReset ? 'Sending reset email...' : 'Change password'}
            desc={
              resetSent
                ? 'Reset email sent. Use the link in your inbox to choose a new password.'
                : 'Send a secure password reset link to your current email'
            }
            onClick={handlePasswordReset}
            disabled={!email || isSendingReset}
            status={resetSent ? 'Sent' : undefined}
          />
          <div className="border-t border-border/40">
            <AccountRow
              icon={Sparkles}
              label="Passkeys"
              desc="Not available yet. Requires a full WebAuthn/passkey account flow."
              disabled
              status="Not available"
            />
          </div>
          <div className="border-t border-border/40">
            <AccountRow
              icon={Link2}
              label="Linked sign-in methods"
              desc="Provider linking is not enabled in this app"
              value={providerLabel}
              disabled
              status="Read only"
            />
          </div>
          <div className="border-t border-border/40">
            <AccountRow
              icon={Laptop}
              label="Current session"
              desc={formatSessionExpiry(currentSession)}
              value={currentSession ? 'Active' : 'Unavailable'}
              disabled
              status="Read only"
            />
          </div>
        </Section>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
          <HStack align="start" gap={2.5}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <Text variant="caption" color="muted" className="leading-relaxed">
              Public profile edits stay on Profile. Private sign-in and account controls live here.
            </Text>
          </HStack>
        </div>
      </VStack>

      {emailDialogOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-4 pb-[calc(var(--rr-nav-h)+var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px))+1rem)] pt-20 backdrop-blur-sm sm:items-center sm:pb-4">
          <form
            onSubmit={handleEmailChange}
            className="w-full max-w-md overflow-hidden rounded-[24px] border border-white/[0.08] bg-surface/95 shadow-[0_20px_60px_hsl(0_0%_0%/0.45)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-email-title"
          >
            <HStack align="center" justify="between" className="border-b border-white/[0.06] px-5 py-4">
              <VStack gap={0.5}>
                <Text id="change-email-title" variant="body" className="font-bold">Change email</Text>
                <Text variant="caption" color="muted">Supabase will confirm the new address.</Text>
              </VStack>
              <button
                type="button"
                onClick={() => setEmailDialogOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                aria-label="Close change email"
              >
                <X className="h-4 w-4" />
              </button>
            </HStack>

            <VStack gap={4} className="px-5 py-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                <Text variant="micro" color="muted" className="font-semibold uppercase tracking-wider">Current email</Text>
                <Text variant="bodySm" className="mt-1 font-semibold">{email}</Text>
              </div>

              <label htmlFor="account-new-email" className="space-y-2">
                <Text variant="micro" color="muted" className="font-semibold uppercase tracking-wider">
                  New email
                </Text>
                <Input
                  id="account-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setEmailError('');
                    setEmailChangeSent(false);
                  }}
                  placeholder="new@email.com"
                  autoComplete="email"
                  disabled={isUpdatingEmail || emailChangeSent}
                />
              </label>

              {emailError && (
                <HStack align="start" gap={2} className="rounded-xl border border-brand-emergency/20 bg-brand-emergency/10 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-emergency" />
                  <Text variant="caption" className="text-brand-emergency">{emailError}</Text>
                </HStack>
              )}

              {emailChangeSent && (
                <HStack align="start" gap={2} className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <Text variant="caption" className="text-primary">
                    Email change requested. Depending on Supabase Auth settings, confirmation may be required from both the current and new inbox.
                  </Text>
                </HStack>
              )}

              <HStack gap={2} className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEmailDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isUpdatingEmail || emailChangeSent}
                >
                  {isUpdatingEmail ? 'Sending...' : 'Send confirmation'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </div>
      )}
    </div>
  );
}

export default memo(AccountPage);
