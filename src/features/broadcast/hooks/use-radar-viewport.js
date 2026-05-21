import { useCallback, useEffect, useRef, useState } from 'react';

function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  const height = Math.round(visualViewport?.height ?? window.innerHeight);
  const offsetBottom = visualViewport
    ? Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop))
    : 0;

  return { height, offsetBottom };
}

function readSafeAreaBottom() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.body.appendChild(probe);
  const safeBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return Math.round(safeBottom);
}

function writeViewportVars() {
  const html = document.documentElement;
  const metrics = getViewportMetrics();
  const safeBottom = readSafeAreaBottom();

  html.style.setProperty('--rr-viewport-height', `${metrics.height}px`);
  html.style.setProperty('--rr-safe-area-bottom', `${safeBottom}px`);

  return { ...metrics, safeBottom };
}

export function useRadarViewport() {
  const [viewport, setViewport] = useState(() => ({
    height: typeof window === 'undefined' ? 0 : Math.round(window.visualViewport?.height ?? window.innerHeight),
    version: 0,
  }));
  const offsetBottomEnabledRef = useRef(false);

  const updateViewport = useCallback((includeOffsetBottom = true) => {
    const metrics = writeViewportVars();
    if (includeOffsetBottom && offsetBottomEnabledRef.current) {
      document.documentElement.style.setProperty(
        '--rr-viewport-offset-bottom',
        `${metrics.offsetBottom}px`
      );
    }
    setViewport((current) => {
      if (current.height === metrics.height) return current;
      return { height: metrics.height, version: current.version + 1 };
    });
  }, []);

  useEffect(() => {
    const frames = [];
    frames.push(requestAnimationFrame(() => updateViewport(false)));
    frames.push(requestAnimationFrame(() => {
      frames.push(requestAnimationFrame(() => updateViewport(false)));
    }));
    offsetBottomEnabledRef.current = false;
    const timers = [
      setTimeout(() => {
        offsetBottomEnabledRef.current = true;
        updateViewport(true);
      }, 80),
      setTimeout(() => updateViewport(true), 250),
      setTimeout(() => updateViewport(true), 600),
    ];
    const visualViewport = window.visualViewport;

    updateViewport(false);
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    visualViewport?.addEventListener('resize', updateViewport, { passive: true });
    visualViewport?.addEventListener('scroll', updateViewport, { passive: true });

    return () => {
      frames.forEach(cancelAnimationFrame);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, [updateViewport]);

  return viewport;
}
