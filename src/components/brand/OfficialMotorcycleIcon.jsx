import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Memoized motorcycle silhouette icon rendered as inline SVG.
 * Uses currentColor so it inherits text-solo (or any parent color context).
 * Scales cleanly at all sizes — filter chips, form headers, selector cards.
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
        {/* Rear wheel */}
        <circle cx="5.5" cy="17" r="3" strokeWidth="1.7" />
        {/* Front wheel */}
        <circle cx="18.5" cy="17" r="2.5" strokeWidth="1.6" />
        {/* Swingarm — rear axle to frame junction */}
        <path d="M5.5 17 L8 14" strokeWidth="1.6" />
        {/* Horizontal engine/lower frame rail — the key motorcycle differentiator vs. bicycle diamond */}
        <path d="M8 14 L15.5 14" strokeWidth="1.6" />
        {/* Frame + tank hump outline — asymmetric peak creates classic motorcycle profile */}
        <path d="M8 14 L9 10.5 L12.5 8.5 L15.5 10.5 L15.5 14" strokeWidth="1.7" />
        {/* Front fork — angled forward to front axle */}
        <path d="M15.5 14 L17 10.5 L18.5 17" strokeWidth="1.6" />
        {/* Handlebars */}
        <path d="M17 10.5 L15 9" strokeWidth="1.5" />
        <path d="M17 10.5 L19.5 9" strokeWidth="1.5" />
      </svg>
    </span>
  );
});

export default OfficialMotorcycleIcon;
