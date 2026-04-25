import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { USER_ROLES } from '@/lib/roles';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }) => await base44.entities.User.update(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const filtered = users.filter((u) =>
    !q || (u.full_name || '').toLowerCase().includes(q.toLowerCase()) || (u.email || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="px-5 pt-5">
      <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-4">Users</h1>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="p-3 rounded-xl bg-card border border-border/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
              {u.full_name?.[0] || u.email?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{u.full_name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            </div>
            <div className="flex gap-1 rounded-full border border-border/60 bg-black/25 p-1">
              {USER_ROLES.map((role) => (
                <Button
                  key={role}
                  variant={u.role === role ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 rounded-full px-3 capitalize"
                  onClick={() => setRole.mutate({ id: u.id, role })}
                  disabled={setRole.isPending}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}