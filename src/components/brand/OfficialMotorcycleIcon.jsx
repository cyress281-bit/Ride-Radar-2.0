import { cn } from '@/lib/utils';

const MOTORCYCLE_ICON_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/63bd396e4_IMG_2818.jpg';

export default function OfficialMotorcycleIcon({ className, frame = false }) {
  return (
    <span
      role="img"
      aria-label="Ride Radar motorcycle silhouette"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center bg-current text-solo',
        frame && 'rounded-xl border border-solo/20 bg-solo/10 p-1',
        className
      )}
      style={{
        WebkitMaskImage: `url(${MOTORCYCLE_ICON_URL})`,
        maskImage: `url(${MOTORCYCLE_ICON_URL})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}