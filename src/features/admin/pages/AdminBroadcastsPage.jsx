import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Trash2, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { BROADCAST_META } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import { expireBroadcast, deleteBroadcast } from '@/features/admin/api/admin-api.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * AdminBroadcastsPage - View and manage all broadcast posts.
 */
export default function AdminBroadcastsPage() {
  const qc = useQueryClient();
  const { broadcasts, profiles } = useAdminData();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const broadcastsData = broadcasts.data?.data || [];
  const profilesData = profiles.data?.data || [];

  const profileById = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );

  const expire = useMutation({
    mutationFn: expireBroadcast,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] }),
  });

  const remove = useMutation({
    mutationFn: deleteBroadcast,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] }),
  });

  const filtered = useMemo(() => {
    return broadcastsData.filter((b) => {
      const matchesType = typeFilter === 'all' || b.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSearch =
        !search ||
        (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.description || '').toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [broadcastsData, typeFilter, statusFilter, search]);

  const broadcastTypes = useMemo(
    () => ['all', ...new Set(broadcastsData.map((b) => b.type).filter(Boolean))],
    [broadcastsData]
  );
  const broadcastStatuses = useMemo(
    () => ['all', ...new Set(broadcastsData.map((b) => b.status).filter(Boolean))],
    [broadcastsData]
  );

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Broadcasts</h2>
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search broadcasts..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Type
          </div>
          {broadcastTypes.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition',
                typeFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              {type === 'all' ? 'All' : BROADCAST_META[type]?.label || type}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Status
          </div>
          {broadcastStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition capitalize',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((b) => {
          const author = profileById.get(b.user_id);
          return (
            <div
              key={b.id}
              className="rounded-xl border border-border/60 bg-card p-3"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {BROADCAST_META[b.type]?.label || b.type}
                </span>
                <span className="text-xs text-muted-foreground">· {b.status}</span>
                <span className="text-xs text-muted-foreground">
                  · {timeAgo(b.created_at)}
                </span>
              </div>
              <div className="mb-1 text-sm font-semibold">{b.title}</div>
              <div className="mb-2 text-xs text-muted-foreground">
                By {author?.display_name || author?.username || b.user_id || 'Unknown'}
              </div>
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
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Radio className="mx-auto mb-2 h-6 w-6 text-primary" />
            No broadcasts found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
