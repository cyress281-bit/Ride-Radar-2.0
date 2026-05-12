import { useMemo } from 'react';
import { cn } from '@/lib/utils.js';
import { Activity, Users, Radio, ShieldAlert, Trash2, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import {
  getUserCount,
  getActiveBroadcastCount,
  getPendingReportCount,
  getActiveConversationCount,
} from '@/features/admin/api/admin-api.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard.jsx';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminAnalyticsPage - Operational metrics, moderation log, and simple charts.
 */
export default function AdminAnalyticsPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <Skeleton className="mb-4 h-7 w-32" />
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
            ))}
          </div>
          <Skeleton className="mb-6 h-40 w-full rounded-[20px]" />
          <Skeleton className="mb-6 h-40 w-full rounded-[20px]" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminAnalyticsContent />
    </AdminPageShell>
  );
}

function AdminAnalyticsContent() {
  const { users, broadcasts, conversations, reports, deletionRequests, isLoading } = useAdminData();

  const { data: userCountData } = useQuery({
    queryKey: ['admin', 'user-count'],
    queryFn: getUserCount,
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const { data: activeBroadcastCountData } = useQuery({
    queryKey: ['admin', 'active-broadcast-count'],
    queryFn: getActiveBroadcastCount,
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const { data: pendingReportCountData } = useQuery({
    queryKey: ['admin', 'pending-report-count'],
    queryFn: getPendingReportCount,
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const { data: activeConversationCountData } = useQuery({
    queryKey: ['admin', 'active-conversation-count'],
    queryFn: getActiveConversationCount,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const usersData = users.data?.data || [];
  const broadcastsData = broadcasts.data?.data || [];
  const conversationsData = conversations.data?.data || [];
  const reportsData = reports.data?.data || [];
  const deletionsData = deletionRequests.data?.data || [];

  const recentModeration = reportsData.slice(0, 8);

  const metrics = [
    { title: 'Total Users', value: userCountData?.data ?? usersData.length, icon: Users },
    {
      title: 'Active Broadcasts',
      value: activeBroadcastCountData?.data ?? broadcastsData.filter((b) => b.status === 'active').length,
      icon: Radio,
    },
    {
      title: 'Active Conversations',
      value: activeConversationCountData?.data ?? conversationsData.filter((c) => c.status === 'active').length,
      icon: MessageCircle,
    },
    { title: 'Pending Reports', value: pendingReportCountData?.data ?? reportsData.filter((r) => r.status !== 'closed').length, icon: ShieldAlert },
    { title: 'Deletion Requests', value: deletionsData.length, icon: Trash2 },
  ];

  // Simple user growth chart by signup month
  const growthData = useMemo(() => {
    const buckets = {};
    usersData.forEach((u) => {
      const d = u.created_at ? new Date(u.created_at) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
    const max = Math.max(1, ...sorted.map(([, v]) => v));
    return { sorted, max };
  }, [usersData]);

  // Broadcast activity by type
  const broadcastActivity = useMemo(() => {
    const counts = {};
    broadcastsData.forEach((b) => {
      counts[b.type] = (counts[b.type] || 0) + 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [broadcastsData]);

  if (isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="mb-4 h-7 w-32" />
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mb-6 h-40 w-full" />
        <Skeleton className="mb-6 h-40 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold">Analytics</h2>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {metrics.map((m) => (
          <AdminMetricCard key={m.title} {...m} />
        ))}
      </div>

      {/* User Growth Chart */}
      <div className="mb-6 rounded-[20px] border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 text-primary" />
          User Growth (by month)
        </div>
        {growthData.sorted.length > 0 ? (
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {growthData.sorted.map(([week, count]) => (
              <div key={week} className="flex min-w-[2.5rem] flex-1 flex-col items-center gap-1">
                <div className="text-[10px] text-muted-foreground">{count}</div>
                <div
                  className="w-full rounded-t bg-primary/60"
                  style={{
                    height: `${Math.max(4, (count / growthData.max) * 120)}px`,
                  }}
                />
                <div className="text-[10px] text-muted-foreground">{week.slice(5)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No user growth data available.
          </div>
        )}
      </div>

      {/* Broadcast Activity */}
      <div className="mb-6 rounded-[20px] border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <Radio className="h-4 w-4 text-primary" />
          Broadcast Activity
        </div>
        {Object.keys(broadcastActivity.counts).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(broadcastActivity.counts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-20 text-xs capitalize text-muted-foreground">{type}</span>
                <div className="h-3 flex-1 rounded-full bg-foreground/5">
                  <div
                    className={cn(
                      'h-3 rounded-full',
                      type === 'alert' && 'bg-brand-honda/60',
                      type === 'solo' && 'bg-brand-kawasaki/60',
                      type === 'iso' && 'bg-brand-yamaha/60',
                      type === 'event' && 'bg-brand-ducati/60',
                      !['alert', 'solo', 'iso', 'event'].includes(type) && 'bg-primary/60'
                    )}
                    style={{
                      width: `${Math.max(2, (count / broadcastActivity.max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No broadcast activity data available.
          </div>
        )}
      </div>

      {/* Recent Moderation */}
      <div className="rounded-[20px] border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <Activity className="h-4 w-4 text-primary" />
          Recent Moderation Actions
        </div>
        <div className="space-y-2">
          {recentModeration.map((report) => (
            <div
              key={report.id}
              className="rounded-[20px] border border-border bg-secondary/50 p-3 text-sm transition hover:bg-surface-elevated"
            >
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
    </AdminLayout>
  );
}
