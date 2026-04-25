import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminMetricCard from '@/components/admin/AdminMetricCard';
import { Activity, Bell, Database, FileCheck, MessageCircle, Radio, ShieldAlert, Trash2, UserX, Users } from 'lucide-react';

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 1000) });
  const { data: broadcasts = [] } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: () => base44.entities.Broadcast.list('-created_date', 1000) });
  const { data: reports = [] } = useQuery({ queryKey: ['admin-reports'], queryFn: () => base44.entities.Report.list('-created_date', 500) });
  const { data: blocks = [] } = useQuery({ queryKey: ['admin-blocks'], queryFn: () => base44.entities.UserBlock.list('-created_date', 500) });
  const { data: deletions = [] } = useQuery({ queryKey: ['admin-deletion-requests'], queryFn: () => base44.entities.AccountDeletionRequest.list('-created_date', 500) });
  const { data: conversations = [] } = useQuery({ queryKey: ['admin-conversations'], queryFn: () => base44.entities.Conversation.list('-lastMessageAt', 1000) });

  const cards = [
    { to: '/admin/analytics', label: 'Analytics / Audit', value: 'Ops', icon: Activity },
    { to: '/admin/users', label: 'Users', value: users.length, icon: Users },
    { to: '/admin/broadcasts', label: 'Active broadcasts', value: broadcasts.filter((b) => b.status === 'active').length, icon: Radio },
    { to: '/admin/reports', label: 'Open reports', value: reports.filter((r) => r.status !== 'closed').length, icon: ShieldAlert },
    { to: '/admin/blocks', label: 'User blocks', value: blocks.length, icon: UserX },
    { to: '/admin/deletions', label: 'Deletion requests', value: deletions.length, icon: Trash2 },
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