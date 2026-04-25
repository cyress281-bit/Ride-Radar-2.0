import { Radio } from 'lucide-react';
import { timeUntilExpiry } from '@/lib/broadcastUtils';

export default function UserLiveStatus({ broadcast }) {
  if (!broadcast) return null;

  return (
    <div className="flex min-h-[64px] items-center justify-between gap-2 rounded-xl border border-primary/20 bg-black/35 px-2.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 text-primary">
          <Radio className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-primary">Signal Active</div>
          <div className="truncate text-[11px] text-muted-foreground">{broadcast.title}</div>
        </div>
      </div>
      <div className="hidden shrink-0 rounded-md border border-border/70 bg-black/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:block">
        {timeUntilExpiry(broadcast.expiresAt)}
      </div>
    </div>
  );
}