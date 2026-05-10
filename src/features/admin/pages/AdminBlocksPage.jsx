import { useMemo } from 'react';
import { UserX } from 'lucide-react';
import { timeAgo } from '@/lib/broadcastUtils.js';
import { useAdminData } from '@/features/admin/hooks/use-admin-data.js';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';

/**
 * AdminBlocksPage - Read-only inspection of user_blocks for dispute resolution.
 */
export default function AdminBlocksPage() {
  const { blocks, profiles } = useAdminData();

  const blocksData = blocks.data?.data || [];
  const profilesData = profiles.data?.data || [];

  const profileByUserId = useMemo(
    () => new Map(profilesData.map((p) => [p.user_id || p.id, p])),
    [profilesData]
  );

  const name = (id) => profileByUserId.get(id)?.display_name || id || 'Unknown rider';

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Blocks</h2>
        <span className="text-xs text-muted-foreground">{blocksData.length} total</span>
      </div>

      <div className="space-y-2">
        {blocksData.map((block) => (
          <div
            key={block.id}
            className="rounded-2xl border border-border/60 bg-card p-4"
          >
            <div className="text-sm">
              <span className="font-bold">
                {name(block.blocker_user_id || block.blocker_profile_id)}
              </span>{' '}
              blocked{' '}
              <span className="font-bold">
                {name(block.blocked_user_id || block.blocked_profile_id)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Created {timeAgo(block.created_at)} ·{' '}
              {block.created_at
                ? new Date(block.created_at).toLocaleString()
                : 'No timestamp'}
            </div>
            {block.reason && (
              <div className="mt-2 rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">
                {block.reason}
              </div>
            )}
          </div>
        ))}
        {blocksData.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <UserX className="mx-auto mb-2 h-6 w-6 text-primary" />
            No block records found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
