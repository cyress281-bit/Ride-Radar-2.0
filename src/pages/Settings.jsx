import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, ExternalLink, ShieldCheck, Trash2, Mail, FileText, Database, Download, Check, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL } from '@/pages/PrivacyPolicy';
import { setAnalyticsOptIn, trackNotificationToggle } from '@/lib/analytics';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { normalizePrecision } from '@/lib/geocoding';
import { logger } from '@/lib/logger';
import React from 'react';

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useSupabaseAuth();
  const qc = useQueryClient();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const { data: settings } = useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create defaults
      if (!data) {
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            notify_on_connection: true,
            notify_on_message: true,
            notify_on_rsvp: true,
            notify_on_alert: true,
            show_location: true,
            live_map_visible: false,
            live_map_location_precision: 'approximate',
            analytics_enabled: true, // Opt-in by default
          })
          .select()
          .single();

        if (createError) throw createError;
        return newSettings;
      }

      return data;
    },
  });

  // Sync analytics opt-in state when settings load
  React.useEffect(() => {
    if (settings) {
      setAnalyticsOptIn(settings.analytics_enabled !== false);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async (patch) => {
      const { error } = await supabase
        .from('user_settings')
        .update(patch)
        .eq('id', settings.id);

      if (error) throw error;
      return patch;
    },
    onSuccess: async (patch) => {
      qc.invalidateQueries({ queryKey: ['settings'] });

      // Update analytics opt-in state
      if ('analytics_enabled' in patch) {
        setAnalyticsOptIn(patch.analytics_enabled);
      }

      if (patch.live_map_visible === false && user?.id) {
        const { error } = await supabase
          .from('live_map_presence')
          .upsert({
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
          }, { onConflict: 'user_id' });

        if (error) logger.warn('[Settings] Failed to clear live map presence:', error);
        qc.invalidateQueries({ queryKey: ['live-map-presence'] });
      }

      // Track notification toggle events
      const notificationKeys = ['notify_on_connection', 'notify_on_message', 'notify_on_rsvp', 'notify_on_alert'];
      const changedKey = Object.keys(patch).find(k => notificationKeys.includes(k));
      if (changedKey) {
        trackNotificationToggle(changedKey, patch[changedKey]);
      }
    },
  });

  const togglePublic = useMutation({
    mutationFn: async (v) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_public: v })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
    },
  });

  const handleInstallApp = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      console.log('[PWA] App installed from settings');
    }
  };

  if (settingsError) {
    return (
      <div className="px-5 pt-5 pb-8">
        <div className="rr-surface-strong rounded-[1.45rem] p-6 text-center">
          <h2 className="font-display text-xl font-bold text-alert mb-2">Settings unavailable</h2>
          <p className="text-sm text-muted-foreground mb-4">Unable to load your settings. You can still log out safely.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => refetchSettings()} variant="outline" className="rounded-full">Retry</Button>
            <Button onClick={() => signOut()} variant="outline" className="rounded-full text-destructive border-destructive/30">Log out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!settings || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const rows = [
    { key: 'notify_on_connection', label: 'Connection requests' },
    { key: 'notify_on_message', label: 'New messages' },
    { key: 'notify_on_rsvp', label: 'Event RSVPs' },
    { key: 'notify_on_alert', label: 'Alerts in your area' },
    { key: 'show_location', label: 'Share approximate location on posts' },
    { key: 'live_map_visible', label: 'Show me on the live map', desc: 'Opt in only when you want other signed-in riders to see your current riding marker' },
    { key: 'analytics_enabled', label: 'Anonymous usage analytics', desc: 'Help improve the app (no personal data collected)' },
  ];

  const links = [
    { to: PRIVACY_POLICY_URL, icon: FileText, label: 'Privacy Policy', desc: 'Data collection, location, uploads, and deletion' },
    { to: SUPPORT_URL, icon: Mail, label: 'Contact / Support', desc: SUPPORT_EMAIL },
    { to: '/review-readiness', icon: Database, label: 'Data Safety Summary', desc: 'Store review disclosure checklist' },
    { to: ACCOUNT_DELETION_URL, icon: Trash2, label: 'Delete Account', desc: 'Permanently delete Ride Radar app data', danger: true },
  ];

  return (
    <div className="px-5 pt-5 pb-8">
      <Link to="/profile" className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>

      {/* Header */}
      <div className="mb-5 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3"><ShieldCheck className="h-3.5 w-3.5" /> Safety hub</div>
          <h1 className="rr-heading text-4xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Privacy, safety, notifications, and account controls.</p>
        </div>
      </div>

      {/* Notifications & Privacy Toggles */}
      <div className="mb-5 rr-glass-panel p-1 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="rr-kicker text-muted-foreground mb-1">Notifications & Privacy</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.key} className={cn('flex items-center justify-between gap-4 px-4 py-4', i !== rows.length - 1 && 'border-b border-border/40')}>
            <div className="flex-1">
              <span className="text-sm font-medium leading-snug">{r.label}</span>
              {r.desc && <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>}
            </div>
            <Switch
              checked={!!settings[r.key]}
              onCheckedChange={(v) => save.mutate({ [r.key]: v })}
              disabled={save.isPending}
            />
          </div>
        ))}
        {settings.live_map_visible && (
          <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-border/40">
            <div className="flex-1">
              <span className="text-sm font-medium leading-snug">Live map location precision</span>
              <p className="text-xs text-muted-foreground mt-0.5">Approximate stores a fuzzed marker. Precise stores your current marker coordinate.</p>
            </div>
            <Select
              value={normalizePrecision(settings.live_map_location_precision)}
              onValueChange={(v) => save.mutate({ live_map_location_precision: normalizePrecision(v) })}
            >
              <SelectTrigger className="w-36 rr-premium-input rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approximate">Approximate</SelectItem>
                <SelectItem value="precise">Precise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-border/40 bg-primary/5">
          <span className="text-sm font-medium text-primary">Public profile preview</span>
          <Switch checked={profile.is_public !== false} onCheckedChange={(v) => togglePublic.mutate(v)} />
        </div>
      </div>

      {/* Privacy Disclosure */}
      <div className="mb-5 rr-surface rounded-[1.45rem] p-4">
        <div className="mb-2 rr-kicker text-muted-foreground">Privacy disclosure</div>
        <p className="text-sm text-muted-foreground leading-relaxed">Location posts use approximate, fuzzed, frozen location when enabled. Live map presence is opt-in and can be approximate or precise. Uploaded images are used for your profile, bike, events, and alerts. Public profile visibility controls what other riders can see.</p>
      </div>

      {/* PWA Install Section */}
      <div className="mb-5 rr-surface rounded-[1.45rem] p-4">
        <div className="mb-3 rr-kicker text-muted-foreground">App Features</div>
        <div className="space-y-2">
          {isInstallable && (
            <Button
              onClick={handleInstallApp}
              className="w-full h-12 rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 rr-haptic glow-green"
            >
              <Download className="w-4 h-4 mr-2" />
              Install Ride Radar App
            </Button>
          )}
          {isInstalled && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
              <Check className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-bold text-primary">App Installed</div>
                <div className="text-xs text-muted-foreground">Ride Radar is installed on your device</div>
              </div>
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
          )}
          {!isInstallable && !isInstalled && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm font-bold text-primary mb-1">Install on iOS</div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> button in Safari</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong> in the top right</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className="space-y-2 rr-surface rounded-[1.45rem] p-3 mb-5">
        {links.map((item) => item.to.startsWith('http') ? (
          <a key={item.label} href={item.to} className="rr-haptic flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 hover:border-primary/35 transition-colors">
            <item.icon className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')} />
            <div className="flex-1">
              <div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        ) : (
          <Link key={item.label} to={item.to} className="rr-haptic flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 hover:border-primary/35 transition-colors">
            <item.icon className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')} />
            <div className="flex-1">
              <div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Button variant="outline" onClick={() => signOut()} className="w-full rounded-full h-12 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors rr-haptic">
        <LogOut className="w-4 h-4 mr-2" /> Log out securely
      </Button>
    </div>
  );
}
