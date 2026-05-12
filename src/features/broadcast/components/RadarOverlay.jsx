import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils.js';

/**
 * Floating UI overlays for the radar view:
 * - Top signal-count pill
 * - Right-side floating action buttons
 * - Location error toast
 */
const RadarOverlay = memo(function RadarOverlay({
  activeCount,
  hasUserLocation,
  usingOfflineSnapshot,
  requestLocation,
  locating,
  geoError,
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Top info pill */}
      <div className="absolute top-header-offset left-4 right-4 z-10 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-surface/70 backdrop-blur-2xl border border-border/30 px-4 py-2 rr-shadow-md">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-green" />
          <span className="text-xs font-bold text-foreground">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'}
          </span>
          {!hasUserLocation && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-l border-border/40 pl-3">
              US overview
            </span>
          )}
          {usingOfflineSnapshot && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-alert border-l border-border/40 pl-3">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="absolute bottom-44 right-4 z-[30] flex flex-col gap-3">
        <button
          onClick={() => navigate('/broadcast')}
          className="rr-haptic flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground glow-kawasaki-sm rr-shadow-lg transition-transform active:scale-90"
          aria-label="Create broadcast"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={requestLocation}
          disabled={locating}
          className={cn(
            'rr-haptic flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-xl border transition-all active:scale-90',
            hasUserLocation
              ? 'bg-surface/80 border-border/40 text-primary rr-shadow-md'
              : 'bg-primary text-primary-foreground border-primary glow-kawasaki-sm rr-shadow-lg'
          )}
          aria-label={hasUserLocation ? 'Center on my location' : 'Enable location'}
        >
          {locating ? (
            <Navigation className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Location error toast */}
      {geoError && (
        <div className="absolute top-32 left-4 right-4 z-10 flex justify-center">
          <div className="rounded-2xl border border-alert/30 bg-alert/10 backdrop-blur-xl px-4 py-3 text-center shadow-lg">
            <p className="text-xs font-bold text-alert">Location access denied</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enable location in settings to see nearby signals</p>
          </div>
        </div>
      )}
    </>
  );
});

export default RadarOverlay;
