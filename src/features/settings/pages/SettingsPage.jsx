/**
 * Settings hub page for Ride Radar 2.0 — Electric Neon Green redesign.
 *
 * Sections: Profile, Account, Preferences, App, Support, Danger.
 * Each toggle saves immediately. Grouped sections as glassmorphism cards.
 */

import { useCallback, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Trash2,
  Mail,
  FileText,
  Database,
  Download,
  Check,
  Smartphone,
  Bell,
  MapPin,
  Eye,
  AlertCircle,
  ChevronRight,
  User,
  Settings2,
  Heart,
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

/**
 * Settings row with icon, label, chevron, and optional value/toggle.
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !!toggle}
      className={cn(
        'w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
        'hover:bg-white/[0.02] active:bg-white/[0.04]',
        danger && 'hover:bg-brand-emergency/5',
        onClick && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        danger ? 'bg-brand-emergency/10' : 'bg-primary/10'
      )}>
        <Icon className={cn('h-5 w-5', danger ? 'text-brand-emergency' : 'text-primary')} />
      </div>
      <VStack flex className="min-w-0">
        <Text variant="bodySm" className={cn('font-semibold', danger && 'text-brand-emergency')}>
          {label}
        </Text>
        {desc && (
          <Text variant="caption" color="muted" truncate>{desc}</Text>
        )}
      </VStack>
      {toggle !== undefined && (
        <Switch
          checked={toggle}
          onCheckedChange={onToggle}
          disabled={disabled}
          className="data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
        />
      )}
      {value && toggle === undefined && (
        <Text variant="caption" color="muted" className="shrink-0">{value}</Text>
      )}
      {onClick && toggle === undefined && (
        <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-brand-emergency/50' : 'text-muted-foreground')} />
      )}
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
      <HStack align="center" gap={2} className={cn(
        'px-4 py-3 border-b',
        danger ? 'border-brand-emergency/10' : 'border-border/40'
      )}>
        {Icon && <Icon className={cn('h-4 w-4', danger ? 'text-brand-emergency' : 'text-primary')} />}
        <Text variant="micro" className={cn('font-bold uppercase tracking-wider', danger ? 'text-brand-emergency' : 'text-muted-foreground')}>
          {title}
        </Text>
      </HStack>
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
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
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
                    display_name: profile?.display_name || profile?.displayName || 'Rider',
                    avatar_url: profile?.avatar_url || profile?.avatar || null,
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
        }
      );
    },
    [user?.id, settings, saveSettings, profile]
  );

  const handlePrecisionChange = useCallback(
    (value) => {
      if (!user?.id) return;
      const normalized = normalizePrecision(value);
      saveSettings({ userId: user.id, updates: { live_map_location_precision: normalized } });
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
    await signOut();
    navigate('/landing');
  }, [signOut, navigate]);

  if (settingsLoading || !profile) {
    return <SettingsSkeleton />;
  }

  if (settingsIsError || settingsError) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-8">
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
    <VStack gap={4} className="mx-auto max-w-2xl px-4 pt-4 pb-8 animate-fade-up">
      {/* Back link */}
      <Link
        to="/profile"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 pressable self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>

      {/* Profile Section */}
      <SettingsSection title="Profile" icon={User}>
        <Link to="/profile" className="block">
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
          label="Push notifications"
          desc="Receive push notifications on your device"
          toggle={settings?.notifications_enabled !== false}
          onToggle={(v) => handleToggle('notifications_enabled', v)}
          disabled={isSaving}
        />
        <div className="border-t border-border/40">
          <SettingsRow
            icon={Eye}
            label="Public profile preview"
            desc="Allow others to see your profile without connecting"
            toggle={profile?.is_public !== false}
            onToggle={async (v) => {
              const { error } = await supabase
                .from('user_profiles')
                .update({ is_public: v })
                .eq('user_id', user.id);
              if (!error) await refreshProfile();
            }}
            disabled={isSaving}
          />
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
            icon={Heart}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.1)]">
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.1)]">
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
      </SettingsSection>

      {/* Support */}
      <SettingsSection title="Support" icon={Mail}>
        <Link to="/privacy-policy" className="block">
          <SettingsRow icon={FileText} label="Privacy Policy" desc="Data collection, location, uploads, and deletion" />
        </Link>
        <div className="border-t border-border/40">
          <Link to="/support" className="block">
            <SettingsRow icon={Mail} label="Contact / Support" desc={SUPPORT_EMAIL} />
          </Link>
        </div>
        <div className="border-t border-border/40">
          <Link to="/review-readiness" className="block">
            <SettingsRow icon={Database} label="Data Safety Summary" desc="Store review disclosure checklist" />
          </Link>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone" icon={AlertCircle} danger>
        <Link to="/account-deletion" className="block">
          <SettingsRow icon={Trash2} label="Delete Account" desc="Permanently delete Ride Radar app data" danger />
        </Link>
        <div className="border-t border-brand-emergency/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-brand-emergency/5 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-emergency/10">
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
