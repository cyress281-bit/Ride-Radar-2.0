import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminBackLink from '@/components/admin/AdminBackLink';
import AdminMetricCard from '@/components/admin/AdminMetricCard';
import { Activity, MessageCircle, Radio, ShieldAlert, Trash2, Users } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';

export default function AdminAnalyticsAudit() {
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 1000) });
  const { data: broadcasts = [] } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: () => base44.entities.Broadcast.list('-created_date', 1000) });
  const { data: conversations = [] } = useQuery({ queryKey: ['admin-conversations'], queryFn: () => base44.entities.Conversation.list('-lastMessageAt', 1000) });
  const { data: reports = [] } = useQuery({ queryKey: ['admin-reports'], queryFn: () => base44.entities.Report.list('-created_date', 500) });
  const { data: deletions = [] } = useQuery({ queryKey: ['admin-deletion-requests'], queryFn: () => base44.entities.AccountDeletionRequest.list('-created_date', 500) });

  const recentModeration = reports.slice(0, 8);
  const metrics = [
    { label: 'Total users', value: users.length, icon: Users },
    { label: 'Active broadcasts', value: broadcasts.filter((b) => b.status === 'active').length, icon: Radio },
    { label: 'Active conversations', value: conversations.filter((c) => c.status === 'active').length, icon: MessageCircle },
    { label: 'Total reports', value: reports.length, icon: ShieldAlert },
    { label: 'Deletion requests', value: deletions.length, icon: Trash2 },
  ];

  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Analytics / Audit</h1>
      <p className="mb-5 text-sm text-muted-foreground">Lightweight operational dashboard for platform health and moderation activity.</p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {metrics.map((metric) => <AdminMetricCard key={metric.label} {...metric} />)}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2 font-bold"><Activity className="h-4 w-4 text-primary" /> Recent moderation actions</div>
        <div className="space-y-2">
          {recentModeration.map((report) => (
            <div key={report.id} className="rounded-xl border border-border/50 bg-black/20 p-3 text-sm">
              <div className="font-medium capitalize">{report.reason} report · {report.status}</div>
              <div className="text-xs text-muted-foreground">{report.targetType} · {timeAgo(report.created_date)}</div>
            </div>
          ))}
          {recentModeration.length === 0 && <div className="text-sm text-muted-foreground">No recent report activity.</div>}
        </div>
      </div>
    </div>
  );
}