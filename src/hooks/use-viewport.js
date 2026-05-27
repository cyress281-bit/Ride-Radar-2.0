import { useState, useEffect, useCallback, useRef } from 'react';
import { telemetryKeyboard } from '@/lib/telemetry/layout-telemetry.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED VIEWPORT SOURCE — SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THIS IS THE ONLY FILE IN THE APP that directly reads window.visualViewport.
 *
 * Rules:
 * - All viewport metrics are derived here.
 * - All keyboard state is derived here.
 * - NO OTHER FILE may attach visualViewport event listeners.
 * - NO OTHER FILE may independently calculate keyboard height.
 * - All consumers MUST use useViewportContext() from ViewportProvider.
 *
 * If you need to change viewport behavior, modify ONLY this file or
 * use-layout-machine.js — never add competing listeners.
 *
 * See: src/layout/layout-guardrails.js for the full policy.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Unified viewport metrics derived from a single visualViewport listener.
 *
 * This is the ONLY place in the app that directly reads window.visualViewport.
 * All other components consume viewport state via the ViewportProvider context.
 *
 * @returns {{
 *   viewportWidth: number,
 *   viewportHeight: number,
 *   offsetTop: number,
 *   offsetLeft: number,
 *   keyboardHeight: number,
 *   isKeyboardOpen: boolean,
 *   layoutHeight: number,
 *   layoutWidth: number,
 * }}
 */
export function useViewport() {
  const [metrics, setMetrics] = useState(() => readViewportMetrics());
  const keyboardStateRef = useRef({
    height: 0,
    isOpen: false,
    openTimer: null,
  });
  const prevMetricsRef = useRef(readViewportMetrics());

  const update = useCallback(() => {
    const raw = readViewportMetrics();
    const prev = prevMetricsRef.current;
    const ks = keyboardStateRef.current;

    // ── Stabilization: skip update if nothing changed ────────────────────────
    // Compare all numeric values to prevent unnecessary re-renders when
    // visualViewport fires scroll events during normal page scrolling.
    if (
      raw.viewportWidth === prev.viewportWidth &&
      raw.viewportHeight === prev.viewportHeight &&
      raw.offsetTop === prev.offsetTop &&
      raw.offsetLeft === prev.offsetLeft &&
      raw.keyboardHeight === prev.keyboardHeight &&
      raw.layoutHeight === prev.layoutHeight &&
      raw.layoutWidth === prev.layoutWidth &&
      raw.isKeyboardOpen === prev.isKeyboardOpen &&
      ks.isOpen === prev.isKeyboardOpen
    ) {
      return;
    }

    prevMetricsRef.current = raw;

    // Derive keyboard state with hysteresis to avoid flicker
    const nowOpen = raw.keyboardHeight > 80;

    if (nowOpen) {
      if (ks.openTimer) {
        clearTimeout(ks.openTimer);
        ks.openTimer = null;
      }
      ks.isOpen = true;
      ks.height = raw.keyboardHeight;
    } else if (ks.isOpen) {
      // Debounce close by 150ms for iOS emoji/accessory bar transitions.
      // During debounce, preserve the last known keyboardHeight so downstream
      // consumers (layout machine, container sizing) don't see a flicker to 0.
      if (ks.openTimer) clearTimeout(ks.openTimer);
      ks.openTimer = setTimeout(() => {
        ks.isOpen = false;
        ks.height = 0;
        const latest = readViewportMetrics();
        prevMetricsRef.current = latest;
        setMetrics({ ...latest, isKeyboardOpen: false });
      }, 150);
      // Emit current metrics with debounced isKeyboardOpen and preserved height
      setMetrics({
        ...raw,
        keyboardHeight: ks.height, // preserve last known height during debounce
        isKeyboardOpen: true,      // keep open until debounce fires
      });
      telemetryKeyboard('close_debounce', raw.keyboardHeight, ks.height, {
        debounceMs: 150,
      });
      return;
    }

    // Detect sudden keyboard height jumps (> 80px while stable)
    const heightJump = Math.abs(raw.keyboardHeight - prev.keyboardHeight);
    if (heightJump > 80 && prev.keyboardHeight > 0) {
      telemetryKeyboard('sudden_jump', raw.keyboardHeight, prev.keyboardHeight, {
        jump: heightJump,
      });
    }

    setMetrics({
      ...raw,
      isKeyboardOpen: ks.isOpen,
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      // Fallback for browsers without visualViewport
      const onResize = () => update();
      window.addEventListener('resize', onResize, { passive: true });
      return () => window.removeEventListener('resize', onResize);
    }

    // ── DEV-TIME SAFETY CHECK ──────────────────────────────────────────────
    // Warn if another part of the app has attached visualViewport listeners.
    // This is a best-effort check — it counts listeners by temporarily
    // replacing addEventListener and measuring the difference.
    if (import.meta.env.DEV) {
      try {
        const originalAdd = vv.addEventListener.bind(vv);
        let count = 0;
        vv.addEventListener = function (type, handler, options) {
          if (type === 'resize' || type === 'scroll') count++;
          return originalAdd(type, handler, options);
        };
        // Trigger a microtask to let any existing listeners register
        Promise.resolve().then(() => {
          // Our own listener registration below will add 2 (resize + scroll).
          // If count > 2 at this point, someone else already registered.
          // We check after a short delay to catch eager registrations.
          setTimeout(() => {
            if (count > 2) {
              console.error(
                '[LAYOUT SYSTEM VIOLATION] Duplicate visualViewport listeners detected. ' +
                'Only use-viewport.js may attach visualViewport event listeners. ' +
                'See src/layout/layout-guardrails.js'
              );
            }
            vv.addEventListener = originalAdd;
          }, 100);
        });
      } catch {
        // Safety: if the check throws, don't break the app
      }
    }
    // ── END DEV-TIME SAFETY CHECK ──────────────────────────────────────────

    update();
    vv.addEventListener('resize', update, { passive: true });
    vv.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (keyboardStateRef.current.openTimer) {
        clearTimeout(keyboardStateRef.current.openTimer);
      }
    };
  }, [update]);

  return metrics;
}

function readViewportMetrics() {
  const vv = window.visualViewport;
  const layoutHeight = window.innerHeight;
  const layoutWidth = window.innerWidth;

  if (!vv) {
    return {
      viewportWidth: layoutWidth,
      viewportHeight: layoutHeight,
      offsetTop: 0,
      offsetLeft: 0,
      keyboardHeight: 0,
      isKeyboardOpen: false,
      layoutHeight,
      layoutWidth,
    };
  }

  const viewportWidth = Math.round(vv.width);
  const viewportHeight = Math.round(vv.height);
  const offsetTop = Math.round(vv.offsetTop);
  const offsetLeft = Math.round(vv.offsetLeft);
  const keyboardHeight = Math.max(0, Math.round(layoutHeight - viewportHeight - offsetTop));

  return {
    viewportWidth,
    viewportHeight,
    offsetTop,
    offsetLeft,
    keyboardHeight,
    isKeyboardOpen: keyboardHeight > 80,
    layoutHeight,
    layoutWidth,
  };
}
