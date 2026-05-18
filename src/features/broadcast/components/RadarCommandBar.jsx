import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Navigation, Plus, Radio, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateSettings } from '@/features/settings/hooks/use-settings';

const RadarCommandBar = memo(function RadarCommandBar({
  requestLocation,
  locating,
  hasUserLocation,
  isLiveMapVisible,
  userId,
}) {
  const navigate = useNavigate();
  const updateSettings = useUpdateSettings();
  const [justActivated, setJustActivated] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
  const justActivatedTimerRef = useRef(null);
  const prevLocatingRef = useRef(false);
  const hasInitiatedRequestRef = useRef(false);

  useEffect(() => {
    return () => {
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const wasLocating = prevLocatingRef.current;
    prevLocatingRef.current = locating;
    if (wasLocating && !locating && hasUserLocation) {
      setJustLocked(true);
      if (hasInitiatedRequestRef.current) {
        hasInitiatedRequestRef.current = false;
        try { navigator.vibrate?.(15); } catch {}
      }
      const timer = setTimeout(() => setJustLocked(false), 700);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [locating, hasUserLocation]);

  const handleLocate = useCallback(() => {
    hasInitiatedRequestRef.current = true;
    requestLocation();
  }, [requestLocation]);

  const handleToggleLive = useCallback(async () => {
    if (!userId || updateSettings.isPending) return;
    try {
      const turningOn = !isLiveMapVisible;
      await updateSettings.mutateAsync({
        userId,
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
  }, [userId, isLiveMapVisible, updateSettings]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-safe pointer-events-none">
      <div className="mx-auto px-4 h-14 max-w-xl flex items-center justify-start">
        <div className="flex items-center gap-0.5 bg-black/70 border border-white/[0.08] rounded-full px-1.5 py-1 shadow-[0_2px_16px_hsl(0_0%_0%/0.4)] pointer-events-auto">
          {/* Live */}
          <button
            onClick={handleToggleLive}
            disabled={updateSettings.isPending}
            className={cn(
              'rr-haptic flex items-center gap-[3px] rounded-full px-2 py-1.5 min-h-[36px] text-[10px] font-bold transition-all active:scale-95',
              isLiveMapVisible
                ? 'bg-primary/20 text-primary'
                : 'text-foreground/70 hover:bg-white/[0.06]',
              justActivated && 'rr-lock'
            )}
            aria-label={isLiveMapVisible ? 'LIVE — tap to hide' : 'Go Live — appear on map'}
          >
            <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              {updateSettings.isPending ? (
                <Navigation className="h-3 w-3 animate-spin" />
              ) : isLiveMapVisible ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              ) : (
                <Radio className="h-3 w-3" />
              )}
            </div>
            <span>{updateSettings.isPending ? '…' : 'Live'}</span>
          </button>

          {/* Signal */}
          <button
            onClick={() => navigate('/broadcast')}
            className="rr-haptic flex items-center gap-[3px] rounded-full px-2 py-1.5 min-h-[36px] text-[10px] font-bold text-primary hover:bg-white/[0.06] transition-all active:scale-95"
            aria-label="Create a signal"
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span>Signal</span>
          </button>

          {/* Locate */}
          <button
            onClick={handleLocate}
            disabled={locating}
            className={cn(
              'rr-haptic flex items-center justify-center rounded-full p-2.5 min-h-[36px] min-w-[36px] text-primary transition-all active:scale-95',
              !locating && 'hover:bg-white/[0.06]',
              justLocked && 'rr-lock'
            )}
            aria-label={hasUserLocation ? 'Center Radar on my area' : 'Find my location'}
          >
            {locating ? (
              <Navigation className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="h-3 w-px bg-white/20 mx-0.5 shrink-0" aria-hidden="true" />

          {/* Bike Down */}
          <button
            onClick={() => navigate('/broadcast?type=bike_down')}
            className="rr-haptic flex items-center justify-center rounded-full p-2.5 min-h-[36px] min-w-[36px] text-destructive hover:bg-destructive/[0.06] transition-all active:scale-95"
            aria-label="Report a bike down emergency"
          >
            <Siren className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default RadarCommandBar;
