import { useState, useEffect } from 'react';

/**
 * Hook that returns the current keyboard overlap height in pixels.
 *
 * On iOS Safari the virtual keyboard does not resize the layout viewport,
 * so `100dvh` stays full-screen and the keyboard covers the bottom of the
 * page. This hook listens to `window.visualViewport` and calculates the
 * exact overlap so callers can shrink their containers to keep inputs
 * visible.
 *
 * @returns {number} Keyboard overlap in pixels (0 when keyboard is closed)
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const calculate = () => {
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      const offsetTop = vv.offsetTop;
      const overlap = Math.max(0, Math.round(layoutHeight - visualHeight - offsetTop));
      setKeyboardHeight(overlap);
    };

    calculate();
    vv.addEventListener('resize', calculate, { passive: true });
    vv.addEventListener('scroll', calculate, { passive: true });

    return () => {
      vv.removeEventListener('resize', calculate);
      vv.removeEventListener('scroll', calculate);
    };
  }, []);

  return keyboardHeight;
}
