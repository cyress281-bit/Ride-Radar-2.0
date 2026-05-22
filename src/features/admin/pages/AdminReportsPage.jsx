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
import { toast } from 'sonner';

import { timeAgo } from '@/lib/broadcastUtils.js';
import { supabase } from '@/lib/supabase.js';
import { getStoragePathFromPublicUrl } from '@/lib/image-utils.js';
import { hardDeleteBroadcast } from '@/features/broadcast/api/broadcast-api.js';
import { deletePost } from '@/features/profile/api/posts-api.js';
import { deletePostComment } from '@/features/profile/api/comments-api.js';
import { updateProfile } from '@/features/profile/api/profile-api.js';
import { deleteMessage, archiveConversation } from '@/features/chat/api/chat-api.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
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
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminReportsContent />
    </AdminPageShell>
  );
}

function AdminReportsContent() {
  const qc = useQueryClient();
  const { reports, profiles, broadcasts, isLoading } = useAdminData();

  const reportsData = reports.data?.data || [];
  const profilesData = profiles.data?.data || [];
  const broadcastsData = broadcasts.data?.data || [];

  const repeatOffenderStatsByUserId = useMemo(() => {
    const summary = new Map();
    const recentWindowMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const report of reportsData) {
      const targetUserId = report.target_user_id || report.target_profile_id;
      if (!targetUserId) continue;

      const createdAtMs = report.created_at ? new Date(report.created_at).getTime() : 0;
      const current = summary.get(targetUserId) || {
        openReports: 0,
        totalReports: 0,
        recentReports: 0,
      };

      current.totalReports += 1;
      if (report.status === 'open' || report.status === 'reviewed') {
        current.openReports += 1;
      }
      if (createdAtMs && now - createdAtMs <= recentWindowMs) {
        current.recentReports += 1;
      }

      summary.set(targetUserId, current);
    }

    return summary;
  }, [reportsData]);

  const profileByUserId = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );
  const broadcastById = useMemo(
    () => new Map(broadcastsData.map((b) => [b.id, b])),
    [broadcastsData]
  );

  const formatTargetType = (value) => {
    switch (value) {
      case 'user':
        return 'User';
      case 'broadcast':
        return 'Broadcast';
      case 'message':
        return 'Message';
      case 'post':
        return 'Post';
      case 'post_comment':
        return 'Comment';
      case 'image':
        return 'Image';
      default:
        return value || 'Unknown';
    }
  };

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
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error('Status update failed', {
        description: error?.message || 'Please try again.',
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  const removeContent = useMutation({
    mutationFn: async (report) => {
      const targetType = report.target_type;
      const targetId = report.target_id;
      const targetContext = report.target_context || {};
      const imageKind = targetContext.image_kind;

      if (targetType === 'broadcast') {
        const { error } = await hardDeleteBroadcast(targetId);
        if (error) throw error;
      }
      if (targetType === 'post') {
        const { error } = await deletePost(targetId);
        if (error) throw error;
      }
      if (targetType === 'post_comment') {
        const { error } = await deletePostComment(targetId);
        if (error) throw error;
      }
      if (targetType === 'message') {
        const { error } = await deleteMessage(targetId);
        if (error) throw error;
      }
      if (targetType === 'conversation') {
        const { error } = await archiveConversation(targetId);
        if (error) throw error;
      }
      if (targetType === 'image') {
        const targetUserId = report.target_user_id || report.target_profile_id;
        const profile = targetUserId ? profileByUserId.get(targetUserId) : null;
        if (imageKind === 'post_image') {
          const postId = report.target_parent_id || targetId;
          const { error } = await deletePost(postId);
          if (error) throw error;
        } else if (imageKind === 'avatar') {
          if (!targetUserId) throw new Error('No target user for avatar report.');
          const imageUrl = targetContext.image_url || profile?.avatar_url || '';
          const imagePath = getStoragePathFromPublicUrl('uploads', imageUrl);
          if (!imagePath) throw new Error('Could not resolve avatar image path.');
          const { error: storageError } = await supabase.storage.from('uploads').remove([imagePath]);
          if (storageError) throw storageError;
          const { error } = await updateProfile(targetUserId, { avatar_url: null });
          if (error) throw error;
        } else if (imageKind === 'bike_photo') {
          if (!targetUserId) throw new Error('No target user for bike photo report.');
          const imageUrl = targetContext.image_url || profile?.bike_photo_url || '';
          const imagePath = getStoragePathFromPublicUrl('uploads', imageUrl);
          if (!imagePath) throw new Error('Could not resolve bike photo image path.');
          const { error: storageError } = await supabase.storage.from('uploads').remove([imagePath]);
          if (storageError) throw storageError;
          const { error } = await updateProfile(targetUserId, { bike_photo_url: null });
          if (error) throw error;
        } else {
          throw new Error('Unsupported image report target.');
        }
      }

      const actionNote = 'content removed/archived';
      const updatedDetails = `${report.details || ''}\nAdmin action taken: ${actionNote}`.trim();

      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved', details: updatedDetails })
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
                  status: 'resolved',
                  details: `${r.details || ''}\nAdmin action taken: ${actionNote}`.trim(),
                }
              : r
          ),
        };
      });
      return { previous, queryKey };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error('Content removal failed', {
        description: error?.message || 'Please try again.',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'conversations'] });
      qc.invalidateQueries({ queryKey: ['admin', 'profiles'] });
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
        .update({ status: 'resolved', details: updatedDetails })
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
                  status: 'resolved',
                  details: `${r.details || ''}\nAdmin action taken: profile made private`.trim(),
                }
              : r
          ),
        };
      });
      return { previous, queryKey };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error('Profile privacy change failed', {
        description: error?.message || 'Please try again.',
      });
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
    if (report.target_type === 'post') {
      return report.target_id;
    }
    if (report.target_type === 'post_comment') {
      return report.target_parent_id ? `${report.target_id} on post ${report.target_parent_id}` : report.target_id;
    }
    if (report.target_type === 'image') {
      const kind = report.target_context?.image_kind;
      const kindLabel = kind ? kind.replace(/_/g, ' ') : 'image';
      return `${kindLabel} ${profile?.display_name || report.target_user_id || report.target_id}`;
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
          {reportsData.filter((r) => r.status === 'open' || r.status === 'reviewed').length} open
        </span>
      </div>

      <div className="space-y-3">
        {reportsData.map((report) => {
          const reporter = profileByUserId.get(
            report.reporter_user_id || report.reporter_profile_id
          );
          const targetUserId = report.target_user_id || report.target_profile_id;
          const offenderStats = targetUserId ? repeatOffenderStatsByUserId.get(targetUserId) : null;
          const showRepeatContext =
            offenderStats &&
            (offenderStats.totalReports > 1 ||
              offenderStats.openReports > 1 ||
              offenderStats.recentReports > 1);

          return (
            <div
              key={report.id}
              className="rounded-[20px] border border-border bg-surface p-4 transition hover:bg-surface-elevated"
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
                {formatTargetType(report.target_type)} — {describeTarget(report)}
              </div>

              {report.target_context && Object.keys(report.target_context || {}).length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Context: {report.target_context.image_kind || report.target_context.post_id || 'provided'}
                </div>
              )}

              {showRepeatContext && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  {offenderStats.openReports > 0 && (
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-warning">
                      {offenderStats.openReports} open reports
                    </span>
                  )}
                  {offenderStats.totalReports > 0 && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {offenderStats.totalReports} total reports
                    </span>
                  )}
                  {offenderStats.recentReports > 0 && (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                      {offenderStats.recentReports} recent
                    </span>
                  )}
                  {offenderStats.totalReports >= 3 && (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                      Repeat reports
                    </span>
                  )}
                </div>
              )}

              {report.details && (
                <p className="mt-3 whitespace-pre-wrap rounded-[20px] bg-secondary/50 p-3 text-sm text-muted-foreground">
                  {report.details}
                </p>
              )}

              <div className="relative mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] rounded-full"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'reviewed',
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
                  className="min-h-[44px] rounded-full"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'dismissed',
                      note: `${report.details || ''}\nAdmin dismissed report.`.trim(),
                    })
                  }
                  disabled={setStatus.isPending}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Dismiss
                </Button>
                <Button
                  size="sm"
                  className="min-h-[44px] rounded-full"
                  onClick={() =>
                    setStatus.mutate({
                      id: report.id,
                      status: 'resolved',
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
                      className="min-h-[44px] rounded-full"
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
                      report.target_type === 'conversation' ||
                      report.target_type === 'post' ||
                      report.target_type === 'post_comment' ||
                      report.target_type === 'image') && (
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
          <div className="rounded-[20px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-primary" />
            No reports submitted.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
