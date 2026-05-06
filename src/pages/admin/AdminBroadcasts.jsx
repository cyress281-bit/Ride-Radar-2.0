import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { BROADCAST_META, timeAgo } from '@/lib/broadcastUtils';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminData } from '@/hooks/useAdminData';

/**
 * AdminBroadcasts - View and manage all broadcast posts.
 *
 * Actions:
 * - Expire: sets broadcast status to 'expired'
 * - Delete: permanently removes the broadcast record
 *
 * Data fields (Supabase snake_case):
 * - id, type, title, status, created_at
 */
export default function AdminBroadcasts() {
  const qc = useQueryClient();
  const { broadcasts } = useAdminData();
  const broadcastsData = broadcasts.data || [];

  const expire = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('broadcasts')
        .update({ status: 'expired' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {BROADCAST_META[b.type]?.label || b.type}
              </span>
              <span className="text-xs text-muted-foreground">· {b.status}</span>
              <span className="text-xs text-muted-foreground">· {timeAgo(b.created_at)}</span>
            </div>
            <div className="font-semibold text-sm mb-2">{b.title}</div>
            <div className="flex gap-2">
              {b.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => expire.mutate(b.id)}
                  disabled={expire.isPending}
                  className="rounded-full"
                >
                  Expire
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove.mutate(b.id)}
                disabled={remove.isPending}
                className="rounded-full text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {broadcastsData.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No broadcasts found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
