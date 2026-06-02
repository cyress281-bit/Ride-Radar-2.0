import { memo } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';

/**
 * LocationGateOverlay — Soft, dismissible educational overlay on the Radar
 * when the user has no usable location.
 *
 * Props:
 * - hasUserLocation: boolean
 * - geoError: boolean
 * - locating: boolean
 * - usingOfflineSnapshot: boolean
 * - dismissed: boolean
 * - onEnable: () => void — tapped "Enable location" / "Try again"
 * - onDismiss: () => void — tapped "Not now"
 * - onReopen: () => void — tapped the dismissed chip
 */
const LocationGateOverlay = memo(function LocationGateOverlay({
  hasUserLocation,
  geoError,
  locating,
  usingOfflineSnapshot,
  dismissed,
  onEnable,
  onDismiss,
  onReopen,
}) {
  if (hasUserLocation) return null;

  const showDenied = geoError && !locating;
  const showChip = dismissed || usingOfflineSnapshot;

  // Full overlay
  if (!showChip) {
    return (
      <div className="absolute inset-0 z-[15] flex items-center justify-center px-4 pointer-events-none">
        {/* Subtle backdrop — pointer-events-none so the map stays interactive */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

        {/* Card — pointer-events-auto to capture taps */}
        <div
          className={cn(
            'relative w-full max-w-sm rounded-[24px] border border-white/[0.08]',
            'bg-surface/95 p-5 shadow-[0_20px_60px_hsl(0_0%_0%/0.45)] backdrop-blur-xl',
            'pointer-events-auto'
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {showDenied ? 'Location is off' : 'Turn on location to use the radar'}
            </h3>
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed mb-6">
            {showDenied
              ? "Ride Radar can't find nearby riders or signals without location. Turn it on in Settings → Privacy & Security → Location Services → Safari Websites → While Using. Your location stays private — others only see you when you go live."
              : "Ride Radar uses your location to show who and what's around you. Your location stays private — other riders only see you when you create a signal or go live."}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onEnable}
              disabled={locating}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-bold',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 active:scale-[0.98]',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                locating && 'opacity-70 cursor-not-allowed'
              )}
            >
              {locating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting location…
                </span>
              ) : showDenied ? (
                'Try again'
              ) : (
                'Enable location'
              )}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium',
                'bg-white/[0.03] text-muted-foreground border border-white/[0.06]',
                'hover:bg-white/[0.06] hover:text-foreground',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dismissed chip (or suppressed during offline snapshot)
  return (
    <div className="absolute top-32 left-4 right-4 z-[12] flex justify-center pointer-events-none">
      <button
        type="button"
        onClick={onReopen}
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full',
          'border border-white/[0.06] bg-surface/80 backdrop-blur-xl',
          'px-3.5 py-2 shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
          'text-xs font-medium text-muted-foreground',
          'hover:text-foreground hover:bg-surface/90',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
      >
        <MapPin className="w-3.5 h-3.5 text-alert" />
        <span>Location off</span>
      </button>
    </div>
  );
});

export default LocationGateOverlay;
