import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminMetricCard from '@/components/admin/AdminMetricCard';
import { useAdminData } from '@/hooks/useAdminData';
import { Activity, Bell, Database, FileCheck, MessageCircle, Radio, ShieldAlert, Trash2, UserX, Users } from 'lucide-react';

export default function AdminDashboard() {
  const { users, broadcasts, reports, blocks, deletionRequests } = useAdminData();
  const { data: conversations = [] } = useQuery({ queryKey: ['admin-conversations'], queryFn: () => base44.entities.Conversation.list('-lastMessageAt', 1000), staleTime: 60000 });

  const usersData = users.data || [];
  const broadcastsData = broadcasts.data || [];
  const reportsData = reports.data || [];
  const blocksData = blocks.data || [];
  const deletionsData = deletionRequests.data || [];

  const cards = [
    { to: '/admin/analytics', label: 'Analytics / Audit', value: 'Ops', icon: Activity },
    { to: '/admin/users', label: 'Users', value: usersData.length, icon: Users },
    { to: '/admin/broadcasts', label: 'Active broadcasts', value: broadcastsData.filter((b) => b.status === 'active').length, icon: Radio },
    { to: '/admin/reports', label: 'Open reports', value: reportsData.filter((r) => r.status !== 'closed').length, icon: ShieldAlert },
    { to: '/admin/blocks', label: 'User blocks', value: blocksData.length, icon: UserX },
    { to: '/admin/deletions', label: 'Deletion requests', value: deletionsData.length, icon: Trash2 },
    { to: '/admin/notifications', label: 'Announcements', value: 'Send', icon: Bell },
    { to: '/admin/compliance', label: 'Compliance', value: 'Review', icon: FileCheck },
    { to: '/admin/analytics', label: 'Active conversations', value: conversations.filter((c) => c.status === 'active').length, icon: MessageCircle },
    { to: '/review-readiness', label: 'Data Safety Summary', value: 'Docs', icon: Database },
  ];

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