import { useEffect } from 'react';

/**
 * Hook that locks body scroll when `locked` is true.
 *
 * On iOS Safari `overflow: hidden` on the body is unreliable — the page
 * still bounces and scrolls behind modals/sheets. This hook uses the
 * `position: fixed` + negative `top` offset technique which is the only
 * reliable way to freeze scroll on iOS.
 *
 * All original body styles are saved and restored on cleanup, and the
 * previous scroll position is restored so the user doesn't lose their place.
 *
 * @param {boolean} locked — Whether to lock body scroll
 */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const originalStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
    };

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.width = originalStyles.width;
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.touchAction = originalStyles.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
