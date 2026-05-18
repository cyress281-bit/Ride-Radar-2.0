import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, Navigation, Radio, Siren } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { toast } from 'sonner';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useUpdateSettings } from '@/features/settings/hooks/use-settings.js';

/**
 * Floating UI overlays for the radar view:
 * - Top signal-count pill
 * - Right-side control card (Go Live, Signal, Locate)
 * - Location error banner
 */
const RadarOverlay = memo(function RadarOverlay({
  activeCount,
  hasUserLocation,
  usingOfflineSnapshot,
  requestLocation,
  locating,
  geoError,
  isLiveMapVisible,
}) {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const updateSettings = useUpdateSettings();
  const [justActivated, setJustActivated] = useState(false);
  const justActivatedTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
    };
  }, []);

  const handleCreateBroadcast = useCallback(() => navigate('/broadcast'), [navigate]);
  const handleBikeDown = useCallback(() => navigate('/broadcast?type=bike_down'), [navigate]);

  const [justLocked, setJustLocked] = useState(false);
  const prevLocatingRef = useRef(locating);
  const hasInitiatedRequestRef = useRef(false);

  const handleRequestLocation = useCallback(() => {
    hasInitiatedRequestRef.current = true;
    requestLocation?.();
  }, [requestLocation]);

  const handleToggleLive = useCallback(async () => {
    if (!user?.id || updateSettings.isPending) return;
    try {
      const turningOn = !isLiveMapVisible;
      await updateSettings.mutateAsync({
        userId: user.id,
        updates: { live_map_visible: turningOn },
      });
      if (turningOn) {
        setJustActivated(true);
        if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
        justActivatedTimerRef.current = setTimeout(() => setJustActivated(false), 700);
      }
    } catch (err) {
      toast.error('Could not update live status', {
        description: err?.message || 'Please try again',
      });
    }
  }, [user?.id, isLiveMapVisible, updateSettings]);

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

      {/* Compact 2×2 action pad */}
      <div className="absolute bottom-52 right-4 z-[15]">
        <div className="overflow-hidden rounded-[28px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
          <div className="grid grid-cols-2">

            {/* Live */}
            <button
              onClick={handleToggleLive}
              disabled={updateSettings.isPending}
              className={cn(
                'rr-haptic flex flex-col items-center justify-center gap-1.5 px-5 py-4 min-h-[64px] transition-all active:scale-95 border-r border-b border-white/[0.06]',
                isLiveMapVisible
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-white/[0.04]',
                justActivated && 'rr-lock'
              )}
              aria-label={isLiveMapVisible ? 'LIVE — Tap to hide' : 'Go Live — appear on map'}
            >
              <div className="flex h-5 w-5 items-center justify-center">
                {updateSettings.isPending ? (
                  <Navigation className="h-4 w-4 animate-spin" />
                ) : isLiveMapVisible ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
                  </span>
                ) : (
                  <Radio className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="text-[11px] font-bold leading-none">
                {updateSettings.isPending ? '…' : 'Live'}
              </span>
            </button>

            {/* Signal */}
            <button
              onClick={handleCreateBroadcast}
              className="rr-haptic flex flex-col items-center justify-center gap-1.5 px-5 py-4 min-h-[64px] text-primary hover:bg-white/[0.04] transition-all active:scale-95 border-b border-white/[0.06]"
              aria-label="Create a signal"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold leading-none">Signal</span>
            </button>

            {/* Locate */}
            <button
              onClick={handleRequestLocation}
              disabled={locating}
              className={cn(
                'rr-haptic flex flex-col items-center justify-center gap-1.5 px-5 py-4 min-h-[64px] text-primary transition-all active:scale-95 border-r border-white/[0.06]',
                !locating && 'hover:bg-white/[0.04]',
                justLocked && 'rr-lock'
              )}
              aria-label="Center Radar on my area"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                {locating ? (
                  <Navigation className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
              </div>
              <span className="text-[11px] font-bold leading-none">
                {locating ? 'Finding' : hasUserLocation ? 'Locate' : 'Find me'}
              </span>
            </button>

            {/* Bike Down */}
            <button
              onClick={handleBikeDown}
              className="rr-haptic flex flex-col items-center justify-center gap-1.5 px-5 py-4 min-h-[64px] text-destructive hover:bg-destructive/[0.06] transition-all active:scale-95"
              aria-label="Report a bike down emergency"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Siren className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold leading-none">Bike Down</span>
            </button>

          </div>
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
