/**
 * Account management page for Ride Radar.
 *
 * Keeps account identity and security settings separate from the public profile.
 * Only implemented account actions are interactive; future auth capabilities are
 * rendered as disabled rows to avoid fake controls.
 */

import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  AtSign,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthActions, useAuthState } from '@/features/auth/hooks/use-auth.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

function getInitial(profile, user) {
  const source = profile?.display_name || user?.email || 'Rider';
  return source.trim().charAt(0).toUpperCase() || 'R';
}

function getProviderLabel(user) {
  const providers = user?.identities
    ?.map((identity) => identity.provider)
    .filter(Boolean);
  const provider = providers?.[0] || user?.app_metadata?.provider || 'email';

  if (provider === 'email') return 'Email and password';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
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
  const { resetPassword } = useAuthActions();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || 'Rider';
  const email = user?.email || '';
  const providerLabel = useMemo(() => getProviderLabel(user), [user]);

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
              desc="Email change support is not enabled in this app yet"
              disabled
              status="Coming soon"
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
              desc="Passkey sign-in is not implemented yet"
              disabled
              status="Coming soon"
            />
          </div>
          <div className="border-t border-border/40">
            <AccountRow
              icon={Link2}
              label="Linked sign-in methods"
              desc="Provider linking is not implemented yet"
              value={providerLabel}
              disabled
              status="Read only"
            />
          </div>
          <div className="border-t border-border/40">
            <AccountRow
              icon={Laptop}
              label="Active sessions and devices"
              desc="Session/device management is not implemented yet"
              disabled
              status="Coming soon"
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
    </div>
  );
}

export default memo(AccountPage);
