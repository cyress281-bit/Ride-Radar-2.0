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
} from 'lucide-react';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import { useAdminRole } from '@/features/auth/hooks/use-admin-role.js';
import { getTodaysStats } from '@/features/admin/api/admin-api.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard.jsx';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminDashboardPage - Overview page with metric cards linking to sub-pages.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const {
    users,
    broadcasts,
    reports,
    blocks,
    deletionRequests,
    conversations,
    isLoading: dataLoading,
  } = useAdminData();

  const { data: todaysStats } = useQuery({
    queryKey: ['admin', 'todays-stats'],
    queryFn: getTodaysStats,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  if (roleLoading || dataLoading) {
    return (
      <AdminLayout>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
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

  const usersData = users.data?.data || [];
  const broadcastsData = broadcasts.data?.data || [];
  const reportsData = reports.data?.data || [];
  const blocksData = blocks.data?.data || [];
  const deletionsData = deletionRequests.data?.data || [];
  const conversationsData = conversations.data?.data || [];

  const cards = [
    {
      title: 'Total Users',
      value: usersData.length,
      icon: Users,
      onClick: () => navigate('/admin/users'),
    },
    {
      title: 'Active Broadcasts',
      value: broadcastsData.filter((b) => b.status === 'active').length,
      icon: Radio,
      onClick: () => navigate('/admin/broadcasts'),
    },
    {
      title: 'Pending Reports',
      value: reportsData.filter((r) => r.status !== 'closed').length,
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
      value: conversationsData.filter((c) => c.status === 'active').length,
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
