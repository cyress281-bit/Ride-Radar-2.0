import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { BROADCAST_META, timeAgo } from '@/lib/broadcastUtils';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminBroadcasts() {
  const qc = useQueryClient();

  const { broadcasts } = useAdminData();
  const broadcastsData = broadcasts.data || [];

  const expire = useMutation({
    mutationFn: async (id) => await base44.entities.Broadcast.update(id, { status: 'expired' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });

  const remove = useMutation({
    mutationFn: async (id) => await base44.entities.Broadcast.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });

  return (
    <AdminLayout
      title="Broadcasts"
      description="Manage all broadcast posts and alerts"
    >

      <div className="space-y-2">
        {broadcastsData.map((b) => (
          <div key={b.id} className="p-3 rounded-xl bg-card border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{BROADCAST_META[b.type]?.label}</span>
              <span className="text-xs text-muted-foreground">· {b.status}</span>
              <span className="text-xs text-muted-foreground">· {timeAgo(b.created_date)}</span>
            </div>
            <div className="font-semibold text-sm mb-2">{b.title}</div>
            <div className="flex gap-2">
              {b.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => expire.mutate(b.id)} className="rounded-full">Expire</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)} className="rounded-full text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}