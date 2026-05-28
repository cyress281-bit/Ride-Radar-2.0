import { useState, useEffect, useCallback, useRef } from 'react';

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

    // Stabilization: skip update if nothing changed
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
        keyboardHeight: ks.height,
        isKeyboardOpen: true,
      });
      return;
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

    // iOS PWA ZERO-HEIGHT FIX
    let retryTimers = [];
    const initial = readViewportMetrics();
    if (initial.viewportHeight === 0 || initial.layoutHeight === 0) {
      retryTimers = [
        setTimeout(update, 50),
        setTimeout(update, 150),
        setTimeout(update, 500),
      ];
    }

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
      retryTimers.forEach(clearTimeout);
    };
  }, [update]);

  return metrics;
}

function readViewportMetrics() {
  const vv = window.visualViewport;
  const rawLayoutHeight = window.innerHeight;
  const rawLayoutWidth = window.innerWidth;
  const layoutHeight = rawLayoutHeight > 0 ? rawLayoutHeight : (window.screen?.availHeight || 812);
  const layoutWidth = rawLayoutWidth > 0 ? rawLayoutWidth : (window.screen?.availWidth || 375);

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

  const rawVvHeight = Math.round(vv.height);
  const rawVvWidth = Math.round(vv.width);
  const viewportWidth = rawVvWidth > 0 ? rawVvWidth : layoutWidth;
  const viewportHeight = rawVvHeight > 0 ? rawVvHeight : layoutHeight;
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
