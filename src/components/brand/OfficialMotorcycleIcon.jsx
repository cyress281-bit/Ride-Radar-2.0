import { cn } from '@/lib/utils';

const MOTORCYCLE_ICON_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/63bd396e4_IMG_2818.jpg';

export default function OfficialMotorcycleIcon({ className, frame = false }) {
  return (
    <span className={cn(
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-black text-solo',
      frame && 'rounded-xl border border-solo/20 shadow-[0_0_10px_hsl(var(--solo)/0.1)]',
      className
    )}>
      <img
        src={MOTORCYCLE_ICON_URL}
        alt="Ride Radar motorcycle silhouette"
        className="h-full w-full object-contain drop-shadow-[0_0_3px_hsl(var(--solo)/0.42)]"
      />
    </span>
  );
}