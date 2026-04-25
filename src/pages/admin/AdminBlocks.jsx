import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminBackLink from '@/components/admin/AdminBackLink';
import { timeAgo } from '@/lib/broadcastUtils';

export default function AdminBlocks() {
  const { data: blocks = [] } = useQuery({ queryKey: ['admin-blocks'], queryFn: () => base44.entities.UserBlock.list('-created_date', 500) });
  const { data: profiles = [] } = useQuery({ queryKey: ['admin-profiles'], queryFn: () => base44.entities.UserProfile.list('-updated_date', 1000) });
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const name = (id) => profileById.get(id)?.displayName || id || 'Unknown rider';

  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">Blocks</h1>
      <p className="mb-5 text-sm text-muted-foreground">Inspect rider block relationships for support and dispute review.</p>
      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-sm"><span className="font-bold">{name(block.blockerProfileId)}</span> blocked <span className="font-bold">{name(block.blockedProfileId)}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">Created {timeAgo(block.created_date)} · {block.created_date ? new Date(block.created_date).toLocaleString() : 'No timestamp'}</div>
            {block.reason && <div className="mt-2 rounded-xl bg-black/25 p-3 text-sm text-muted-foreground">{block.reason}</div>}
          </div>
        ))}
        {blocks.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No block records found.</div>}
      </div>
    </div>
  );
}