import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  ShieldAlert,
  Trash2,
  XCircle,
  UserX,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase.js';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminReportsPage - Review and moderate user-submitted safety/content reports.
 */
export default function AdminReportsPage() {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  if (roleLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }
  if (!isAdmin) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Admin access required.
      </div>
    );
  }
  return <AdminReportsContent />;
}

function AdminReportsContent() {
  const qc = useQueryClient();
  const { reports, profiles, broadcasts, isLoading } = useAdminData();

  const reportsData = reports.data?.data || [];
  const profilesData = profiles.data?.data || [];
  const broadcastsData = broadcasts.data?.data || [];

  const profileByUserId = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );
  const broadcastById = useMemo(
    () => new Map(broadcastsData.map((b) => [b.id, b])),
    [broadcastsData]
  );

  const setStatus = useMutation({
    mutationFn: async ({ id, status, note }) => {
      const { error } = await supabase
        .from('reports')
        .update({ status, details: note })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: ({ id, status }) => {
      const queryKey = ['admin', 'reports'];
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.map((r) => (r.id === id ? { ...r, status } : r)) };
      });
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  const removeContent = useMutation({
    mutationFn: async (report) => {
      const targetType = report.target_type;
      const targetId = report.target_id;

      if (targetType === 'broadcast') {
        const { error } = await supabase.from('broadcasts').delete().eq('id', targetId);
        if (error) throw error;
      }
      if (targetType === 'message') {
        const { error } = await supabase.from('messages').delete().eq('id', targetId);
        if (error) throw error;
      }
      if (targetType === 'conversation') {
        const { error } = await supabase
          .from('conversations')
          .update({ status: 'archived' })
          .eq('id', targetId);
        if (error) throw error;
      }

      const actionNote = 'content removed/archived';
      const updatedDetails = `${report.details || ''}\nAdmin action taken: ${actionNote}`.trim();

      const { error } = await supabase
        .from('reports')
        .update({ status: 'closed', details: updatedDetails })
        .eq('id', report.id);
      if (error) throw error;

      return { targetType, targetId };
    },
    onMutate: (report) => {
      const queryKey = ['admin', 'reports'];
      const previous = qc.getQueryData(queryKey);
      const actionNote = 'content removed/archived';
      qc.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r) =>
            r.id === report.id
              ? {
                  ...r,
                  status: 'closed',
                  details: `${r.details || ''}\nAdmin action taken: ${actionNote}`.trim(),
                }
              : r
          ),
        };
      });
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'conversations'] });
    },
  });

  const makeProfilePrivate = useMutation({
    mutationFn: async (report) => {
      const targetUserId = report.target_user_id || report.target_profile_id;
      if (!targetUserId) throw new Error('No target user');

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_public: false })
        .eq('user_id', targetUserId);
      if (error) throw error;

      const updatedDetails = `${report.details || ''}\nAdmin action taken: profile made private`.trim();
      await supabase
        .from('reports')
        .update({ status: 'closed', details: updatedDetails })
        .eq('id', report.id);
    },
    onMutate: (report) => {
      const queryKey = ['admin', 'reports'];
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((r) =>
            r.id === report.id
              ? {
                  ...r,
                  status: 'closed',
                  details: `${r.details || ''}\nAdmin action taken: profile made private`.trim(),
                }
              : r
          ),
        };
      });
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    },
  });

  const describeTarget = (report) => {
    const targetUserId = report.target_user_id || report.target_profile_id;
    const profile = profileByUserId.get(targetUserId);
    if (report.target_type === 'broadcast') {
      return broadcastById.get(report.target_id)?.title || report.target_id;
    }
    if (profile) {
      return `${profile.display_name || 'Rider'} ${profile.username ? `@${profile.username}` : ''}`;
    }
    return report.target_id;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Reports</h2>
        <span className="text-xs text-muted-foreground">
          {reportsData.filter((r) => r.status !== 'closed').length} open
        </span>
      </div>

      <div className="space-y-3">
        {reportsData.map((report) => {
          const reporter = profileByUserId.get(
            report.reporter_user_id || report.reporter_profile_id
          );
          const targetUserId = report.target_user_id || report.target_profile_id;

          return (
            <div
              key={report.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-1 font-bold uppercase tracking-wider text-primary">
                  {report.reason}
                </span>
                <span className="capitalize">{report.status}</span>
                <span>· {timeAgo(report.created_at)}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Reporter:</span>{' '}
                {reporter?.display_name ||
                  report.reporter_user_id ||
                  report.reporter_profile_id ||
                  'Unknown'}
              </div>
              <div className="mt-1 text-sm">
                <span className="text-muted-foreground">Target:</span>{' '}
                {report.target_type} — {describeTarget(report)}
              </div>

              {report.details && (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-secondary/50 p-3 text-sm text-muted-foreground">
                  {report.details}
                </p>
              )}

              <div className="relative mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'reviewing',
                      note: report.details,
                    })
                  }
                  disabled={setStatus.isPending}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" /> Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'closed',
                      note: `${report.details || ''}\nAdmin dismissed report.`.trim(),
                    })
                  }
                  disabled={setStatus.isPending}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'closed',
                      note: `${report.details || ''}\nAdmin marked report resolved.`.trim(),
                    })
                  }
                  disabled={setStatus.isPending}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolved
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={removeContent.isPending || makeProfilePrivate.isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Take Action
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {(report.target_type === 'broadcast' ||
                      report.target_type === 'message' ||
                      report.target_type === 'conversation') && (
                      <DropdownMenuItem
                        onClick={() => removeContent.mutate(report)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        Delete content
                      </DropdownMenuItem>
                    )}
                    {targetUserId && (
                      <DropdownMenuItem
                        onClick={() => makeProfilePrivate.mutate(report)}
                        className="gap-2"
                      >
                        <UserX className="h-4 w-4 text-warning" />
                        Make profile private
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {targetUserId && (
                  <Link
                    to={`/profile/${targetUserId}`}
                    className="self-center text-xs text-primary underline"
                  >
                    View rider
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {reportsData.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-primary" />
            No reports submitted.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
