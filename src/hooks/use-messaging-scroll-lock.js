import { useEffect, useRef } from 'react';

/**
 * iOS PWA messaging scroll containment.
 *
 * Instead of locking the body (which breaks portals, modals, and
 * browser back-button scroll restoration), we lock the AppLayout
 * root container and ensure only the message list can scroll.
 *
 * This hook MUST be used inside AppLayout (which renders the
 * `#main-content` or root container).
 *
 * @param {boolean} enabled — Whether to apply scroll containment
 */
export function useMessagingScrollLock(enabled) {
  const mainRef = useRef(null);
  const savedStylesRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Find the main content container (AppLayout's <main> or fallback to #root)
    const main = document.getElementById('main-content') || document.getElementById('root');
    if (!main) return;
    mainRef.current = main;

    // Save original styles
    savedStylesRef.current = {
      overflow: main.style.overflow,
      overscrollBehavior: main.style.overscrollBehavior,
      touchAction: main.style.touchAction,
    };

    // Contain scroll within the main content area — do NOT touch body/html
    main.style.overflow = 'hidden';
    main.style.overscrollBehavior = 'none';
    main.style.touchAction = 'pan-y';

    return () => {
      const saved = savedStylesRef.current;
      if (!saved || !mainRef.current) return;
      mainRef.current.style.overflow = saved.overflow;
      mainRef.current.style.overscrollBehavior = saved.overscrollBehavior;
      mainRef.current.style.touchAction = saved.touchAction;
    };
  }, [enabled]);
}
