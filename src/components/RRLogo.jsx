import { cn } from '@/lib/utils';

// Ride Radar brand mark — neon green radar/pulse logo
export default function RRLogo({ size = 'md', glow = true, className }) {
  const dims = { sm: 28, md: 36, lg: 52, xl: 72 };
  const d = dims[size] || dims.md;
  return (
    <svg
      width={d}
      height={d}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(glow && 'drop-shadow-[0_0_8px_hsl(142,100%,47%,0.7)]', className)}
    >
      {/* Outer radar rings */}
      <circle cx="20" cy="20" r="18" stroke="hsl(142,100%,47%)" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.35" />
      <circle cx="20" cy="20" r="12" stroke="hsl(142,100%,47%)" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
      {/* EKG / pulse path through center */}
      <path
        d="M4 20 L10 20 L12 14 L15 26 L18 18 L21 22 L23 20 L36 20"
        stroke="hsl(142,100%,47%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Center dot */}
      <circle cx="20" cy="20" r="2" fill="hsl(142,100%,47%)" />
    </svg>
  );
}