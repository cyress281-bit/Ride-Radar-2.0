import AdminMetricCard from '@/components/admin/AdminMetricCard';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Activity, Bell, Database, FileCheck, MessageCircle, Radio, ShieldAlert, Trash2, UserX, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';

/**
 * AdminDashboard - Overview page with metric cards linking to sub-pages.
 *
 * Data: Uses shared useAdminData hook (Supabase-backed).
 * Access: Requires admin role via useAdminRole guard.
 */
export default function AdminDashboard() {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const { users, broadcasts, reports, blocks, deletionRequests, conversations } = useAdminData();

  // Guard: redirect non-admins
  if (!roleLoading && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const usersData = users.data || [];
  const broadcastsData = broadcasts.data || [];
  const reportsData = reports.data || [];
  const blocksData = blocks.data || [];
  const deletionsData = deletionRequests.data || [];
  const conversationsData = conversations.data || [];

  const cards = [
    { to: '/admin/analytics', label: 'Analytics / Audit', value: 'Ops', icon: Activity },
    { to: '/admin/users', label: 'Users', value: usersData.length, icon: Users },
    { to: '/admin/broadcasts', label: 'Active broadcasts', value: broadcastsData.filter((b) => b.status === 'active').length, icon: Radio },
    { to: '/admin/reports', label: 'Open reports', value: reportsData.filter((r) => r.status !== 'closed').length, icon: ShieldAlert },
    { to: '/admin/blocks', label: 'User blocks', value: blocksData.length, icon: UserX },
    { to: '/admin/deletions', label: 'Deletion requests', value: deletionsData.length, icon: Trash2 },
    { to: '/admin/notifications', label: 'Announcements', value: 'Send', icon: Bell },
    { to: '/admin/compliance', label: 'Compliance', value: 'Review', icon: FileCheck },
    { to: '/admin/analytics', label: 'Active conversations', value: conversationsData.filter((c) => c.status === 'active').length, icon: MessageCircle },
    { to: '/review-readiness', label: 'Data Safety Summary', value: 'Docs', icon: Database },
  ];

  if (roleLoading) {
    return (
      <div className="px-5 pt-6 flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Moderation, compliance, operations, and platform management.</p>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => <AdminMetricCard key={`${card.label}-${card.to}`} {...card} />)}
      </div>
    </div>
  );
}
