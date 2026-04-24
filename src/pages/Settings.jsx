import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/useCurrentUser';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const list = await base44.entities.UserSettings.filter({ created_by: profile.created_by || '' });
      if (list[0]) return list[0];
      return await base44.entities.UserSettings.create({
        notifyOnConnection: true, notifyOnMessage: true, notifyOnRSVP: true, notifyOnAlert: true, showLocation: true,
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
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <div className="space-y-1 bg-card border border-border/60 rounded-2xl p-2 mb-5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between px-3 py-3">
            <span className="text-sm">{r.label}</span>
            <Switch checked={!!settings[r.key]} onCheckedChange={(v) => save.mutate({ [r.key]: v })} />
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-sm">Public profile preview</span>
          <Switch checked={profile.isPublic !== false} onCheckedChange={(v) => togglePublic.mutate(v)} />
        </div>
      </div>

      <Button variant="outline" onClick={() => base44.auth.logout('/')} className="w-full rounded-full">
        Log out
      </Button>
    </div>
  );
}