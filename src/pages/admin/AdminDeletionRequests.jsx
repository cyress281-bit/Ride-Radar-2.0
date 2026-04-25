import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminBackLink from '@/components/admin/AdminBackLink';
import { timeAgo } from '@/lib/broadcastUtils';

export default function AdminDeletionRequests() {
  const { data: requests = [] } = useQuery({ queryKey: ['admin-deletion-requests'], queryFn: () => base44.entities.AccountDeletionRequest.list('-created_date', 500) });

  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Deletion Requests</h1>
      <p className="mb-5 text-sm text-muted-foreground">Review account deletion request history and completion state.</p>
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold uppercase tracking-wider text-primary">{request.status}</span>
              <span>Requested {timeAgo(request.created_date)}</span>
            </div>
            <div className="text-sm"><span className="text-muted-foreground">User:</span> {request.email || request.userId}</div>
            <div className="mt-1 text-sm"><span className="text-muted-foreground">Profile:</span> {request.profileId || 'Not recorded'}</div>
            <div className="mt-1 text-xs text-muted-foreground">Created: {request.created_date ? new Date(request.created_date).toLocaleString() : '—'}</div>
            <div className="mt-1 text-xs text-muted-foreground">Completed: {request.completedAt ? new Date(request.completedAt).toLocaleString() : 'Not completed'}</div>
            {request.note && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">{request.note}</div>}
          </div>
        ))}
        {requests.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No deletion requests found.</div>}
      </div>
    </div>
  );
}