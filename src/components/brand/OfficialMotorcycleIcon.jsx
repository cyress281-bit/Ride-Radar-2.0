import { memo } from 'react';
import { cn } from '@/lib/utils';

const MOTORCYCLE_ICON_URL = '/motorcycle-icon.svg';

/**
 * Memoized motorcycle icon - rendered multiple times per BroadcastCard
 * (main icon + badge overlay) and in SignalIcon. Props are static strings/booleans,
 * so memo prevents re-renders during feed scrolling and filter changes.
 */
const OfficialMotorcycleIcon = memo(function OfficialMotorcycleIcon({ className, frame = false }) {
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
        loading="lazy"
        decoding="async"
        width="32"
        height="32"
      />
    </span>
  );
});

export default OfficialMotorcycleIcon;
