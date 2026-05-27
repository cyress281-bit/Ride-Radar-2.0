import { useEffect, useRef } from 'react';
import { useViewportContext } from '@/providers/ViewportProvider';

/**
 * Radar viewport hook — derives radar-specific viewport state from the
 * unified viewport model. No direct visualViewport listeners; consumes
 * ViewportProvider context instead.
 *
 * Returns a `version` counter that increments whenever the viewport height
 * changes, useful as a React key to force re-mounts/resizes of map components.
 */
export function useRadarViewport() {
  const { viewportHeight, keyboardHeight } = useViewportContext();
  const versionRef = useRef(0);
  const prevHeightRef = useRef(viewportHeight);

  useEffect(() => {
    if (prevHeightRef.current !== viewportHeight) {
      prevHeightRef.current = viewportHeight;
      versionRef.current += 1;
    }
  }, [viewportHeight]);

  // Write radar-specific offset-bottom CSS var for BottomNav positioning
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty('--rr-viewport-offset-bottom', `${keyboardHeight}px`);
  }, [keyboardHeight]);

  return {
    height: viewportHeight,
    version: versionRef.current,
  };
}
