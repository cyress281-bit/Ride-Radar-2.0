import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

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
      return await base44.entities.UserSettings.create({
        userId: user.id, notifyOnConnection: true, notifyOnMessage: true, notifyOnRSVP: true, notifyOnAlert: true, showLocation: true,
      });
    },
  });

  const save = useMutation({
    mutationFn: async (patch) => await base44.entities.UserSettings.update(settings.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const togglePublic = useMutation({
    mutationFn: async (v) => await base44.entities.UserProfile.update(profile.id, { isPublic: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myProfile'] }),
  });

  if (!settings || !profile) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const rows = [
    { key: 'notifyOnConnection', label: 'Connection requests' },
    { key: 'notifyOnMessage', label: 'New messages' },
    { key: 'notifyOnRSVP', label: 'Event RSVPs' },
    { key: 'notifyOnAlert', label: 'Alerts in your area' },
    { key: 'showLocation', label: 'Share approximate location on posts' },
  ];

  return (
    <div className="px-5 pt-5">
      <Link to="/profile" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Profile
      </Link>
      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="absolute left-5 right-5 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative z-10">
          <div className="rr-chip mb-3"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-green" /> Control panel</div>
          <h1 className="rr-heading text-4xl">Settings</h1>
        </div>
      </div>

      <div className="space-y-1 rr-surface rounded-[1.45rem] p-3 mb-5 overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.key} className={cn("flex items-center justify-between gap-4 px-4 py-4", i !== rows.length - 1 && "border-b border-border/40")}>
            <span className="text-sm font-medium leading-snug">{r.label}</span>
            <Switch checked={!!settings[r.key]} onCheckedChange={(v) => save.mutate({ [r.key]: v })} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-border/40 bg-primary/5 -mx-3 -mb-3 rounded-b-2xl mt-2">
          <span className="text-sm font-medium text-primary">Public profile preview</span>
          <Switch checked={profile.isPublic !== false} onCheckedChange={(v) => togglePublic.mutate(v)} />
        </div>
      </div>

      <Button variant="outline" onClick={() => logout(true)} className="w-full rounded-2xl h-12 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors">
        <LogOut className="w-4 h-4 mr-2" /> Log out securely
      </Button>
    </div>
  );
}