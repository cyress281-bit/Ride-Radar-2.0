import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Navigation, Radio, Siren } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { toast } from 'sonner';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useUpdateSettings } from '@/features/settings/hooks/use-settings.js';

// ── Draggable pad constants ────────────────────────────────────────────────
const PAD_WIDTH = 136;
const PAD_HEIGHT_WITH_HANDLE = 128; // 24px handle + ~104px 2+1 grid
const STORAGE_KEY = 'rr:radar-pad-position';
const MARGIN = 16;
const MIN_TOP = 128;          // below header (56px) + safe-area + signal pill
const BOTTOM_CLEARANCE = 144; // above bottom sheet peek (60px) + bottom nav (56px) + margins

function getViewportSize() {
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

function clampPos(left, top) {
  const viewport = getViewportSize();
  return {
    left: Math.max(MARGIN, Math.min(Math.max(MARGIN, viewport.width - PAD_WIDTH - MARGIN), left)),
    top: Math.max(MIN_TOP, Math.min(Math.max(MIN_TOP, viewport.height - PAD_HEIGHT_WITH_HANDLE - BOTTOM_CLEARANCE), top)),
  };
}

function getDefaultPos() {
  const viewport = getViewportSize();
  return clampPos(
    viewport.width - PAD_WIDTH - MARGIN,
    viewport.height - PAD_HEIGHT_WITH_HANDLE - 168,
  );
}

function readSavedPadPosition() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null;
    return clampPos(parsed.left, parsed.top);
  } catch {
    return null;
  }
}

function savePadPosition(pos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Floating UI overlays for the radar view:
 * - Top signal-count pill
 * - Draggable control card (Go Live, Signal, Bike Down)
 * - Location error banner
 */
const RadarOverlay = memo(function RadarOverlay({
  hasUserLocation,
  usingOfflineSnapshot,
  geoError,
  isLiveMapVisible,
  sheetOpen = false,
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

  // ── Draggable pad ──────────────────────────────────────────────────────────
  // padPos drives the committed (state) position — used only when NOT dragging.
  // During active drag we mutate padElRef.current.style directly to avoid
  // React re-renders on every pointermove frame.
  const [padPos, setPadPos] = useState(() => readSavedPadPosition() ?? getDefaultPos());
  const padElRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const rafRef = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    const reclampPad = () => {
      if (dragRef.current.dragging) return;
      setPadPos((pos) => clampPos(pos.left, pos.top));
    };
    const frame = requestAnimationFrame(reclampPad);
    const timer = setTimeout(reclampPad, 250);
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', reclampPad, { passive: true });
    window.addEventListener('orientationchange', reclampPad, { passive: true });
    visualViewport?.addEventListener('resize', reclampPad, { passive: true });
    visualViewport?.addEventListener('scroll', reclampPad, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener('resize', reclampPad);
      window.removeEventListener('orientationchange', reclampPad);
      visualViewport?.removeEventListener('resize', reclampPad);
      visualViewport?.removeEventListener('scroll', reclampPad);
    };
  }, []);

  const handlePadPointerDown = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      const pos = getDefaultPos();
      setPadPos(pos);
      savePadPosition(pos);
      return;
    }
    lastTapRef.current = now;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Disable transition during drag so CSS doesn't fight pointer moves
    if (padElRef.current) padElRef.current.style.transition = 'none';
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: padPos.left,
      startTop: padPos.top,
    };
  }, [padPos]);

  const handlePadPointerMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    if (rafRef.current) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const { left, top } = clampPos(dragRef.current.startLeft + dx, dragRef.current.startTop + dy);
      // Direct DOM mutation — zero React re-renders during drag
      if (padElRef.current) {
        padElRef.current.style.left = `${left}px`;
        padElRef.current.style.top = `${top}px`;
      }
    });
  }, []);

  const handlePadPointerUp = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3;
    const finalPos = moved
      ? clampPos(dragRef.current.startLeft + dx, dragRef.current.startTop + dy)
      : { left: dragRef.current.startLeft, top: dragRef.current.startTop };
    // Restore transition, commit final position to React state (single re-render)
    if (padElRef.current) padElRef.current.style.transition = '';
    setPadPos(finalPos);
    if (moved) savePadPosition(finalPos);
  }, []);

  const handlePadPointerCancel = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (padElRef.current) padElRef.current.style.transition = '';
    // Snap back to committed position
    if (padElRef.current) {
      padElRef.current.style.left = `${dragRef.current.startLeft}px`;
      padElRef.current.style.top = `${dragRef.current.startTop}px`;
    }
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Top context pill */}
      {(!hasUserLocation || usingOfflineSnapshot) && (
        <div className="absolute top-header-offset left-4 right-4 z-10 flex justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full backdrop-blur-xl bg-surface/80 border border-white/[0.10] px-4 py-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            {!hasUserLocation && (
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                US overview
              </span>
            )}
            {usingOfflineSnapshot && (
              <span className={cn(
                'text-xs font-bold uppercase tracking-wider text-brand-radar',
                !hasUserLocation && 'border-l border-white/[0.04] pl-3'
              )}>
                Offline
              </span>
            )}
          </div>
        </div>
      )}

      {/* Draggable action pad — 3 actions: Live | Signal top row, Bike Down full width */}
      <div
        ref={padElRef}
        className={cn(
          'absolute z-[25]',
          sheetOpen
            ? 'opacity-0 scale-95 pointer-events-none transition-all duration-300'
            : 'opacity-100 scale-100 pointer-events-auto'
        )}
        style={{ left: padPos.left, top: padPos.top }}
      >
        <div className="overflow-hidden rounded-[18px] backdrop-blur-xl bg-black/80 border border-white/[0.12] shadow-[0_0_12px_hsl(var(--primary)/0.10)]">

          {/* Drag handle */}
          <div
            onPointerDown={handlePadPointerDown}
            onPointerMove={handlePadPointerMove}
            onPointerUp={handlePadPointerUp}
            onPointerCancel={handlePadPointerCancel}
            style={{ touchAction: 'none' }}
            className="flex flex-col items-center justify-center gap-[5px] h-6 border-b border-white/[0.04] cursor-grab active:cursor-grabbing select-none"
            aria-label="Drag to reposition controls. Double-tap to reset."
          >
            <div className="flex gap-[5px]">
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
            </div>
            <div className="flex gap-[5px]">
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
              <span className="h-[4px] w-[4px] rounded-full bg-white/[0.60]" />
            </div>
          </div>

          <div className="grid grid-cols-2">

            {/* Live */}
            <button
              onClick={handleToggleLive}
              disabled={updateSettings.isPending}
              className={cn(
                'rr-haptic flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] transition-all active:scale-95 border-r border-b border-white/[0.04]',
                isLiveMapVisible
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-white/[0.04]',
                justActivated && 'rr-lock'
              )}
              aria-label={isLiveMapVisible ? 'LIVE — Tap to hide' : 'Go Live — appear on map'}
            >
              <div className="flex h-5 w-5 items-center justify-center">
                {updateSettings.isPending ? (
                  <Navigation className="h-[18px] w-[18px] animate-spin" />
                ) : isLiveMapVisible ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
                  </span>
                ) : (
                  <Radio className="h-[18px] w-[18px] text-primary" />
                )}
              </div>
              <span className="text-xs font-bold leading-none">
                {updateSettings.isPending ? '…' : 'Live'}
              </span>
            </button>

            {/* Signal */}
            <button
              onClick={handleCreateBroadcast}
              className="rr-haptic flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] text-primary hover:bg-white/[0.04] transition-all active:scale-95 border-b border-white/[0.04]"
              aria-label="Create a signal"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Plus className="h-[18px] w-[18px]" />
              </div>
              <span className="text-xs font-bold leading-none">Signal</span>
            </button>

            {/* Bike Down — spans full width */}
            <button
              onClick={handleBikeDown}
              className="rr-haptic col-span-2 flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] text-destructive hover:bg-destructive/[0.06] transition-all active:scale-95"
              aria-label="Report a bike down emergency"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Siren className="h-[18px] w-[18px]" />
              </div>
              <span className="text-xs font-bold leading-none">Bike Down</span>
            </button>

          </div>
        </div>
      </div>

      {/* Location error banner */}
      {geoError && (
        <div className="absolute top-32 left-4 right-4 z-[11] flex justify-center">
          <div className="rounded-2xl border border-white/[0.04] bg-surface/80 backdrop-blur-xl px-4 py-3 text-center shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
            <p className="text-xs font-bold text-alert">Location access denied</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enable location in settings to see nearby signals</p>
          </div>
        </div>
      )}
    </>
  );
});

export default RadarOverlay;
