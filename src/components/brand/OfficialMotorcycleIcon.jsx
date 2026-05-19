import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Ride Now / solo_ride signal icon — EKG pulse line terminating in a radar ping node.
 * Matches the neon radar aesthetic; legible at h-3.5 w-3.5 filter chips through selector cards.
 * Uses currentColor so it inherits text-solo or any parent color context.
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
        aria-hidden="true"
      >
        {/* EKG pulse line: flat → P-wave → QRS spike → T-wave → baseline → ping node */}
        <path d="M1 12 L5 12 L7 9 L9 3 L11 21 L13 12 L15.5 9 L17 12 L20 12" strokeWidth="1.8" />
        {/* Radar ping node — outer ring */}
        <circle cx="22" cy="12" r="2" strokeWidth="1.3" />
        {/* Radar ping node — center fill */}
        <circle cx="22" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
});

export default OfficialMotorcycleIcon;
