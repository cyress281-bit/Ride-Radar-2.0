import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Radio, Bell, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: broadcasts = [] } = useQuery({ queryKey: ['admin-broadcasts'], queryFn: () => base44.entities.Broadcast.list('-created_date', 500) });

  const activeBroadcasts = broadcasts.filter((b) => b.status === 'active').length;
  const alerts = broadcasts.filter((b) => b.type === 'alert' && b.status === 'active').length;

  const cards = [
    { to: '/admin/users', label: 'Users', value: users.length, icon: Users },
    { to: '/admin/broadcasts', label: 'Active broadcasts', value: activeBroadcasts, icon: Radio },
    { to: '/admin/broadcasts', label: 'Active alerts', value: alerts, icon: AlertTriangle },
    { to: '/admin/notifications', label: 'Announcements', value: '—', icon: Bell },
  ];

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Admin</h1>
      <p className="text-sm text-muted-foreground mb-6">Platform overview</p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition">
            <c.icon className="w-5 h-5 text-primary mb-3" />
            <div className="text-2xl font-display font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}