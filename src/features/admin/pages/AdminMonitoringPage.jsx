import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  MessageSquare,
  Radio,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodaysStats } from '@/features/admin/api/admin-api.js';
import { getPerformanceSummary } from '@/lib/performanceMonitoring.js';
import { supabase } from '@/lib/supabase.js';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role.js';
import { cn } from '@/lib/utils.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminMonitoringPage - Live system health dashboard.
 */
export default function AdminMonitoringPage() {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();

  if (roleLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mb-6 h-48 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
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

  return <MonitoringContent />;
}

function MonitoringContent() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: stats, refetch, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'todays-stats'],
    queryFn: getTodaysStats,
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 15000,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['admin', 'performance'],
    queryFn: getPerformanceSummary,
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 15000,
  });

  const { data: activeUsersData, isLoading: activeUsersLoading } = useQuery({
    queryKey: ['admin', 'active-users'],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', fiveMinAgo);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 15000,
  });

  const isLoading = statsLoading || perfLoading || activeUsersLoading;

  const statCards = [
    {
      label: 'Active Users',
      value: activeUsersData ?? 0,
      icon: Users,
      color: 'text-success',
      desc: 'Last 5 min',
    },
    {
      label: 'Broadcasts Today',
      value: stats?.data?.broadcasts || 0,
      icon: Radio,
      color: 'text-info',
    },
    {
      label: 'Messages Today',
      value: stats?.data?.messages || 0,
      icon: MessageSquare,
      color: 'text-primary',
    },
    {
      label: 'Connections Today',
      value: stats?.data?.connections || 0,
      icon: TrendingUp,
      color: 'text-cyan',
    },
    {
      label: 'Reports Today',
      value: stats?.data?.reports || 0,
      icon: AlertTriangle,
      color:
        (stats?.data?.reports || 0) > 0 ? 'text-warning' : 'text-muted-foreground',
    },
  ];

  const externalLinks = [
    {
      name: 'Sentry Dashboard',
      url: import.meta.env.VITE_SENTRY_DASHBOARD_URL || 'https://sentry.io',
      desc: 'Error tracking and performance monitoring',
      enabled: !!import.meta.env.VITE_SENTRY_DSN,
    },
    {
      name: 'Plausible Analytics',
      url:
        import.meta.env.VITE_PLAUSIBLE_DASHBOARD_URL ||
        `https://plausible.io/${import.meta.env.VITE_PLAUSIBLE_DOMAIN}`,
      desc: 'Privacy-focused analytics dashboard',
      enabled: !!import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    },
    {
      name: 'Supabase Dashboard',
      url: import.meta.env.VITE_SUPABASE_URL
        ? `https://supabase.com/dashboard/project/${
            new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]
          }`
        : '#',
      desc: 'Database, auth, and storage management',
      enabled: true,
    },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="mb-6 h-48 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh paused'}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh((v) => !v)}
            className="h-8 text-xs"
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-8 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <stat.icon className={cn('h-5 w-5', stat.color)} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <div className="text-xs font-semibold text-foreground/90">
              {stat.label}
            </div>
            {stat.desc && (
              <div className="text-[10px] text-muted-foreground">{stat.desc}</div>
            )}
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      {perfData && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber" />
            <h2 className="text-sm font-bold">Client Performance</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">DOM Loaded</span>
              <span className="font-mono">
                {perfData.domContentLoaded ?? 'N/A'}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Load Complete</span>
              <span className="font-mono">
                {perfData.loadComplete ?? 'N/A'}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Contentful Paint</span>
              <span className="font-mono">
                {perfData.firstContentfulPaint ?? 'N/A'}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Largest Contentful Paint</span>
              <span className="font-mono">
                {perfData.largestContentfulPaint ?? 'N/A'}ms
              </span>
            </div>
            {perfData.memory && (
              <>
                <div className="mt-2 border-t border-border/30 pt-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span className="font-mono">
                    {perfData.memory.usedMB}MB / {perfData.memory.limitMB}MB (
                    {perfData.memory.usagePercent}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* External Dashboards */}
      <div className="mb-6 space-y-2">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          External Dashboards
        </h2>
        {externalLinks
          .filter((link) => link.enabled)
          .map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/35"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{link.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {link.desc}
                </div>
              </div>
            </a>
          ))}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-bold">About this dashboard</div>
        Real-time metrics are pulled from Supabase every 30 seconds. Performance
        data is measured client-side using the Web Vitals API. External
        dashboards provide detailed analytics and error tracking.
      </div>
    </AdminLayout>
  );
}
