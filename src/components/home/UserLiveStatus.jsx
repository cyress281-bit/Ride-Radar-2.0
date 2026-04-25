import { Radio } from 'lucide-react';

export default function UserLiveStatus({ broadcast }) {
  const isLive = !!broadcast;

  return (
    <div className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-black/35 px-2.5 py-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.045)]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/5 text-primary">
        <Radio className="h-3.5 w-3.5" />
      </span>
      <div className="text-center text-[11px] font-extrabold uppercase tracking-[0.13em] text-primary">
        {isLive ? 'Live On Radar' : 'Offline'}
      </div>
    </div>
  );
}