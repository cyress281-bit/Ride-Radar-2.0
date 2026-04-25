import { Radio } from 'lucide-react';
import { timeUntilExpiry } from '@/lib/broadcastUtils';

export default function UserLiveStatus({ broadcast }) {
  if (!broadcast) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/35 bg-primary/10 px-3.5 py-2.5 shadow-[0_0_24px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(0_0%_100%/0.05)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-black/35 text-primary">
          <span className="absolute h-2 w-2 rounded-full bg-primary animate-pulse" />
          <Radio className="h-4 w-4 opacity-60" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">● Signal Active</div>
          <div className="truncate text-xs text-muted-foreground">{broadcast.title}</div>
        </div>
      </div>
      <div className="shrink-0 rounded-full border border-primary/25 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        {timeUntilExpiry(broadcast.expiresAt)}
      </div>
    </div>
  );
}