import { cn } from '@/lib/utils';

// Ride Radar brand mark — neon green radar/pulse logo
export default function RRLogo({ size = 'md', glow = true, className }) {
  // Adjusted sizes for the wide image
  const dims = { sm: 20, md: 28, lg: 40, xl: 60 };
  const h = dims[size] || dims.md;
  return (
    <img
      src="https://media.base44.com/images/public/69eaf617762119e163948021/91e2e364b_Neonheartbeatmotorcyclelogo.png"
      alt="Ride Radar Logo"
      style={{ height: h, width: 'auto' }}
      className={cn(
        'object-contain',
        glow && 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]',
        className
      )}
    />
  );
}