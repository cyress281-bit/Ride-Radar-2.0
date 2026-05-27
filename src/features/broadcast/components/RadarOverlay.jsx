import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, Navigation, Radio, Siren } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { toast } from 'sonner';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useUpdateSettings } from '@/features/settings/hooks/use-settings.js';
import { clearPresence } from '@/features/map/api/map-api.js';
import BottomSheet from '@/components/layout/BottomSheet';

// ── Draggable pad constants ────────────────────────────────────────────────
const PAD_WIDTH = 136;
const PAD_HEIGHT_WITH_HANDLE = 128; // 24px handle + ~104px 2+1 grid
const STORAGE_KEY = 'rr:radar-pad-position';
const MARGIN = 16;
const MIN_TOP = 128;          // below header (56px) + safe-area + signal pill
const BOTTOM_CLEARANCE = 144; // above bottom sheet peek (60px) + bottom nav (56px) + margins

function getViewportSize() {
  // Read from the unified viewport CSS variable when available,
  // falling back to visualViewport directly for non-React contexts.
  const html = document.documentElement;
  const vvHeight = html.style.getPropertyValue('--rr-viewport-height');
  const height = vvHeight ? parseInt(vvHeight, 10) : Math.round(window.visualViewport?.height ?? window.innerHeight);
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height,
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

// ── Go Live confirmation preference ───────────────────────────────────────────
const LIVE_CONFIRM_SKIP_KEY = 'rr:live-confirm-skip';
function hasSkippedLiveConfirm() {
  try { return window.localStorage.getItem(LIVE_CONFIRM_SKIP_KEY) === '1'; } catch { return false; }
}
function persistSkipLiveConfirm() {
  try { window.localStorage.setItem(LIVE_CONFIRM_SKIP_KEY, '1'); } catch {}
}
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Floating UI overlays for the radar view:
 * - Top signal-count pill
 * - Draggable control card (Go Live, Signal, Bike Down)
 * - Location error banner
 */
const RadarOverlay = memo(function RadarOverlay({
  activeCount = 0,
  hasUserLocation,
  onLocate,
  usingOfflineSnapshot,
  geoError,
  isLiveMapVisible,
  sheetOpen = false,
  // Fix C — resume awareness callbacks from useLiveMapPresence
  needsResumePrompt = false,
  markLiveSessionActive,
  clearLiveSession,
}) {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const updateSettings = useUpdateSettings();
  const [justActivated, setJustActivated] = useState(false);
  const justActivatedTimerRef = useRef(null);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [confirmSkipFuture, setConfirmSkipFuture] = useState(false);

  // Fix C — Resume Live sheet state
  const [showResumeSheet, setShowResumeSheet] = useState(false);
  const resumeResolvedRef = useRef(false);

  // Open resume sheet as soon as the hook reports a pending resume
  useEffect(() => {
    if (needsResumePrompt) setShowResumeSheet(true);
  }, [needsResumePrompt]);

  useEffect(() => {
    return () => {
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
    };
  }, []);

  const handleCreateBroadcast = useCallback(() => navigate('/broadcast'), [navigate]);
  const handleBikeDown = useCallback(() => navigate('/broadcast?type=bike_down'), [navigate]);

  // Shared helper: expire presence row + update settings to OFF
  const performLiveOff = useCallback(async () => {
    clearLiveSession?.();
    try {
      await updateSettings.mutateAsync({ userId: user?.id, updates: { live_map_visible: false } });
      // Fix A: immediately delete presence row so other riders stop seeing the user
      clearPresence(user?.id).catch(() => {});
    } catch (err) {
      toast.error('Could not update live status', { description: err?.message || 'Please try again' });
    }
  }, [user?.id, updateSettings, clearLiveSession]);

  const handleToggleLive = useCallback(async () => {
    if (!user?.id || updateSettings.isPending) return;
    const turningOn = !isLiveMapVisible;
    // Turning OFF — no confirmation, clear presence immediately (Fix A)
    if (!turningOn) {
      await performLiveOff();
      return;
    }
    // Turning ON — show confirmation unless user previously opted out
    if (!hasSkippedLiveConfirm()) {
      setConfirmSkipFuture(false);
      setShowLiveConfirm(true);
      return;
    }
    // Already confirmed — activate directly
    markLiveSessionActive?.(); // Fix C: mark session active before async
    try {
      await updateSettings.mutateAsync({ userId: user.id, updates: { live_map_visible: true } });
      setJustActivated(true);
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
      justActivatedTimerRef.current = setTimeout(() => setJustActivated(false), 700);
    } catch (err) {
      toast.error('Could not update live status', { description: err?.message || 'Please try again' });
    }
  }, [user?.id, isLiveMapVisible, updateSettings, performLiveOff, markLiveSessionActive]);

  const handleLiveConfirm = useCallback(async () => {
    setShowLiveConfirm(false);
    if (confirmSkipFuture) persistSkipLiveConfirm();
    markLiveSessionActive?.(); // Fix C: mark session active before async
    try {
      await updateSettings.mutateAsync({ userId: user?.id, updates: { live_map_visible: true } });
      setJustActivated(true);
      if (justActivatedTimerRef.current) clearTimeout(justActivatedTimerRef.current);
      justActivatedTimerRef.current = setTimeout(() => setJustActivated(false), 700);
    } catch (err) {
      toast.error('Could not update live status', { description: err?.message || 'Please try again' });
    }
  }, [user?.id, updateSettings, confirmSkipFuture, markLiveSessionActive]);

  // Fix C — Resume Live sheet handlers
  const handleResumeLive = useCallback(() => {
    resumeResolvedRef.current = true;
    markLiveSessionActive?.();
    setShowResumeSheet(false);
  }, [markLiveSessionActive]);

  const handleResumeStayOffline = useCallback(async () => {
    resumeResolvedRef.current = true;
    setShowResumeSheet(false);
    await performLiveOff();
  }, [performLiveOff]);

  // Called by BottomSheet onClose (backdrop tap / swipe dismiss)
  const handleResumeSheetClose = useCallback(async () => {
    if (resumeResolvedRef.current) {
      resumeResolvedRef.current = false; // reset for next time
      return;
    }
    // Implicit close — treat as Stay Offline (safer default)
    await performLiveOff();
  }, [performLiveOff]);

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
    window.addEventListener('resize', reclampPad, { passive: true });
    window.addEventListener('orientationchange', reclampPad, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener('resize', reclampPad);
      window.removeEventListener('orientationchange', reclampPad);
    };
  }, []);

  // ── iOS touch fallback ─────────────────────────────────────────────────────
  // iOS Safari Pointer Events are unreliable for drag — touchmove often doesn't
  // fire after pointerdown because the browser treats it as a scroll gesture.
  // We attach raw touch listeners to the drag handle as a fallback.
  useEffect(() => {
    const handle = padElRef.current?.querySelector('[data-rr-pad-handle]');
    if (!handle) return;

    let touchDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartLeft = 0;
    let touchStartTop = 0;
    let touchRaf = null;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchDragging = true;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartLeft = padPos.left;
      touchStartTop = padPos.top;
      if (padElRef.current) padElRef.current.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      if (!touchDragging || e.touches.length !== 1) return;
      if (touchRaf) return;
      const t = e.touches[0];
      touchRaf = requestAnimationFrame(() => {
        touchRaf = null;
        if (!touchDragging) return;
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const { left, top } = clampPos(touchStartLeft + dx, touchStartTop + dy);
        if (padElRef.current) {
          padElRef.current.style.left = `${left}px`;
          padElRef.current.style.top = `${top}px`;
        }
      });
    };

    const onTouchEnd = (e) => {
      if (!touchDragging) return;
      touchDragging = false;
      if (touchRaf) { cancelAnimationFrame(touchRaf); touchRaf = null; }
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3;
      const finalPos = moved
        ? clampPos(touchStartLeft + dx, touchStartTop + dy)
        : { left: touchStartLeft, top: touchStartTop };
      if (padElRef.current) padElRef.current.style.transition = '';
      setPadPos(finalPos);
      if (moved) savePadPosition(finalPos);
    };

    const onTouchCancel = () => {
      if (!touchDragging) return;
      touchDragging = false;
      if (touchRaf) { cancelAnimationFrame(touchRaf); touchRaf = null; }
      if (padElRef.current) padElRef.current.style.transition = '';
      if (padElRef.current) {
        padElRef.current.style.left = `${touchStartLeft}px`;
        padElRef.current.style.top = `${touchStartTop}px`;
      }
    };

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    handle.addEventListener('touchmove', onTouchMove, { passive: true });
    handle.addEventListener('touchend', onTouchEnd);
    handle.addEventListener('touchcancel', onTouchCancel);
    return () => {
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove', onTouchMove);
      handle.removeEventListener('touchend', onTouchEnd);
      handle.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [padPos]);

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
        <div className="absolute top-header-offset left-16 right-4 z-10 flex justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-surface/86 px-2.5 py-2 shadow-[0_14px_42px_hsl(0_0%_0%/0.32),0_0_22px_hsl(var(--primary)/0.12)] backdrop-blur-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.10] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <Radio className="h-3 w-3" aria-hidden="true" />
              {activeCount > 0 ? `${activeCount} nearby` : 'Radar quiet'}
            </span>
            <span className="h-5 w-px bg-white/[0.08]" aria-hidden="true" />
            {!hasUserLocation && (
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                US overview
              </span>
            )}
            {usingOfflineSnapshot && (
              <span className={cn(
                'text-[10px] font-bold uppercase tracking-[0.16em] text-brand-radar',
                !hasUserLocation && 'border-l border-white/[0.04] pl-2'
              )}>
                Offline
              </span>
            )}
          </div>
        </div>
      )}

      {/* Locate button — always visible; requests location if not yet granted, recenters if already have it */}
      <button
        type="button"
        onClick={onLocate}
        className="rr-haptic absolute left-3 top-header-offset z-[25] flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-surface/86 text-primary shadow-[0_14px_36px_hsl(0_0%_0%/0.34),0_0_0_1px_hsl(var(--primary)/0.20),0_0_24px_hsl(var(--primary)/0.16)] backdrop-blur-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={hasUserLocation ? 'Center map on my location' : 'Find my location'}
      >
        <Crosshair className="h-5 w-5" aria-hidden="true" />
      </button>

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
        <div className="overflow-hidden rounded-[18px] border border-white/[0.12] bg-surface/84 shadow-[0_18px_52px_hsl(0_0%_0%/0.38),0_0_24px_hsl(var(--primary)/0.08)] backdrop-blur-2xl">

          {/* Drag handle */}
          <div
            onPointerDown={handlePadPointerDown}
            onPointerMove={handlePadPointerMove}
            onPointerUp={handlePadPointerUp}
            onPointerCancel={handlePadPointerCancel}
            style={{ touchAction: 'none' }}
            className="flex flex-col items-center justify-center gap-[5px] h-6 border-b border-white/[0.05] cursor-grab active:cursor-grabbing select-none"
            data-rr-pad-handle
            aria-label="Drag to reposition controls. Double-tap to reset."
          >
            <div className="flex gap-[5px]">
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
            </div>
            <div className="flex gap-[5px]">
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
              <span className="h-[4px] w-[4px] rounded-full bg-primary/65 shadow-[0_0_6px_hsl(var(--primary)/0.22)]" />
            </div>
          </div>

          <div className="grid grid-cols-2">

            {/* Live */}
            <button
              onClick={handleToggleLive}
              disabled={updateSettings.isPending}
              className={cn(
                'rr-haptic flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] transition-all active:scale-95 border-r border-b border-white/[0.05]',
                isLiveMapVisible
                  ? 'bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]'
                  : 'text-foreground hover:bg-white/[0.045]',
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
              className="rr-haptic flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] text-primary hover:bg-white/[0.045] transition-all active:scale-95 border-b border-white/[0.05]"
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
              className="rr-haptic col-span-2 flex flex-col items-center justify-center gap-1 px-3 py-2.5 min-h-[50px] text-destructive hover:bg-destructive/[0.08] transition-all active:scale-95"
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

      {/* Resume Live? sheet — shown when app reopens with stale live_map_visible = true */}
      <BottomSheet
        isOpen={showResumeSheet}
        onClose={handleResumeSheetClose}
        title="Resume Live?"
        height="auto"
      >
        <div className="flex flex-col gap-5 pt-1">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/25 shadow-[0_0_28px_hsl(var(--primary)/0.22)]">
              <Radio className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm text-foreground leading-relaxed">
              You were Live in your last session. Nearby riders will be able to see your live presence while Live is active.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Resume to appear on the Radar map, or stay offline to keep your presence hidden.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pb-1">
            <button
              type="button"
              onClick={handleResumeLive}
              className="rr-haptic w-full flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_22px_hsl(var(--primary)/0.22),inset_0_1px_0_hsl(0_0%_100%/0.28)] hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              <Radio className="h-4 w-4" />
              Resume Live
            </button>
            <button
              type="button"
              onClick={handleResumeStayOffline}
              disabled={updateSettings.isPending}
              className="rr-haptic w-full flex items-center justify-center h-11 rounded-full border border-white/[0.08] text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.04] active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Stay Offline
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Go Live confirmation sheet */}
      <BottomSheet
        isOpen={showLiveConfirm}
        onClose={() => setShowLiveConfirm(false)}
        title="Go Live?"
        height="auto"
      >
        <div className="flex flex-col gap-5 pt-1">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/25 shadow-[0_0_28px_hsl(var(--primary)/0.22)]">
              <Radio className="h-7 w-7 text-primary" />
            </div>
          </div>

          {/* Body copy */}
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm text-foreground leading-relaxed">
              Nearby riders will be able to see your live presence on the Radar map and nearby riders feed while Live is active.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only riders within the nearby Radar area can see your live presence. You can turn Live off anytime.
            </p>
          </div>

          {/* Don't show again */}
          <button
            type="button"
            onClick={() => setConfirmSkipFuture((v) => !v)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 border border-white/[0.06] bg-white/[0.03] active:opacity-70 transition-opacity"
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150',
                confirmSkipFuture ? 'bg-primary border-primary' : 'border-white/25 bg-transparent'
              )}
            >
              {confirmSkipFuture && (
                <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1,4.5 4.5,8 11,1" />
                </svg>
              )}
            </span>
            <span className="text-xs text-muted-foreground font-medium">Don&apos;t show again</span>
          </button>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pb-1">
            <button
              type="button"
              onClick={handleLiveConfirm}
              disabled={updateSettings.isPending}
              className="rr-haptic w-full flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_0_22px_hsl(var(--primary)/0.22),inset_0_1px_0_hsl(0_0%_100%/0.28)] hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {updateSettings.isPending
                ? <Navigation className="h-4 w-4 animate-spin" />
                : <Radio className="h-4 w-4" />
              }
              Go Live
            </button>
            <button
              type="button"
              onClick={() => setShowLiveConfirm(false)}
              className="rr-haptic w-full flex items-center justify-center h-11 rounded-full border border-white/[0.08] text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.04] active:scale-[0.97] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
});

export default RadarOverlay;
