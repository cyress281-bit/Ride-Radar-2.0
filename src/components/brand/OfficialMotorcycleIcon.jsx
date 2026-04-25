import { cn } from '@/lib/utils';

const MOTORCYCLE_ICON_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/63bd396e4_IMG_2818.jpg';

export default function OfficialMotorcycleIcon({ className, frame = false }) {
  return (
    <span className={cn(
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent text-solo',
      frame && 'rounded-xl border border-solo/18 bg-solo/5 shadow-[0_8px_22px_rgba(0,0,0,0.28)]',
      className
    )}>
      <img
        src={MOTORCYCLE_ICON_URL}
        alt="Ride Radar motorcycle silhouette"
        className="h-full w-full object-contain mix-blend-screen brightness-125 contrast-125 saturate-150 drop-shadow-[0_0_2px_hsl(var(--solo)/0.3)]"
      />
    </span>
  );
}