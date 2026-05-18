import { memo } from 'react';
import { cn } from '@/lib/utils.js';

/**
 * Floating UI overlays for the radar view:
 * - Top signal-count pill
 * - Location error banner
 *
 * Radar command actions (Live, Signal, Locate, Bike Down) now live
 * inside AppHeader, accessed via RadarCommandContext.
 */
const RadarOverlay = memo(function RadarOverlay({
  activeCount,
  hasUserLocation,
  usingOfflineSnapshot,
  geoError,
}) {
  return (
    <>
      {/* Signal count pill */}
      <div className="absolute top-header-offset left-4 right-4 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full backdrop-blur-xl bg-surface/80 border border-white/[0.06] px-4 py-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-green" />
          <span className="text-xs font-bold text-foreground">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'}
          </span>
          {!hasUserLocation && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-l border-white/[0.06] pl-3">
              US overview
            </span>
          )}
          {usingOfflineSnapshot && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-radar border-l border-white/[0.06] pl-3">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Location error banner */}
      {geoError && (
        <div className="absolute top-32 left-4 right-4 z-10 flex justify-center">
          <div className="rounded-2xl border border-white/[0.06] bg-surface/80 backdrop-blur-xl px-4 py-3 text-center shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
            <p className="text-xs font-bold text-alert">Location access denied</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enable location in settings to see nearby signals</p>
          </div>
        </div>
      )}
    </>
  );
});

export default RadarOverlay;
