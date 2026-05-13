import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to manage the radar bottom sheet state, drag gestures,
 * pull-to-refresh, and body scroll lock.
 *
 * @returns {{
 *   sheetOpen: boolean,
 *   setSheetOpen: (v: boolean | ((prev: boolean) => boolean)) => void,
 *   sheetRef: React.RefObject<HTMLDivElement>,
 *   sheetContentRef: React.RefObject<HTMLDivElement>,
 *   pullOffset: number,
 *   isPulling: boolean,
 *   sheetTouchHandlers: {
 *     onTouchStart: (e: React.TouchEvent) => void,
 *     onTouchMove: (e: React.TouchEvent) => void,
 *     onTouchEnd: () => void,
 *   },
 *   contentTouchHandlers: {
 *     onTouchStart: (e: React.TouchEvent) => void,
 *     onTouchMove: (e: React.TouchEvent) => void,
 *     onTouchEnd: (e: React.TouchEvent) => void,
 *   },
 * }}
 */
export function useBottomSheet() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const sheetRef = useRef(null);
  const sheetContentRef = useRef(null);
  const sheetStartY = useRef(0);
  const sheetCurrentY = useRef(0);

  // Bottom sheet drag handling
  const handleSheetTouchStart = useCallback((e) => {
    sheetStartY.current = e.touches[0].clientY;
    sheetCurrentY.current = 0;
  }, []);

  const handleSheetTouchMove = useCallback((e) => {
    const delta = sheetStartY.current - e.touches[0].clientY;
    sheetCurrentY.current = delta;
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    if (sheetCurrentY.current > 60) {
      setSheetOpen(true);
    } else if (sheetCurrentY.current < -60) {
      setSheetOpen(false);
    }
  }, []);

  // Pull-to-refresh feel on sheet content
  const handleContentTouchStart = useCallback((e) => {
    const el = sheetContentRef.current;
    if (!el || el.scrollTop > 0) return;
    sheetStartY.current = e.touches[0].clientY;
    setIsPulling(true);
    e.stopPropagation();
  }, []);

  const handleContentTouchMove = useCallback((e) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - sheetStartY.current;
    if (delta > 0) {
      setPullOffset(Math.min(delta * 0.4, 80));
    }
    e.stopPropagation();
  }, [isPulling]);

  const handleContentTouchEnd = useCallback((e) => {
    if (pullOffset > 40) {
      queryClient.invalidateQueries({ queryKey: ['broadcasts', 'nearby'] });
    }
    setIsPulling(false);
    setPullOffset(0);
    e.stopPropagation();
  }, [pullOffset, queryClient]);

  // Prevent body scroll when bottom sheet is open.
  // Always restore on cleanup so unmounting with an open sheet doesn't leave
  // overflow:hidden stuck on the body.
  useEffect(() => {
    if (!sheetOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sheetOpen]);

  const sheetTouchHandlers = useMemo(
    () => ({
      onTouchStart: handleSheetTouchStart,
      onTouchMove: handleSheetTouchMove,
      onTouchEnd: handleSheetTouchEnd,
    }),
    [handleSheetTouchStart, handleSheetTouchMove, handleSheetTouchEnd]
  );

  const contentTouchHandlers = useMemo(
    () => ({
      onTouchStart: handleContentTouchStart,
      onTouchMove: handleContentTouchMove,
      onTouchEnd: handleContentTouchEnd,
    }),
    [handleContentTouchStart, handleContentTouchMove, handleContentTouchEnd]
  );

  return {
    sheetOpen,
    setSheetOpen,
    sheetRef,
    sheetContentRef,
    pullOffset,
    isPulling,
    sheetTouchHandlers,
    contentTouchHandlers,
  };
}
