import { useAdminData } from '@/hooks/useAdminData';
import AdminBackLink from '@/components/admin/AdminBackLink';
import AdminMetricCard from '@/components/admin/AdminMetricCard';
import { Activity, MessageCircle, Radio, ShieldAlert, Trash2, Users } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils';

/**
 * AdminAnalyticsAudit - Lightweight operational dashboard for platform health.
 *
 * Shows:
 * - High-level metrics (users, broadcasts, conversations, reports, deletions)
 * - Recent moderation activity log
 *
 * Uses shared useAdminData hook to avoid duplicate queries across admin pages.
 */
export default function AdminAnalyticsAudit() {
  const { users, broadcasts, conversations, reports, deletionRequests } = useAdminData();

  const usersData = users.data || [];
  const broadcastsData = broadcasts.data || [];
  const conversationsData = conversations.data || [];
  const reportsData = reports.data || [];
  const deletionsData = deletionRequests.data || [];

  const recentModeration = reportsData.slice(0, 8);

  const metrics = [
    { label: 'Total users', value: usersData.length, icon: Users },
    { label: 'Active broadcasts', value: broadcastsData.filter((b) => b.status === 'active').length, icon: Radio },
    { label: 'Active conversations', value: conversationsData.filter((c) => c.status === 'active').length, icon: MessageCircle },
    { label: 'Total reports', value: reportsData.length, icon: ShieldAlert },
    { label: 'Deletion requests', value: deletionsData.length, icon: Trash2 },
  ];

  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Analytics / Audit</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Lightweight operational dashboard for platform health and moderation activity.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {metrics.map((metric) => <AdminMetricCard key={metric.label} {...metric} />)}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <Activity className="h-4 w-4 text-primary" /> Recent moderation actions
        </div>
        <div className="space-y-2">
          {recentModeration.map((report) => (
            <div key={report.id} className="rounded-xl border border-border/50 bg-black/20 p-3 text-sm">
              <div className="font-medium capitalize">
                {report.reason} report · {report.status}
              </div>
              <div className="text-xs text-muted-foreground">
                {report.target_type} · {timeAgo(report.created_at)}
              </div>
            </div>
          ))}
          {recentModeration.length === 0 && (
            <div className="text-sm text-muted-foreground">No recent report activity.</div>
          )}
        </div>
      </div>
    </div>
  );
}
