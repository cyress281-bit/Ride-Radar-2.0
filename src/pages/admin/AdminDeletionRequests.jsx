import { useAdminData } from '@/hooks/useAdminData';
import AdminLayout from '@/components/admin/AdminLayout';
import { timeAgo } from '@/lib/broadcastUtils';

/**
 * AdminDeletionRequests - View account deletion request history.
 *
 * Purpose: Compliance monitoring; shows pending and completed deletion requests.
 *
 * Data fields (Supabase snake_case):
 * - id, user_id, email, profile_id, status, note, created_at, completed_at
 */
export default function AdminDeletionRequests() {
  const { deletionRequests } = useAdminData();
  const requests = deletionRequests.data || [];

  return (
    <AdminLayout
      title="Deletion Requests"
      description="Review account deletion request history and completion state."
    >
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-border/60 bg-card p-4">
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
              Created: {request.created_at ? new Date(request.created_at).toLocaleString() : '—'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Completed: {request.completed_at ? new Date(request.completed_at).toLocaleString() : 'Not completed'}
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
            No deletion requests found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
