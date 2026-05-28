import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Layout state machine that derives a single phase from viewport changes.
 *
 * Phases:
 * - 'boot'              → initial state before first viewport measurement
 * - 'initializing'      → first measurement received, settling
 * - 'stable'            → viewport has not changed for 150–200ms
 * - 'keyboard-opening'  → viewport height dropped quickly (keyboard appearing)
 * - 'keyboard-open'     → keyboard is fully open and settled
 * - 'keyboard-closing'  → viewport height increased quickly (keyboard disappearing)
 * - 'resizing'          → viewport changed but not keyboard-related (orientation, etc.)
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
  const [phase, setPhase] = useState('boot');
  const [transitionId, setTransitionId] = useState(0);

  const prevViewportRef = useRef(viewport);
  const stableTimerRef = useRef(null);
  const transitionCountRef = useRef(0);
  const hasReceivedMeasurementRef = useRef(false);

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

    // Boot → Initializing transition on first real measurement
    if (!hasReceivedMeasurementRef.current && viewport.viewportHeight > 0) {
      hasReceivedMeasurementRef.current = true;
      setPhase('initializing');
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 100);
      prevViewportRef.current = viewport;
      return;
    }

    // Stabilization: skip if viewport values haven't changed
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
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }

      if (heightDelta < 0) {
        nextPhase = 'keyboard-opening';
      } else {
        nextPhase = 'keyboard-closing';
      }

      transitionCountRef.current += 1;
      setTransitionId(transitionCountRef.current);
      didTransition = nextPhase !== phase;
    } else if (absDelta > 0 && !isKeyboardTransition) {
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
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      stableTimerRef.current = setTimeout(() => {
        settleToStable();
      }, 180);
    } else if (
      phase === 'keyboard-closing' &&
      !isKeyboardOpen &&
      wasKeyboardOpen
    ) {
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

    if (didTransition && import.meta.env.DEV) {
      console.log('[LAYOUT]', nextPhase, {
        viewportHeight: viewport.viewportHeight,
        keyboardHeight: viewport.keyboardHeight,
        delta: heightDelta,
      });
    }
  }, [viewport, settleToStable, phase]);

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
