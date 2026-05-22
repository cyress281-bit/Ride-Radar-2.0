import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import { updateUserRole } from '@/features/admin/api/admin-api.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const USER_ROLES = ['user', 'admin'];

/**
 * AdminUsersPage - Manage user accounts and role assignments.
 */
export default function AdminUsersPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mb-4 h-10 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
            ))}
          </div>
        </AdminLayout>
      }
    >
      <AdminUsersContent />
    </AdminPageShell>
  );
}

function AdminUsersContent() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { users, profiles, isLoading } = useAdminData();

  const usersData = users.data?.data || [];
  const profilesData = profiles.data?.data || [];

  const profileById = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );

  const setRole = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err) => toast.error(err?.message || 'Failed to update user role'),
  });

  const filtered = useMemo(() => {
    return usersData.filter((u) => {
      const profile = profileById.get(u.id);
      const displayName = profile?.display_name || u.full_name || '';
      const email = u.email || '';
      const term = q.toLowerCase();
      return (
        !q ||
        displayName.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term)
      );
    });
  }, [usersData, profileById, q]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="mb-4 h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Users</h2>
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or display name..."
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => {
          const profile = profileById.get(u.id);
          const displayName = profile?.display_name || u.full_name || 'Unnamed';
          const initials =
            (displayName?.[0] || u.email?.[0] || '?').toUpperCase();

          return (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-[20px] border border-border bg-surface p-3 transition hover:bg-surface-elevated"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {u.email}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
              <div className="flex gap-1 rounded-full border border-border bg-secondary/50 p-1">
                {USER_ROLES.map((role) => (
                  <Button
                    key={role}
                    variant={u.role === role ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-9 min-h-[44px] rounded-full px-3 text-xs capitalize',
                      u.role === role && 'font-semibold'
                    )}
                    onClick={() => setRole.mutate({ id: u.id, role })}
                    disabled={setRole.isPending}
                  >
                    {role === 'admin' && (
                      <Shield className="mr-1 h-3 w-3" />
                    )}
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-[20px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
            {q ? 'No users match your search.' : 'No users found.'}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
