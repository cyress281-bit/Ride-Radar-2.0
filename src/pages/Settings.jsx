import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, ExternalLink, ShieldCheck, Trash2, Mail, FileText, Database } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL } from '@/pages/PrivacyPolicy';

export default function Settings() {
  const { data: profile } = useMyProfile();
  const { data: user } = useCurrentUser();
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const list = await base44.entities.UserSettings.filter({ userId: user.id });
      if (list[0]) return list[0];
      return await base44.entities.UserSettings.create({ userId: user.id, notifyOnConnection: true, notifyOnMessage: true, notifyOnRSVP: true, notifyOnAlert: true, showLocation: true });
    },
  });

  const save = useMutation({ mutationFn: async (patch) => await base44.entities.UserSettings.update(settings.id, patch), onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }) });
  const togglePublic = useMutation({ mutationFn: async (v) => await base44.entities.UserProfile.update(profile.id, { isPublic: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ['myProfile'] }) });

  if (!settings || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const rows = [
    { key: 'notifyOnConnection', label: 'Connection requests' },
    { key: 'notifyOnMessage', label: 'New messages' },
    { key: 'notifyOnRSVP', label: 'Event RSVPs' },
    { key: 'notifyOnAlert', label: 'Alerts in your area' },
    { key: 'showLocation', label: 'Share approximate location on posts' },
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
        {rows.map((r, i) => <div key={r.key} className={cn('flex items-center justify-between gap-4 px-4 py-4', i !== rows.length - 1 && 'border-b border-border/40')}><span className="text-sm font-medium leading-snug">{r.label}</span><Switch checked={!!settings[r.key]} onCheckedChange={(v) => save.mutate({ [r.key]: v })} /></div>)}
        <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-border/40 bg-primary/5 -mx-3 -mb-3 rounded-b-2xl mt-2"><span className="text-sm font-medium text-primary">Public profile preview</span><Switch checked={profile.isPublic !== false} onCheckedChange={(v) => togglePublic.mutate(v)} /></div>
      </div>

      <div className="mb-5 rounded-[1.45rem] border border-border/70 bg-black/30 p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Privacy disclosure</div><p className="text-sm text-muted-foreground">Location posts use approximate, fuzzed, frozen location when enabled. Uploaded images are used for your profile, bike, events, and alerts. Public profile visibility controls what other riders can see.</p></div>

      <div className="space-y-2 rr-surface rounded-[1.45rem] p-3 mb-5">
        {links.map((item) => <Link key={item.label} to={item.to} className="flex items-center gap-3 rounded-xl border border-border/50 bg-black/25 p-3 hover:border-primary/35"><item.icon className={cn('h-5 w-5', item.danger ? 'text-destructive' : 'text-primary')} /><div className="flex-1"><div className={cn('text-sm font-bold', item.danger && 'text-destructive')}>{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div><ExternalLink className="h-4 w-4 text-muted-foreground" /></Link>)}
      </div>

      <Button variant="outline" onClick={() => logout(true)} className="w-full rounded-2xl h-12 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors"><LogOut className="w-4 h-4 mr-2" /> Log out securely</Button>
    </div>
  );
}