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
    <div className="mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)]">
      <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      </div>
      {children}
      {error && (
        <div className="flex items-center gap-2 border-t border-border/40 px-5 py-3 text-sm text-destructive">
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
    <div className="flex items-center justify-between gap-4 px-5 py-4">
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

/**
 * Link row for navigation items.
 */
const LinkRow = memo(function LinkRow({ to, icon: Icon, label, desc, danger }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02] active:scale-[0.99]'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        danger ? 'bg-destructive/10' : 'bg-primary/10'
      )}>
        <Icon className={cn('h-5 w-5', danger ? 'text-destructive' : 'text-primary')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-semibold', danger && 'text-destructive')}>
          {label}
        </div>
        {desc && <div className="mt-0.5 text-xs text-muted-foreground truncate">{desc}</div>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
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
];

const DANGER_LINKS = [
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
    <div className="mx-auto max-w-2xl px-5 pt-5 pb-8">
      <Skeleton className="mb-5 h-40 w-full rounded-[20px]" />
      <Skeleton className="mb-5 h-64 w-full rounded-[20px]" />
      <Skeleton className="mb-5 h-32 w-full rounded-[20px]" />
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
      <div className="mx-auto max-w-2xl px-5 pt-5 pb-8">
        <div className="rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6 text-center">
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

  return (
    <div className="mx-auto max-w-2xl px-5 pt-5 pb-8">
      {/* Back link */}
      <Link
        to="/profile"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1 active:scale-95 transition-transform"
      >
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>

      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)] p-6">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Safety hub
          </div>
          <div className="flex items-center gap-3 mb-2">
            <RRLogo size="md" />
            <h1 className="font-display text-4xl font-extrabold tracking-[-0.04em]">Settings</h1>
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
          <div className="flex items-center justify-between gap-4 border-t border-border/40 px-5 py-4">
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
              <SelectTrigger className="w-36 rounded-xl border-border/60 bg-black/25">
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
        <div className="border-t border-border/40">
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
              className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)] transition-all hover:bg-primary/90 active:scale-95"
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

      {/* Support Links */}
      <div className="mb-5 overflow-hidden rounded-[20px] border border-border/60 bg-[hsl(220_20%_7%)]">
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
          <Mail className="h-4 w-4 text-primary" />
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Support</div>
        </div>
        {SETTINGS_LINKS.map((item) => (
          <LinkRow key={item.label} {...item} />
        ))}
      </div>

      {/* Danger Zone */}
      <div className="mb-6 overflow-hidden rounded-[20px] border border-destructive/20 bg-destructive/[0.03]">
        <div className="flex items-center gap-2 border-b border-destructive/10 px-5 py-3">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-destructive">Danger Zone</div>
        </div>
        {DANGER_LINKS.map((item) => (
          <LinkRow key={item.label} {...item} />
        ))}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-4 px-5 py-4 text-destructive transition-colors hover:bg-destructive/5 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">Log out</div>
            <div className="mt-0.5 text-xs text-destructive/70">Sign out of your account</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-destructive/50" />
        </button>
      </div>
    </div>
  );
}

export default memo(SettingsPage);
