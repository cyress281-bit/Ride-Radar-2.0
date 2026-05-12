/**
 * Settings hub page for Ride Radar 2.0.
 *
 * Sections: Notifications, Live Map, Privacy, PWA, Account, Links.
 * Each toggle saves immediately. Properly exposes error and refetch from the query hook.
 */

import { useCallback, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LogOut,
  ExternalLink,
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
} from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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

/**
 * Section wrapper with title and optional error state.
 */
const SettingsSection = memo(function SettingsSection({ title, icon: Icon, children, error }) {
  return (
    <div className="mb-5 rr-glass-panel overflow-hidden p-1">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <div className="rr-kicker text-muted-foreground">{title}</div>
      </div>
      {children}
      {error && (
        <div className="flex items-center gap-2 border-t border-border/40 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Toggle row within a settings section.
 */
const ToggleRow = memo(function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="flex-1">
        <span className="text-sm font-medium leading-snug">{label}</span>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
});

const SETTINGS_LINKS = [
  {
    to: '/privacy-policy',
    icon: FileText,
    label: 'Privacy Policy',
    desc: 'Data collection, location, uploads, and deletion',
  },
  {
    to: '/support',
    icon: Mail,
    label: 'Contact / Support',
    desc: SUPPORT_EMAIL,
  },
  {
    to: '/review-readiness',
    icon: Database,
    label: 'Data Safety Summary',
    desc: 'Store review disclosure checklist',
  },
  {
    to: '/account-deletion',
    icon: Trash2,
    label: 'Delete Account',
    desc: 'Permanently delete Ride Radar app data',
    danger: true,
  },
];

/**
 * Loading skeleton for the settings page.
 */
function SettingsSkeleton() {
  return (
    <div className="px-5 pt-5 pb-8">
      <Skeleton className="mb-5 h-40 w-full rounded-[1.45rem]" />
      <Skeleton className="mb-5 h-64 w-full rounded-2xl" />
      <Skeleton className="mb-5 h-32 w-full rounded-2xl" />
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

  // FIX: properly destructure error and refetch from the query hook
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
            // Track notification toggles
            const notificationKeys = ['notifications_enabled'];
            if (notificationKeys.includes(key)) {
              trackNotificationToggle(key, value);
            }

            // Update analytics opt-in state
            if (key === 'analytics_enabled') {
              setAnalyticsOptIn(value);
            }

            // Clear live map presence when turning off
            if (key === 'live_map_visible' && value === false && user?.id) {
              supabase
                .from('live_map_presence')
                .upsert(
                  {
                    user_id: user.id,
                    display_name: profile?.display_name || profile?.displayName || 'Rider',
                    avatar_url: profile?.avatar_url || profile?.avatar || null,
                    is_visible: false,
                    location_precision: normalizePrecision(
                      settings.live_map_location_precision
                    ),
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

  // Loading state
  if (settingsLoading || !profile) {
    return <SettingsSkeleton />;
  }

  // Error state — FIX: uses `settingsError` and `refetchSettings` properly
  if (settingsIsError || settingsError) {
    return (
      <div className="px-5 pt-5 pb-8">
        <div className="rr-surface-strong rounded-[1.45rem] p-6 text-center">
          <h2 className="font-display mb-2 text-xl font-bold text-destructive">
            Settings unavailable
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Unable to load your settings. You can still log out safely.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => refetchSettings()} variant="outline" className="rounded-full">
              Retry
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="rounded-full border-destructive/30 text-destructive"
            >
              Log out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const links = SETTINGS_LINKS;

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Back link */}
      <Link
        to="/profile"
        className="rr-haptic mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>

      {/* Header */}
      <div className="rr-surface-strong relative mb-5 overflow-hidden rounded-[1.45rem] p-5">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Safety hub
          </div>
          <div className="flex items-center gap-3 mb-2">
            <RRLogo size="md" />
            <h1 className="rr-heading text-4xl">Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Privacy, safety, notifications, and account controls.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <SettingsSection title="Notifications" icon={Bell} error={null}>
        <ToggleRow
          label="Push notifications"
          description="Receive push notifications on your device"
          checked={settings?.notifications_enabled !== false}
          onChange={(v) => handleToggle('notifications_enabled', v)}
          disabled={isSaving}
        />
      </SettingsSection>

      {/* Live Map */}
      <SettingsSection title="Live Map" icon={MapPin} error={null}>
        <ToggleRow
          label="Show me on the live map"
          description="Opt in only when you want other signed-in riders to see your current riding marker"
          checked={!!settings?.live_map_visible}
          onChange={(v) => handleToggle('live_map_visible', v)}
          disabled={isSaving}
        />
        {settings?.live_map_visible && (
          <div className="flex items-center justify-between gap-4 border-t border-border/40 px-4 py-4">
            <div className="flex-1">
              <span className="text-sm font-medium leading-snug">Location precision</span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Approximate stores a fuzzed marker. Precise stores your current marker coordinate.
              </p>
            </div>
            <Select
              value={normalizePrecision(settings?.live_map_location_precision)}
              onValueChange={handlePrecisionChange}
            >
              <SelectTrigger className="rr-premium-input w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approximate">Approximate</SelectItem>
                <SelectItem value="precise">Precise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection title="Privacy" icon={Eye} error={null}>
        <ToggleRow
          label="Anonymous usage analytics"
          description="Help improve the app (no personal data collected)"
          checked={settings?.analytics_enabled !== false}
          onChange={(v) => handleToggle('analytics_enabled', v)}
          disabled={isSaving}
        />
        <div className="border-t border-border/40 bg-primary/5">
          <ToggleRow
            label="Public profile preview"
            checked={profile?.is_public !== false}
            onChange={async (v) => {
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

      {/* PWA */}
      <SettingsSection title="App Features" icon={Smartphone} error={null}>
        <div className="space-y-2 p-3">
          {isInstallable && (
            <Button
              onClick={handleInstallApp}
              className="rr-haptic glow-green h-12 w-full rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Install Ride Radar App
            </Button>
          )}
          {isInstalled && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
              <Check className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-bold text-primary">App Installed</div>
                <div className="text-xs text-muted-foreground">
                  Ride Radar is installed on your device
                </div>
              </div>
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
          )}
          {!isInstallable && !isInstalled && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-1 text-sm font-bold text-primary">Install on iOS</div>
              <ol className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                <li>
                  Tap the <strong>Share</strong> button in Safari
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>
                </li>
                <li>
                  Tap <strong>Add</strong> in the top right
                </li>
              </ol>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Links */}
      <div className="rr-surface mb-5 space-y-2 rounded-[1.45rem] p-3">
        {links.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={cn(
              'rr-haptic flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 transition-colors hover:border-primary/35'
            )}
          >
            <item.icon
              className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')}
            />
            <div className="flex-1">
              <div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Account */}
      <Button
        variant="outline"
        onClick={handleSignOut}
        className="rr-haptic h-12 w-full rounded-full border-destructive/30 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" /> Log out securely
      </Button>
    </div>
  );
}

export default memo(SettingsPage);

