import { Trash2 } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';

/**
 * AdminDeletionRequestsPage - Read-only view of account_deletion_requests.
 */
export default function AdminDeletionRequestsPage() {
  const { deletionRequests } = useAdminData();
  const requests = deletionRequests.data?.data || [];

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Deletion Requests</h2>
        <span className="text-xs text-muted-foreground">{requests.length} total</span>
      </div>

      <div className="space-y-2">
        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded-2xl border border-border/60 bg-card p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold uppercase tracking-wider text-primary">
                {request.status}
              </span>
              <span>Requested {timeAgo(request.created_at)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">User:</span>{' '}
              {request.email || request.user_id}
            </div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">Profile:</span>{' '}
              {request.profile_id || 'Not recorded'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Created:{' '}
              {request.created_at
                ? new Date(request.created_at).toLocaleString()
                : '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Completed:{' '}
              {request.completed_at
                ? new Date(request.completed_at).toLocaleString()
                : 'Not completed'}
            </div>
            {request.note && (
              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">
                {request.note}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Trash2 className="mx-auto mb-2 h-6 w-6 text-primary" />
            No deletion requests found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
