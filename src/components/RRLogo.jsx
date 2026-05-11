import { memo } from 'react';
import { cn } from '@/lib/utils';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

/**
 * Memoized brand logo - props are stable across renders (size/glow don't change).
 * Rendered in Layout header (every page) and Home hero, so preventing
 * unnecessary re-renders on route changes saves work across the app.
 */
const RRLogo = memo(function RRLogo({ size = 'md', glow = true, className }) {
  // Adjusted sizes for the wide image
  const dims = { xs: 16, sm: 20, md: 28, lg: 40, xl: 60 };
  const h = dims[size] || dims.md;
  const isFill = size === 'fill';
  return (
    <img
      src={RIDE_RADAR_LOGO_URL}
      alt="Ride Radar Logo"
      decoding="async"
      style={{ height: isFill ? '100%' : h, width: isFill ? '100%' : 'auto' }}
      className={cn(
        'object-contain',
        glow && 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]',
        className
      )}
    />
  );
});

export default RRLogo;
