import { useState, useRef, useCallback, useMemo } from 'react';

/**
 * Reusable pull-to-refresh hook for scrollable containers.
 *
 * Only activates when the container is scrolled to the top (scrollTop === 0).
 * Pulling down dampens the gesture and caps the visual offset. When the user
 * releases past the threshold, the refresh callback is fired.
 *
 * @param {() => void|Promise<void>} onRefresh - Called when pull passes threshold
 * @param {object} [options]
 * @param {number} [options.threshold=40] - Pixel threshold to trigger refresh
 * @param {number} [options.maxPull=80] - Max visual pull offset in pixels
 * @param {number} [options.damping=0.4] - Pull distance multiplier (0-1)
 * @returns {{
 *   pullOffset: number,
 *   isPulling: boolean,
 *   touchHandlers: {
 *     onTouchStart: (e: React.TouchEvent) => void,
 *     onTouchMove: (e: React.TouchEvent) => void,
 *     onTouchEnd: () => void,
 *   },
 *   containerRef: React.RefObject<HTMLDivElement>,
 * }}
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 40, maxPull = 80, damping = 0.4 } = options;

  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!isPulling) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullOffset(Math.min(delta * damping, maxPull));
      }
    },
    [isPulling, damping, maxPull]
  );

  const handleTouchEnd = useCallback(() => {
    if (pullOffset > threshold) {
      onRefresh?.();
    }
    setIsPulling(false);
    setPullOffset(0);
  }, [pullOffset, threshold, onRefresh]);

  const touchHandlers = useMemo(
    () => ({
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }),
    [handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  return { pullOffset, isPulling, touchHandlers, containerRef };
}
