import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AdminBackLink from '@/components/admin/AdminBackLink';
import { timeAgo } from '@/lib/broadcastUtils';
import { CheckCircle2, Eye, ShieldAlert, Trash2, XCircle } from 'lucide-react';

export default function AdminReports() {
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery({ queryKey: ['admin-reports'], queryFn: () => base44.entities.Report.list('-created_date', 500) });
  const { data: profiles = [] } = useQuery({ queryKey: ['admin-profiles'], queryFn: () => base44.entities.UserProfile.list('-updated_date', 1000) });
  const { data: broadcasts = [] } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: () => base44.entities.Broadcast.list('-created_date', 1000) });

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const broadcastById = useMemo(() => new Map(broadcasts.map((b) => [b.id, b])), [broadcasts]);

  const setStatus = useMutation({
    mutationFn: ({ id, status, note }) => base44.entities.Report.update(id, { status, details: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const removeContent = useMutation({
    mutationFn: async (report) => {
      if (report.targetType === 'broadcast') await base44.entities.Broadcast.delete(report.targetId);
      if (report.targetType === 'message') await base44.entities.Message.delete(report.targetId);
      if (report.targetType === 'conversation') await base44.entities.Conversation.update(report.targetId, { status: 'archived' });
      if (report.targetType === 'user' && report.targetProfileId) await base44.entities.UserProfile.update(report.targetProfileId, { isPublic: false });
      await base44.entities.Report.update(report.id, { status: 'closed', details: `${report.details || ''}\nAdmin action taken: ${report.targetType === 'user' ? 'profile made private' : 'content removed/archived'}`.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
    },
  });

  const describeTarget = (report) => {
    const profile = profileById.get(report.targetProfileId || report.targetId);
    if (report.targetType === 'broadcast') return broadcastById.get(report.targetId)?.title || report.targetId;
    if (profile) return `${profile.displayName || 'Rider'} ${profile.username ? `@${profile.username}` : ''}`;
    return report.targetId;
  };

  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Reports</h1>
      <p className="mb-5 text-sm text-muted-foreground">Review user-submitted safety and content reports.</p>

      <div className="space-y-3">
        {reports.map((report) => {
          const reporter = profileById.get(report.reporterProfileId);
          return (
            <div key={report.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-1 font-bold uppercase tracking-wider text-primary">{report.reason}</span>
                <span>{report.status}</span>
                <span>· {timeAgo(report.created_date)}</span>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Reported by:</span> {reporter?.displayName || report.reporterProfileId || 'Unknown'}</div>
              <div className="mt-1 text-sm"><span className="text-muted-foreground">Target:</span> {report.targetType} · {describeTarget(report)}</div>
              {report.details && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">{report.details}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: report.id, status: 'reviewing', note: report.details })}><Eye className="h-3.5 w-3.5" /> Review</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: report.id, status: 'closed', note: `${report.details || ''}\nAdmin dismissed report.`.trim() })}><XCircle className="h-3.5 w-3.5" /> Dismiss</Button>
                <Button size="sm" onClick={() => setStatus.mutate({ id: report.id, status: 'closed', note: `${report.details || ''}\nAdmin marked report resolved.`.trim() })}><CheckCircle2 className="h-3.5 w-3.5" /> Resolved</Button>
                <Button size="sm" variant="destructive" onClick={() => removeContent.mutate(report)}><Trash2 className="h-3.5 w-3.5" /> Take action</Button>
                {report.targetProfileId && <Link to={`/profile/${report.targetProfileId}`} className="text-xs text-primary underline self-center">View rider</Link>}
              </div>
            </div>
          );
        })}
        {reports.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><ShieldAlert className="mx-auto mb-2 h-6 w-6 text-primary" />No reports submitted.</div>}
      </div>
    </div>
  );
}