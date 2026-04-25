import { Radio } from 'lucide-react';
import { timeUntilExpiry } from '@/lib/broadcastUtils';

export default function UserLiveStatus({ broadcast }) {
  if (!broadcast) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-black/35 px-3.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 text-primary">
          <Radio className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Signal Active</div>
          <div className="truncate text-xs text-muted-foreground">{broadcast.title}</div>
        </div>
      </div>
      <div className="shrink-0 rounded-md border border-border/70 bg-black/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {timeUntilExpiry(broadcast.expiresAt)}
      </div>
    </div>
  );
}