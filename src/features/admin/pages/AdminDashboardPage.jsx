import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Radio,
  ShieldAlert,
  TrendingUp,
  MessageCircle,
  UserX,
  Trash2,
  Bell,
  FileCheck,
  Activity,
  Database,
  CalendarDays,
} from 'lucide-react';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import {
  getTodaysStats,
  getUserCount,
  getActiveBroadcastCount,
  getPendingReportCount,
  getActiveConversationCount,
} from '@/features/admin/api/admin-api.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard.jsx';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminDashboardPage - Overview page with metric cards linking to sub-pages.
 */
export default function AdminDashboardPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminDashboardContent />
    </AdminPageShell>
  );
}

function AdminDashboardContent() {
  const navigate = useNavigate();
  const {
    users,
    broadcasts,
    reports,
    blocks,
    deletionRequests,
    conversations,
    isLoading: dataLoading,
  } = useAdminData();

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

  const { data: todaysStats } = useQuery({
    queryKey: ['admin', 'todays-stats'],
    queryFn: getTodaysStats,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  if (dataLoading) {
    return (
      <AdminLayout>
        <div className="mb-5 rounded-[28px] border border-white/[0.08] bg-black/60 p-5 shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
          <div className="mb-2 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            Live ops
          </div>
          <div className="h-8 w-56 rounded-full bg-white/[0.05]" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[20px]" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  const usersData = users.data?.data || [];
  const broadcastsData = broadcasts.data?.data || [];
  const reportsData = reports.data?.data || [];
  const blocksData = blocks.data?.data || [];
  const deletionsData = deletionRequests.data?.data || [];
  const conversationsData = conversations.data?.data || [];

  const cards = [
    {
      title: 'Total Users',
      value: userCountData?.data ?? usersData.length,
      icon: Users,
      onClick: () => navigate('/admin/users'),
    },
    {
      title: 'Active Broadcasts',
      value: activeBroadcastCountData?.data ?? broadcastsData.filter((b) => b.status === 'active').length,
      icon: Radio,
      onClick: () => navigate('/admin/broadcasts'),
    },
    {
      title: 'Events',
      value: broadcastsData.filter((b) => b.type === 'event').length || 'Manage',
      icon: CalendarDays,
      onClick: () => navigate('/admin/events'),
    },
    {
      title: 'Pending Reports',
      value: pendingReportCountData?.data ?? reportsData.filter((r) => r.status !== 'closed').length,
      icon: ShieldAlert,
      onClick: () => navigate('/admin/reports'),
    },
    {
      title: "Today's Connections",
      value: todaysStats?.data?.connections ?? '—',
      icon: TrendingUp,
      onClick: () => navigate('/admin/monitoring'),
    },
    {
      title: 'Active Conversations',
      value: activeConversationCountData?.data ?? conversationsData.filter((c) => c.status === 'active').length,
      icon: MessageCircle,
      onClick: () => navigate('/admin/monitoring'),
    },
    {
      title: 'User Blocks',
      value: blocksData.length,
      icon: UserX,
      onClick: () => navigate('/admin/blocks'),
    },
    {
      title: 'Deletion Requests',
      value: deletionsData.length,
      icon: Trash2,
      onClick: () => navigate('/admin/deletions'),
    },
    {
      title: 'Announcements',
      value: 'Send',
      icon: Bell,
      onClick: () => navigate('/admin/notifications'),
    },
    {
      title: 'Analytics',
      value: 'Ops',
      icon: Activity,
      onClick: () => navigate('/admin/analytics'),
    },
    {
      title: 'Compliance',
      value: 'Review',
      icon: FileCheck,
      onClick: () => navigate('/admin/compliance'),
    },
    {
      title: 'Monitoring',
      value: 'Live',
      icon: Database,
      onClick: () => navigate('/admin/monitoring'),
    },
  ];

  return (
    <AdminLayout>
      <div className="relative mb-5 overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/65 p-5 shadow-[0_20px_44px_rgba(0,0,0,0.34)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.9)]" />
            Live operations
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Admin Command Center
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Monitor rider activity, moderation, compliance, and platform health from a single operational view.
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Command tiles
        </p>
        <span className="text-[11px] font-medium text-muted-foreground">
          Tap a tile to open the live section
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <AdminMetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            onClick={card.onClick}
          />
        ))}
      </div>
    </AdminLayout>
  );
}
