import { memo, useCallback, useEffect, useRef, useState } from 'react';
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

  const handleCreateBroadcast = useCallback(() => navigate('/broadcast'), [navigate]);

  // Phase 3: track lock motion + user-initiated haptic on first fix.
  const [justLocked, setJustLocked] = useState(false);
  const prevLocatingRef = useRef(locating);
  const hasInitiatedRequestRef = useRef(false);

  const handleRequestLocation = useCallback(() => {
    hasInitiatedRequestRef.current = true;
    requestLocation?.();
  }, [requestLocation]);

  useEffect(() => {
    const wasLocating = prevLocatingRef.current;
    prevLocatingRef.current = locating;
    if (wasLocating && !locating && hasUserLocation && !geoError) {
      setJustLocked(true);
      if (hasInitiatedRequestRef.current) {
        hasInitiatedRequestRef.current = false;
        try { navigator.vibrate?.(15); } catch {}
      }
      const timer = setTimeout(() => setJustLocked(false), 700);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [locating, hasUserLocation, geoError]);

  return (
    <>
      {/* Top info pill */}
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

      {/* Floating action buttons */}
      <div className="absolute bottom-44 right-4 z-[30] flex flex-col gap-3">
        <button
          onClick={handleCreateBroadcast}
          className="rr-haptic flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-xl bg-surface/80 border border-white/[0.06] text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)] rr-shadow-lg transition-transform active:scale-90"
          aria-label="Create broadcast"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={handleRequestLocation}
          disabled={locating}
          className={cn(
            'rr-haptic flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-xl border transition-all active:scale-90',
            hasUserLocation
              ? 'bg-surface/80 border-white/[0.06] text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
              : 'bg-surface/80 border-primary/30 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]',
            justLocked && 'rr-lock'
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
