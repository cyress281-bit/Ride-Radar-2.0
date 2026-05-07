import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminData } from '@/hooks/useAdminData';
import { timeAgo } from '@/lib/broadcastUtils';
import { CheckCircle2, Eye, ShieldAlert, Trash2, XCircle } from 'lucide-react';

/**
 * AdminReports - Review and moderate user-submitted safety/content reports.
 *
 * Actions:
 * - Review: sets status to 'reviewing'
 * - Dismiss: closes report with note
 * - Resolved: closes report as resolved
 * - Take action: removes/archives the reported content and closes report
 *
 * Data fields (Supabase snake_case):
 * - reporter_user_id, target_type, target_id, target_user_id
 * - reason, status, details, created_at
 */
export default function AdminReports() {
  const qc = useQueryClient();
  const { reports, profiles, broadcasts } = useAdminData();

  const reportsData = reports.data || [];
  const profilesData = profiles.data || [];
  const broadcastsData = broadcasts.data || [];

  const profileByUserId = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );
  const broadcastById = useMemo(
    () => new Map(broadcastsData.map((b) => [b.id, b])),
    [broadcastsData]
  );

  /** Update a report's status and append a note */
  const setStatus = useMutation({
    mutationFn: async ({ id, status, note }) => {
      const { error } = await supabase
        .from('reports')
        .update({ status, details: note })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  /** Take moderation action on reported content */
  const removeContent = useMutation({
    mutationFn: async (report) => {
      const targetType = report.target_type;
      const targetId = report.target_id;
      const targetUserId = report.target_user_id || report.target_profile_id;

      if (targetType === 'broadcast') {
        await supabase.from('broadcasts').delete().eq('id', targetId);
      }
      if (targetType === 'message') {
        await supabase.from('messages').delete().eq('id', targetId);
      }
      if (targetType === 'conversation') {
        await supabase.from('conversations').update({ status: 'archived' }).eq('id', targetId);
      }
      if (targetType === 'user' && targetUserId) {
        await supabase.from('user_profiles').update({ is_public: false }).eq('user_id', targetUserId);
      }

      const actionNote = targetType === 'user' ? 'profile made private' : 'content removed/archived';
      const updatedDetails = `${report.details || ''}\nAdmin action taken: ${actionNote}`.trim();

      const { error } = await supabase
        .from('reports')
        .update({ status: 'closed', details: updatedDetails })
        .eq('id', report.id);
      if (error) throw error;

      return { targetType, targetId, targetUserId };
    },
    onSuccess: (_data) => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-conversations'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['broadcasts'] });

      if (_data?.targetType === 'broadcast') {
        qc.invalidateQueries({ queryKey: ['broadcast', _data.targetId] });
      }
      if (_data?.targetType === 'user' && _data.targetUserId) {
        qc.invalidateQueries({ queryKey: ['profile', _data.targetUserId] });
      }
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

  return (
    <AdminLayout
      title="Reports"
      description="Review user-submitted safety and content reports"
    >
      <div className="space-y-3">
        {reportsData.map((report) => {
          const reporter = profileByUserId.get(report.reporter_user_id || report.reporter_profile_id);
          const targetUserId = report.target_user_id || report.target_profile_id;
          return (
            <div key={report.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-1 font-bold uppercase tracking-wider text-primary">
                  {report.reason}
                </span>
                <span>{report.status}</span>
                <span>- {timeAgo(report.created_at)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Reported by:</span>{' '}
                {reporter?.display_name || report.reporter_user_id || report.reporter_profile_id || 'Unknown'}
              </div>
              <div className="mt-1 text-sm">
                <span className="text-muted-foreground">Target:</span>{' '}
                {report.target_type} - {describeTarget(report)}
              </div>
              {report.details && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">
                  {report.details}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: report.id, status: 'reviewing', note: report.details })}
                >
                  <Eye className="h-3.5 w-3.5" /> Review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({
                    id: report.id,
                    status: 'closed',
                    note: `${report.details || ''}\nAdmin dismissed report.`.trim(),
                  })}
                >
                  <XCircle className="h-3.5 w-3.5" /> Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStatus.mutate({
                    id: report.id,
                    status: 'closed',
                    note: `${report.details || ''}\nAdmin marked report resolved.`.trim(),
                  })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeContent.mutate(report)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Take action
                </Button>
                {targetUserId && (
                  <Link
                    to={`/profile/${targetUserId}`}
                    className="text-xs text-primary underline self-center"
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
