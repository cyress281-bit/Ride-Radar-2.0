/**
 * Settings hub page for Ride Radar 2.0 — Electric Neon Green redesign.
 *
 * Sections: Profile, Account, Preferences, App, Support, Danger.
 * Each toggle saves immediately. Grouped sections as glassmorphism cards.
 */

import { useCallback, useEffect, memo, useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Mail,
  FileText,
  ScrollText,
  Download,
  Check,
  Smartphone,
  AppWindow,
  Bell,
  MessageSquare,
  CalendarHeart,
  TriangleAlert,
  Users,
  MapPin,
  Eye,
  AlertCircle,
  ChevronRight,
  User,
  Settings2,
  ChartNoAxesColumn,
  ClipboardCheck,
  BadgeInfo,
  HeartHandshake,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth.js';
import { useSettings, useUpdateSettings } from '@/features/settings/hooks/use-settings.js';
import { usePWAInstall } from '@/hooks/use-pwa-install.js';
import { cn } from '@/lib/utils.js';
import { SUPPORT_EMAIL } from '@/lib/constants.js';
import { setAnalyticsOptIn, trackNotificationToggle } from '@/lib/analytics.js';
import { normalizePrecision } from '@/lib/geocoding.js';
import { logger } from '@/lib/logger.js';
import { supabase } from '@/lib/supabase.js';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { ErrorState } from '@/components/shared/ErrorState';

const APP_VERSION_FALLBACK = '2.0.0';

function getFeedbackPlatform() {
  try {
    return navigator.userAgentData?.platform || navigator.platform || 'unknown';
  } catch {
    return 'unknown';
  }
}

function buildFeedbackEmailBody() {
  const appVersion = import.meta.env.VITE_APP_VERSION || APP_VERSION_FALLBACK;
  const userAgent = (navigator.userAgent || 'unknown').slice(0, 160);
  const screenSize = `${window.innerWidth}x${window.innerHeight}`;
  const platform = getFeedbackPlatform();

  return [
    'Issue summary:',
    '',
    'What happened:',
    '',
    'Expected behavior:',
    '',
    'Steps to reproduce:',
    '1.',
    '2.',
    '3.',
    '',
    'Screenshot attached?: No',
    '',
    `Device/platform: ${platform}`,
    `App version: ${appVersion}`,
    `Screen size: ${screenSize}`,
    `User agent: ${userAgent}`,
    '',
    'Additional context:',
    '',
  ].join('\n');
}

function openFeedbackEmail() {
  const email = import.meta.env.VITE_SUPPORT_EMAIL || SUPPORT_EMAIL;
  const subject = '[Ride Radar Beta Feedback]';
  const body = buildFeedbackEmailBody();
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Settings row with icon, label, chevron, and optional value/toggle.
 *
 * Toggle rows render as a <div> so the Radix Switch (itself a <button>) is not
 * nested inside another <button> — invalid HTML that causes browsers to suppress
 * pointer events on the inner Switch when the outer button is disabled.
 * Navigation rows (onClick) render as <button> as before.
 */
const SettingsRow = memo(function SettingsRow({
  icon: Icon,
  label,
  desc,
  value,
  toggle,
  onToggle,
  danger,
  onClick,
  disabled,
}) {
  const isToggleRow = toggle !== undefined;

  const sharedBase = cn(
    'w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
    danger ? 'hover:bg-brand-emergency/5' : 'hover:bg-white/[0.02]',
    disabled && 'opacity-50'
  );

  const contents = (
    <>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon className={cn('h-5 w-5', danger ? 'text-brand-emergency' : 'text-primary')} strokeWidth={2} />
      </div>
      <VStack flex className="min-w-0">
        <Text variant="bodySm" className={cn('font-semibold', danger && 'text-brand-emergency')}>
          {label}
        </Text>
        {desc && (
          <Text variant="caption" color="muted">{desc}</Text>
        )}
      </VStack>
      {isToggleRow && (
        <Switch
          checked={toggle}
          onCheckedChange={onToggle}
          disabled={disabled}
          className="data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
        />
      )}
      {value && !isToggleRow && (
        <Text variant="caption" color="muted" className="shrink-0">{value}</Text>
      )}
      {onClick && !isToggleRow && (
        <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-brand-emergency/50' : 'text-muted-foreground')} />
      )}
    </>
  );

  if (isToggleRow) {
    return <div className={sharedBase}>{contents}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(sharedBase, 'active:bg-white/[0.04]', onClick && 'cursor-pointer', disabled && 'cursor-not-allowed')}
    >
      {contents}
    </button>
  );
});

/**
 * Section card wrapper with glassmorphism.
 */
const SettingsSection = memo(function SettingsSection({ title, icon: Icon, children, error, danger }) {
  return (
    <div className={cn(
      'overflow-hidden surface-card',
      danger && 'border-brand-emergency/20'
    )}>
      <div className={cn(
        'px-4 py-2.5 border-b',
        danger ? 'border-brand-emergency/10' : 'border-white/[0.05]'
      )}>
        <Text variant="micro" className={cn('font-semibold uppercase tracking-wider', danger ? 'text-brand-emergency' : 'text-muted-foreground')}>
          {title}
        </Text>
      </div>
      <VStack>{children}</VStack>
      {error && (
        <HStack align="center" gap={2} className="border-t border-border/40 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-brand-emergency" />
          <Text variant="caption" className="text-brand-emergency">{error}</Text>
        </HStack>
      )}
    </div>
  );
});

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
      <Skeleton className="mb-4 h-32 w-full rounded-[1.25rem]" />
      <Skeleton className="mb-4 h-56 w-full rounded-[1.25rem]" />
      <Skeleton className="mb-4 h-40 w-full rounded-[1.25rem]" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuthState();
  const { signOut, refreshProfile } = useAuthActions();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
    isError: settingsIsError,
    refetch: refetchSettings,
  } = useSettings(user?.id);

  const { mutate: saveSettings, isPending: isSaving } = useUpdateSettings();
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  const handleProfileVisibilityToggle = useCallback(
    async (v) => {
      if (!user?.id || isProfileSaving) return;
      setIsProfileSaving(true);
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_public: v })
          .eq('user_id', user.id);
        if (error) {
          logger.warn('[Settings] Failed to update profile visibility:', error);
          toast.error('Failed to update profile visibility. Please try again.');
        } else {
          await refreshProfile();
        }
      } finally {
        setIsProfileSaving(false);
      }
    },
    [user?.id, isProfileSaving, refreshProfile]
  );

  // Sync analytics opt-in when settings load
  useEffect(() => {
    if (settings?.analytics_enabled !== undefined) {
      setAnalyticsOptIn(settings.analytics_enabled !== false);
    }
  }, [settings?.analytics_enabled]);

  const handleToggle = useCallback(
    (key, value) => {
      if (!user?.id || !settings) return;

      saveSettings(
        { userId: user.id, updates: { [key]: value } },
        {
          onSuccess: () => {
            const notificationKeys = ['notifications_enabled'];
            if (notificationKeys.includes(key)) {
              trackNotificationToggle(key, value);
            }
            if (key === 'analytics_enabled') {
              setAnalyticsOptIn(value);
            }
            if (key === 'live_map_visible' && value === false && user?.id) {
              supabase
                .from('live_map_presence')
                .upsert(
                  {
                    user_id: user.id,
                    display_name: profile?.display_name || 'Rider',
                    avatar_url: profile?.avatar_url || null,
                    is_visible: false,
                    location_precision: normalizePrecision(settings.live_map_location_precision),
                    lat: null,
                    lng: null,
                    accuracy_meters: null,
                    approximate_radius_miles: null,
                    source: 'settings',
                    last_seen_at: new Date().toISOString(),
                    expires_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id' }
                )
                .then(({ error }) => {
                  if (error) logger.warn('[Settings] Failed to clear live map presence:', error);
                  queryClient.invalidateQueries({ queryKey: ['live-map-presence'] });
                });
            }
          },
          onError: () => toast.error('Failed to save setting. Please try again.'),
        }
      );
    },
    [user?.id, settings, saveSettings, profile]
  );

  const handlePrecisionChange = useCallback(
    (value) => {
      if (!user?.id) return;
      const normalized = normalizePrecision(value);
      saveSettings(
        { userId: user.id, updates: { live_map_location_precision: normalized } },
        {
          onError: () => toast.error('Failed to save location precision. Please try again.'),
        }
      );
    },
    [user?.id, saveSettings]
  );

  const handleInstallApp = useCallback(async () => {
    const accepted = await promptInstall();
    if (accepted) {
      logger.debug('[PWA] App installed from settings');
    }
  }, [promptInstall]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      logger.warn('[Settings] Sign out failed:', err);
      toast.error('Failed to sign out. Please try again.');
    }
    navigate('/landing');
  }, [signOut, navigate]);

  if (settingsLoading || !profile) {
    return <SettingsSkeleton />;
  }

  if (settingsIsError || settingsError) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8 bg-background min-h-dvh">
        <ErrorState
          title="Settings unavailable"
          message="Unable to load your settings. You can still log out safely."
          onRetry={refetchSettings}
        />
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleSignOut}
            className={cn(
              'px-5 py-2.5 rounded-full border border-brand-emergency/30 text-brand-emergency text-sm font-semibold',
              'hover:bg-brand-emergency/10 transition-colors pressable'
            )}
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up bg-background min-h-dvh">
      {/* Profile Section */}
      <SettingsSection title="Your Account" icon={User}>
        <Link to="/settings/account" className="block">
          <HStack align="center" gap={3} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
            <AvatarWithStatus
              url={profile?.avatar_url}
              name={profile?.display_name}
              status="online"
              size="md"
            />
            <VStack flex className="min-w-0">
              <Text variant="bodySm" className="font-semibold truncate">
                {profile?.display_name || user?.email}
              </Text>
              <Text variant="caption" color="muted" truncate>
                {user?.email}
              </Text>
            </VStack>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </HStack>
        </Link>
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account" icon={ShieldCheck}>
        <SettingsRow
          icon={Bell}
          label="In-app notifications"
          desc="Get notified about rides, messages, and connections"
          toggle={settings?.notifications_enabled !== false}
          onToggle={(v) => handleToggle('notifications_enabled', v)}
          disabled={isSaving}
        />
        {settings?.notifications_enabled !== false && (
          <div className="px-4 pb-3">
            <VStack gap={1} className="pl-11">
              <SettingsRow
                icon={MessageSquare}
                label="Messages"
                desc="Direct messages and conversation activity"
                toggle={settings?.notify_messages !== false}
                onToggle={(v) => handleToggle('notify_messages', v)}
                disabled={isSaving}
              />
              <SettingsRow
                icon={CalendarHeart}
                label="Meetups & Events"
                desc="RSVPs, event reminders, and ride coordination"
                toggle={settings?.notify_meetups !== false}
                onToggle={(v) => handleToggle('notify_meetups', v)}
                disabled={isSaving}
              />
              <SettingsRow
                icon={TriangleAlert}
                label="Safety Alerts"
                desc="Bike down, road hazards, and urgent signals"
                toggle={settings?.notify_safety_alerts !== false}
                onToggle={(v) => handleToggle('notify_safety_alerts', v)}
                disabled={isSaving}
              />
              <SettingsRow
                icon={Users}
                label="Connections & Social"
                desc="Friend requests, follows, and social activity"
                toggle={settings?.notify_connections !== false}
                onToggle={(v) => handleToggle('notify_connections', v)}
                disabled={isSaving}
              />
            </VStack>
          </div>
        )}
        <div className="border-t border-border/40">
          <SettingsRow
            icon={Eye}
            label="Public profile preview"
            desc="Allow others to see your profile without connecting"
            toggle={profile?.is_public !== false}
            onToggle={handleProfileVisibilityToggle}
            disabled={isSaving || isProfileSaving}
          />
        </div>
        <div className="border-t border-border/40">
          <Link to="/settings/blocked-users" className="block">
            <SettingsRow
              icon={ShieldCheck}
              label="Blocked Users"
              desc="Manage riders you have blocked"
            />
          </Link>
        </div>
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences" icon={Settings2}>
        <SettingsRow
          icon={MapPin}
          label="Show me on the live map"
          desc="Opt in only when you want other signed-in riders to see your current riding marker"
          toggle={!!settings?.live_map_visible}
          onToggle={(v) => handleToggle('live_map_visible', v)}
          disabled={isSaving}
        />
        {settings?.live_map_visible && (
          <div className="border-t border-border/40 px-4 py-4">
            <HStack align="center" justify="between" gap={4}>
              <VStack flex>
                <Text variant="bodySm" className="font-medium">Location precision</Text>
                <Text variant="caption" color="muted">
                  Approximate stores a fuzzed marker. Precise stores your current marker coordinate.
                </Text>
              </VStack>
              <Select
                value={normalizePrecision(settings?.live_map_location_precision)}
                onValueChange={handlePrecisionChange}
                disabled={isSaving}
              >
                <SelectTrigger className="w-36 rounded-xl border-border/60 bg-black/25 focus:ring-primary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-surface-elevated">
                  <SelectItem value="approximate">Approximate</SelectItem>
                  <SelectItem value="precise">Precise</SelectItem>
                </SelectContent>
              </Select>
            </HStack>
          </div>
        )}
        <div className="border-t border-border/40">
          <SettingsRow
            icon={ChartNoAxesColumn}
            label="Anonymous usage analytics"
            desc="Help improve the app (no personal data collected)"
            toggle={settings?.analytics_enabled !== false}
            onToggle={(v) => handleToggle('analytics_enabled', v)}
            disabled={isSaving}
          />
        </div>
      </SettingsSection>

      {/* App */}
      <SettingsSection title="App" icon={Smartphone}>
        {isInstallable && (
          <button
            onClick={handleInstallApp}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <VStack flex>
              <Text variant="bodySm" className="font-semibold">Install Ride Radar</Text>
              <Text variant="caption" color="muted">Add to your home screen</Text>
            </VStack>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
        {isInstalled && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <VStack flex>
              <Text variant="bodySm" className="font-semibold text-primary">App Installed</Text>
              <Text variant="caption" color="muted">Ride Radar is installed on your device</Text>
            </VStack>
          </div>
        )}
        {!isInstallable && !isInstalled && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
          <div className="px-4 py-4">
            <Text variant="bodySm" className="font-semibold text-primary mb-2">Install on iOS</Text>
            <ol className="list-inside list-decimal space-y-1">
              <Text variant="caption" color="muted">Tap the <strong>Share</strong> button in Safari</Text>
              <Text variant="caption" color="muted">Scroll down and tap <strong>Add to Home Screen</strong></Text>
              <Text variant="caption" color="muted">Tap <strong>Add</strong> in the top right</Text>
            </ol>
          </div>
        )}
        <div className="border-t border-border/40">
          <SettingsRow
            icon={BadgeInfo}
            label="App Version"
            value={import.meta.env.VITE_APP_VERSION || 'dev'}
          />
        </div>
        <div className="border-t border-border/40">
          <SettingsRow
            icon={AppWindow}
            label="Environment"
            value={
              import.meta.env.PROD
                ? 'Production'
                : import.meta.env.DEV
                  ? 'Development'
                  : 'Staging'
            }
          />
        </div>
      </SettingsSection>

      {/* Support */}
      <SettingsSection title="Support" icon={Mail}>
        <Link to="/terms-of-use" className="block">
          <SettingsRow icon={ScrollText} label="Terms of Use" desc="Rules, responsibilities, and app limitations" />
        </Link>
        <div className="border-t border-border/40">
          <Link to="/community-guidelines" className="block">
            <SettingsRow icon={HeartHandshake} label="Community Guidelines" desc="Respect, safety, and acceptable use" />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/privacy-policy" className="block">
            <SettingsRow icon={FileText} label="Privacy Policy" desc="Data collection, location, uploads, and deletion" />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/safety-disclaimer" className="block">
            <SettingsRow icon={ShieldAlert} label="Safety Disclaimer" desc="Emergency reminders and app limitations" />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/support" className="block">
            <SettingsRow icon={Mail} label="Contact / Support" desc={SUPPORT_EMAIL} />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/review-readiness" className="block">
            <SettingsRow icon={ClipboardCheck} label="Data Safety Summary" desc="Store review disclosure checklist" />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/beta-notes" className="block">
            <SettingsRow icon={BadgeInfo} label="Beta Notes" desc="Known issues, update guidance, and beta expectations" />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <SettingsRow
            icon={Mail}
            label="Report an Issue / Feedback"
            desc="Email a structured bug report or suggestion"
            onClick={openFeedbackEmail}
          />
        </div>
      </SettingsSection>

      {/* Danger Zone */}
        <SettingsSection title="Danger Zone" icon={AlertCircle} danger>
          <Link to="/account-deletion" className="block">
            <SettingsRow
              icon={Trash2}
              label="Delete Account"
              desc="Delete your account and remove or anonymize associated Ride Radar data"
              danger
            />
          </Link>
          <div className="border-t border-brand-emergency/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-brand-emergency/5 transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <LogOut className="h-5 w-5 text-brand-emergency" />
            </div>
            <VStack flex>
              <Text variant="bodySm" className="font-semibold text-brand-emergency">Log out</Text>
              <Text variant="caption" className="text-brand-emergency/70">Sign out of your account</Text>
            </VStack>
            <ChevronRight className="h-4 w-4 shrink-0 text-brand-emergency/50" />
          </button>
        </div>
      </SettingsSection>
    </VStack>
  );
}

export default memo(SettingsPage);
