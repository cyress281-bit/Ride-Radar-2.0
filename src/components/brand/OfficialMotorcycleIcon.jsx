import { cn } from '@/lib/utils';

const MOTORCYCLE_ICON_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/63bd396e4_IMG_2818.jpg';

export default function OfficialMotorcycleIcon({ className, frame = false }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent text-solo',
        frame && 'rounded-xl border border-solo/20 bg-solo/8 p-1',
        className
      )}
    >
      <img
        src={MOTORCYCLE_ICON_URL}
        alt="Ride Radar motorcycle silhouette"
        className="h-[128%] w-[128%] object-contain mix-blend-screen brightness-150 contrast-150 saturate-150 opacity-95"
      />
    </span>
  );
}