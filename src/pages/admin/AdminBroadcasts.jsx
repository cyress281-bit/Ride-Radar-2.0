import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { BROADCAST_META, timeAgo } from '@/lib/broadcastUtils';

export default function AdminBroadcasts() {
  const qc = useQueryClient();

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => base44.entities.Broadcast.list('-created_date', 500),
  });

  const expire = useMutation({
    mutationFn: async (id) => await base44.entities.Broadcast.update(id, { status: 'expired' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });

  const remove = useMutation({
    mutationFn: async (id) => await base44.entities.Broadcast.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-broadcasts'] }),
  });

  return (
    <div className="px-5 pt-5">
      <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-4">Broadcasts</h1>

      <div className="space-y-2">
        {broadcasts.map((b) => (
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
    </div>
  );
}