import { useState, useEffect, useRef, useCallback } from 'react';
import { telemetryTransition, telemetryKeyboard } from '@/lib/telemetry/layout-telemetry.js';

/**
 * Layout state machine that derives a single phase from viewport changes.
 *
 * Phases:
 * - 'stable'          → viewport has not changed for 150–200ms
 * - 'keyboard-opening'→ viewport height dropped quickly (keyboard appearing)
 * - 'keyboard-open'   → keyboard is fully open and settled
 * - 'keyboard-closing'→ viewport height increased quickly (keyboard disappearing)
 * - 'resizing'        → viewport changed but not keyboard-related (orientation, etc.)
 *
 * @param {Object} viewport — output from useViewport() / useViewportContext()
 * @returns {{
 *   phase: string,
 *   isStable: boolean,
 *   isKeyboardOpen: boolean,
 *   keyboardHeight: number,
 *   viewportHeight: number,
 *   transitionId: number,
 * }}
 */
export function useLayoutMachine(viewport) {
  const [phase, setPhase] = useState('stable');
  const [transitionId, setTransitionId] = useState(0);

  const prevViewportRef = useRef(viewport);
  const stableTimerRef = useRef(null);
  const transitionCountRef = useRef(0);

  // ── Observability: transition log buffer (last 20 entries) ───────────────
  const transitionsRef = useRef([]);
  const lastTransitionTimeRef = useRef(0);

  const settleToStable = useCallback(() => {
    setPhase((current) => {
      if (current === 'stable') return current;
      const next = current === 'keyboard-opening' || current === 'keyboard-open'
        ? 'keyboard-open'
        : 'stable';
      return next;
    });
  }, []);

  useEffect(() => {
    const prev = prevViewportRef.current;

    // ── Stabilization: skip if viewport values haven't changed ───────────────
    // useViewport now deduplicates identical values, but we also guard here
    // against reference-only changes.
    if (
      viewport.viewportHeight === prev.viewportHeight &&
      viewport.viewportWidth === prev.viewportWidth &&
      viewport.keyboardHeight === prev.keyboardHeight &&
      viewport.offsetTop === prev.offsetTop
    ) {
      return;
    }

    prevViewportRef.current = viewport;

    const heightDelta = viewport.viewportHeight - prev.viewportHeight;
    const absDelta = Math.abs(heightDelta);
    const wasKeyboardOpen = prev.keyboardHeight > 80;
    const isKeyboardOpen = viewport.keyboardHeight > 80;

    // Detect keyboard transitions by large, fast height changes
    const isKeyboardTransition = absDelta > 80;

    let nextPhase = phase;
    let didTransition = false;

    if (isKeyboardTransition) {
      // Cancel any pending stable timer
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }

      if (heightDelta < 0) {
        // Viewport shrank → keyboard opening
        nextPhase = 'keyboard-opening';
      } else {
        // Viewport grew → keyboard closing
        nextPhase = 'keyboard-closing';
      }

      transitionCountRef.current += 1;
      setTransitionId(transitionCountRef.current);
      didTransition = nextPhase !== phase;
    } else if (absDelta > 0 && !isKeyboardTransition) {
      // Small change (orientation, toolbar, etc.)
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      nextPhase = 'resizing';
      transitionCountRef.current += 1;
      setTransitionId(transitionCountRef.current);
      didTransition = nextPhase !== phase;

      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 200);
    } else if (
      phase === 'keyboard-opening' &&
      isKeyboardOpen &&
      !wasKeyboardOpen
    ) {
      // Keyboard fully open — start settle timer
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 180);
    } else if (
      phase === 'keyboard-closing' &&
      !isKeyboardOpen &&
      wasKeyboardOpen
    ) {
      // Keyboard fully closed — start settle timer
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 180);
    } else if (
      (phase === 'keyboard-opening' || phase === 'keyboard-closing') &&
      stableTimerRef.current === null
    ) {
      // Safety: if we're in a transition phase but no timer is running,
      // start one to eventually return to stable
      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 250);
    }

    if (nextPhase !== phase) {
      setPhase(nextPhase);
    }

    // ── Observability: record transition ───────────────────────────────────
    const now = Date.now();
    const transitions = transitionsRef.current;

    if (didTransition) {
      transitions.push({
        timestamp: now,
        from: phase,
        to: nextPhase,
        viewportHeight: viewport.viewportHeight,
        keyboardHeight: viewport.keyboardHeight,
      });
      // Keep only last 20 entries
      if (transitions.length > 20) {
        transitions.shift();
      }

      // ── Telemetry: layout transition ─────────────────────────────────────
      telemetryTransition(phase, nextPhase, viewport.viewportHeight, viewport.keyboardHeight, heightDelta);

      // ── Observability: instability detection ─────────────────────────────
      // Count transitions within the last 300ms
      const recentWindow = 300;
      const recentCount = transitions.filter(
        (t) => now - t.timestamp <= recentWindow
      ).length;

      if (recentCount > 3) {
        console.warn('[LAYOUT INSTABILITY] rapid phase oscillation', {
          recentTransitions: recentCount,
          windowMs: recentWindow,
          transitions: transitions.slice(-6),
        });
        telemetryKeyboard('oscillation', viewport.keyboardHeight, prev.keyboardHeight, {
          recentTransitions: recentCount,
          phase: nextPhase,
        });
      }
    }

    lastTransitionTimeRef.current = now;

    // ── Observability: dev-time debug hook ─────────────────────────────────
    if (import.meta.env.DEV) {
      window.__RR_LAYOUT_DEBUG = transitions;
    }

    if (import.meta.env.DEV) {
      console.log('[LAYOUT]', nextPhase, {
        viewportHeight: viewport.viewportHeight,
        keyboardHeight: viewport.keyboardHeight,
        delta: heightDelta,
      });
    }
  }, [viewport, settleToStable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }
    };
  }, []);

  return {
    phase,
    isStable: phase === 'stable' || phase === 'keyboard-open',
    isKeyboardOpen: viewport.keyboardHeight > 80,
    keyboardHeight: viewport.keyboardHeight,
    viewportHeight: viewport.viewportHeight,
    transitionId,
  };
}
