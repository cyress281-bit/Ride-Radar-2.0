import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, ExternalLink, ShieldCheck, Trash2, Mail, FileText, Database, Download, Check, Smartphone, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL } from '@/pages/PrivacyPolicy';
import { setAnalyticsOptIn, trackNotificationToggle } from '@/lib/analytics';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { requestPushPermission } from '@/lib/registerSW';
import React, { useState } from 'react';

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useSupabaseAuth();
  const qc = useQueryClient();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [pushPermission, setPushPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

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
    onSuccess: (patch) => {
      qc.invalidateQueries({ queryKey: ['settings'] });

      // Update analytics opt-in state
      if ('analytics_enabled' in patch) {
        setAnalyticsOptIn(patch.analytics_enabled);
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

  const handleEnablePush = async () => {
    const token = await requestPushPermission(user.id);
    if (token) {
      setPushPermission('granted');
      console.log('[PWA] Push notifications enabled');
    } else {
      setPushPermission(Notification.permission);
    }
  };

  if (!settings || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const rows = [
    { key: 'notify_on_connection', label: 'Connection requests' },
    { key: 'notify_on_message', label: 'New messages' },
    { key: 'notify_on_rsvp', label: 'Event RSVPs' },
    { key: 'notify_on_alert', label: 'Alerts in your area' },
    { key: 'show_location', label: 'Share approximate location on posts' },
    { key: 'analytics_enabled', label: 'Anonymous usage analytics', desc: 'Help improve the app (no personal data collected)' },
  ];

  const links = [
    { to: PRIVACY_POLICY_URL, icon: FileText, label: 'Privacy Policy', desc: 'Data collection, location, uploads, and deletion' },
    { to: SUPPORT_URL, icon: Mail, label: 'Contact / Support', desc: SUPPORT_EMAIL },
    { to: '/review-readiness', icon: Database, label: 'Data Safety Summary', desc: 'Store review disclosure checklist' },
    { to: ACCOUNT_DELETION_URL, icon: Trash2, label: 'Delete Account', desc: 'Permanently delete Ride Radar app data', danger: true },
  ];

  return (
    <div className="px-5 pt-5">
      <Link to="/profile" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Profile</Link>
      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden"><div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" /><div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" /><div className="relative z-10"><div className="rr-chip mb-3"><ShieldCheck className="h-3.5 w-3.5" /> Safety hub</div><h1 className="rr-heading text-4xl">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Privacy, safety, notifications, and account controls.</p></div></div>

      <div className="space-y-1 rr-surface rounded-[1.45rem] p-3 mb-5 overflow-hidden">
        {rows.map((r, i) => <div key={r.key} className={cn('flex items-center justify-between gap-4 px-4 py-4', i !== rows.length - 1 && 'border-b border-border/40')}><div className="flex-1"><span className="text-sm font-medium leading-snug">{r.label}</span>{r.desc && <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>}</div><Switch checked={!!settings[r.key]} onCheckedChange={(v) => save.mutate({ [r.key]: v })} /></div>)}
        <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-border/40 bg-primary/5 -mx-3 -mb-3 rounded-b-2xl mt-2"><span className="text-sm font-medium text-primary">Public profile preview</span><Switch checked={profile.is_public !== false} onCheckedChange={(v) => togglePublic.mutate(v)} /></div>
      </div>

      <div className="mb-5 rounded-[1.45rem] border border-border/70 bg-black/30 p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Privacy disclosure</div><p className="text-sm text-muted-foreground">Location posts use approximate, fuzzed, frozen location when enabled. Uploaded images are used for your profile, bike, events, and alerts. Public profile visibility controls what other riders can see.</p></div>

      {/* PWA Install Section */}
      {(isInstallable || isInstalled || pushPermission !== 'granted') && (
        <div className="mb-5 rr-surface rounded-[1.45rem] p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">App Features</div>
          <div className="space-y-2">
            {isInstallable && (
              <Button
                onClick={handleInstallApp}
                className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
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
            {pushPermission !== 'granted' && typeof Notification !== 'undefined' && (
              <Button
                onClick={handleEnablePush}
                variant="outline"
                className="w-full h-12 rounded-2xl"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Push Notifications
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 rr-surface rounded-[1.45rem] p-3 mb-5">
        {links.map((item) => item.to.startsWith('http') ? (
          <a key={item.label} href={item.to} className="flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 hover:border-primary/35"><item.icon className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')} /><div className="flex-1"><div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div><ExternalLink className="h-4 w-4 text-muted-foreground" /></a>
        ) : (
          <Link key={item.label} to={item.to} className="flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 hover:border-primary/35"><item.icon className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')} /><div className="flex-1"><div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link>
        ))}
      </div>

      <Button variant="outline" onClick={() => signOut()} className="w-full rounded-2xl h-12 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors"><LogOut className="w-4 h-4 mr-2" /> Log out securely</Button>
    </div>
  );
}