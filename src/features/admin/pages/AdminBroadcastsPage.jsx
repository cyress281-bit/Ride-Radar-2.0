import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Radio, Trash2, Search, Filter } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { BROADCAST_META } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import { expireBroadcast, deleteBroadcast } from '@/features/admin/api/admin-api.js';
import ScheduleOccurrenceDialog from '@/features/admin/components/ScheduleOccurrenceDialog.jsx';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminBroadcastsPage - View and manage all broadcast posts.
 */
export default function AdminBroadcastsPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mb-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminBroadcastsContent />
    </AdminPageShell>
  );
}

function AdminBroadcastsContent() {
  const qc = useQueryClient();
  const { broadcasts, profiles, isLoading } = useAdminData();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [schedulingBroadcast, setSchedulingBroadcast] = useState(null);

  const broadcastsData = broadcasts.data?.data || [];
  const profilesData = profiles.data?.data || [];

  const profileById = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );

  const expire = useMutation({
    mutationFn: expireBroadcast,
    onMutate: (id) => {
      const queryKey = ['admin', 'broadcasts'];
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((b) => (b.id === id ? { ...b, status: 'expired' } : b)) };
      });
      return { previous, queryKey };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] }),
  });

  const remove = useMutation({
    mutationFn: deleteBroadcast,
    onMutate: (id) => {
      const queryKey = ['admin', 'broadcasts'];
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((b) => b.id !== id) };
      });
      return { previous, queryKey };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] }),
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Type
          </div>
          <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
            {broadcastTypes.map((type) => (
              <ToggleGroupItem key={type} value={type} className="min-h-[44px] text-xs capitalize">
                {type === 'all' ? 'All' : BROADCAST_META[type]?.label || type}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Status
          </div>
          <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            {broadcastStatuses.map((status) => (
              <ToggleGroupItem key={status} value={status} className="min-h-[44px] text-xs capitalize">
                {status === 'all' ? 'All' : status}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((b) => {
          const author = profileById.get(b.user_id);
          return (
            <div
              key={b.id}
              className="rounded-[20px] border border-border bg-surface p-3 transition hover:bg-surface-elevated"
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
              <div className="flex flex-wrap gap-2">
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
                {b.type === 'event' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSchedulingBroadcast(b)}
                    className="rounded-full"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" /> Schedule next occurrence
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
          <div className="rounded-[20px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Radio className="mx-auto mb-2 h-6 w-6 text-primary" />
            No broadcasts found.
          </div>
        )}
      </div>

      <ScheduleOccurrenceDialog
        broadcast={schedulingBroadcast}
        open={schedulingBroadcast !== null}
        onOpenChange={(open) => { if (!open) setSchedulingBroadcast(null); }}
        onSuccess={() => {
          setSchedulingBroadcast(null);
          qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
        }}
      />
    </AdminLayout>
  );
}
