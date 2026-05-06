import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  MessageSquare,
  Radio,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Clock,
  Users,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPerformanceSummary } from '@/lib/performanceMonitoring';
import { useState, useEffect } from 'react';

export default function AdminMonitoring() {
  const { profile } = useSupabaseAuth();
  const [perfData, setPerfData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check admin permission
  if (!profile?.is_admin) {
    return <Navigate to="/home" replace />;
  }

  // Get performance metrics
  useEffect(() => {
    const updatePerf = () => {
      setPerfData(getPerformanceSummary());
    };

    updatePerf();
    const interval = autoRefresh ? setInterval(updatePerf, 5000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Real-time stats from Supabase
  const { data: stats, refetch } = useQuery({
    queryKey: ['admin-monitoring-stats'],
    queryFn: async () => {
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Active users (last 5 min)
      const { count: activeUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', fiveMinAgo.toISOString());

      // Broadcasts created today
      const { count: broadcastsToday } = await supabase
        .from('broadcasts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Messages sent today
      const { count: messagesToday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Reports filed today
      const { count: reportsToday } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Recent errors (from error_logs table if it exists)
      let recentErrors = 0;
      try {
        const { count } = await supabase
          .from('error_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fiveMinAgo.toISOString());
        recentErrors = count || 0;
      } catch {
        // error_logs table doesn't exist, that's fine
      }

      // Connection requests today
      const { count: connectionsToday } = await supabase
        .from('connection_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      return {
        activeUsers: activeUsers || 0,
        broadcastsToday: broadcastsToday || 0,
        messagesToday: messagesToday || 0,
        reportsToday: reportsToday || 0,
        recentErrors,
        connectionsToday: connectionsToday || 0,
      };
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30s if enabled
  });

  const statCards = [
    {
      label: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: Users,
      color: 'text-green-500',
      desc: 'Last 5 minutes',
    },
    {
      label: 'Broadcasts',
      value: stats?.broadcastsToday || 0,
      icon: Radio,
      color: 'text-blue-500',
      desc: 'Created today',
    },
    {
      label: 'Messages',
      value: stats?.messagesToday || 0,
      icon: MessageSquare,
      color: 'text-purple-500',
      desc: 'Sent today',
    },
    {
      label: 'Connections',
      value: stats?.connectionsToday || 0,
      icon: TrendingUp,
      color: 'text-cyan-500',
      desc: 'Requests today',
    },
    {
      label: 'Reports',
      value: stats?.reportsToday || 0,
      icon: AlertTriangle,
      color: stats?.reportsToday > 0 ? 'text-orange-500' : 'text-muted-foreground',
      desc: 'Filed today',
    },
    {
      label: 'Recent Errors',
      value: stats?.recentErrors || 0,
      icon: AlertTriangle,
      color: stats?.recentErrors > 0 ? 'text-red-500' : 'text-muted-foreground',
      desc: 'Last 5 minutes',
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
      url: import.meta.env.VITE_PLAUSIBLE_DASHBOARD_URL || `https://plausible.io/${import.meta.env.VITE_PLAUSIBLE_DOMAIN}`,
      desc: 'Privacy-focused analytics dashboard',
      enabled: !!import.meta.env.VITE_PLAUSIBLE_DOMAIN,
    },
    {
      name: 'Supabase Dashboard',
      url: import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co/project/_/settings') || '#',
      desc: 'Database, auth, and storage management',
      enabled: true,
    },
  ];

  return (
    <div className="px-5 pt-5 pb-24">
      <Link
        to="/admin"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Admin Dashboard
      </Link>

      <div className="mb-4 rr-surface-strong rounded-[1.45rem] p-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full border border-primary/15" />
        <div className="relative z-10">
          <div className="rr-chip mb-3">
            <Activity className="h-3.5 w-3.5" /> Real-time monitoring
          </div>
          <h1 className="rr-heading text-4xl">System Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live metrics, performance data, and external dashboards
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
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
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rr-surface rounded-2xl p-4 border border-border/50"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <div className="text-xs font-semibold text-foreground/90 mb-0.5">
              {stat.label}
            </div>
            <div className="text-xs text-muted-foreground">{stat.desc}</div>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      {perfData && (
        <div className="rr-surface rounded-2xl p-4 mb-5 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-bold">Client Performance</h2>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">DOM Loaded</span>
              <span className="font-mono">{perfData.domContentLoaded || 'N/A'}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Load Complete</span>
              <span className="font-mono">{perfData.loadComplete || 'N/A'}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Contentful Paint</span>
              <span className="font-mono">{perfData.firstContentfulPaint || 'N/A'}ms</span>
            </div>
            {perfData.memory && (
              <>
                <div className="border-t border-border/30 pt-2 mt-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span className="font-mono">
                    {perfData.memory.usedMB}MB / {perfData.memory.limitMB}MB ({perfData.memory.usagePercent}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* External Dashboards */}
      <div className="space-y-2 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
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
              className="flex items-center gap-3 rr-surface rounded-xl p-4 border border-border/50 hover:border-primary/35 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{link.name}</div>
                <div className="text-xs text-muted-foreground truncate">{link.desc}</div>
              </div>
            </a>
          ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-black/30 p-4 text-xs text-muted-foreground">
        <div className="font-bold mb-1">About this dashboard</div>
        Real-time metrics are pulled from Supabase every 30 seconds. Performance data is measured
        client-side using the Web Vitals API. External dashboards provide detailed analytics and
        error tracking.
      </div>
    </div>
  );
}
