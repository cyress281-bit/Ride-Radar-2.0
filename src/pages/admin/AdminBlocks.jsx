import { useMemo } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import AdminLayout from '@/components/admin/AdminLayout';
import { timeAgo } from '@/lib/broadcastUtils';

/**
 * AdminBlocks - View block relationships between riders.
 *
 * Purpose: Support and dispute resolution; lets admins see who blocked whom.
 *
 * Data fields (Supabase snake_case):
 * - blocker_profile_id, blocked_profile_id, reason, created_at
 */
export default function AdminBlocks() {
  const { blocks, profiles } = useAdminData();

  const blocksData = blocks.data || [];
  const profilesData = profiles.data || [];

  const profileById = useMemo(
    () => new Map(profilesData.map((p) => [p.id, p])),
    [profilesData]
  );

  const name = (id) => profileById.get(id)?.display_name || id || 'Unknown rider';

  return (
    <AdminLayout
      title="Blocks"
      description="Inspect rider block relationships for support and dispute review."
    >
      <div className="space-y-2">
        {blocksData.map((block) => (
          <div key={block.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-sm">
              <span className="font-bold">{name(block.blocker_profile_id)}</span>
              {' '}blocked{' '}
              <span className="font-bold">{name(block.blocked_profile_id)}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Created {timeAgo(block.created_at)} ·{' '}
              {block.created_at ? new Date(block.created_at).toLocaleString() : 'No timestamp'}
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
            No block records found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
