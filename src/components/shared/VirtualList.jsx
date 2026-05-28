import { useRef, memo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} VirtualListProps
 * @property {Array} items - Array of data items to render
 * @property {(item: any, index: number, virtualRow: import('@tanstack/react-virtual').VirtualItem) => React.ReactNode} renderItem - Render function for each row
 * @property {number} [itemHeight] - Estimated row height in pixels (legacy alias for estimateSize)
 * @property {number} [estimateSize] - Estimated row height in pixels
 * @property {number} [gap=0] - Gap between items in pixels
 * @property {number} [overscan=5] - Number of items to render beyond the visible area
 * @property {string} [height] - Container height CSS value
 * @property {boolean} [scrollToBottom] - Auto-scroll to bottom when items change
 * @property {string} [className] - Additional classes for the scroll container
 * @property {string} [innerClassName] - Additional classes for the inner sizing div
 * @property {string} [itemClassName] - Additional classes for each virtual row wrapper
 * @property {(index: number) => string|number} [getItemKey] - Unique key extractor
 * @property {boolean} [shouldAutoScroll] - When true, authority allows auto-scroll.
 * @property {React.RefObject<HTMLElement>} [containerRef] - Optional ref to the
 *   scroll container element.
 * @property {(api: Object) => void} [onVirtualApiReady] - Callback that receives
 *   the virtualizer API for external scroll control.
 */

/**
 * VirtualList — High-performance virtual scrolling wrapper around @tanstack/react-virtual.
 *
 * Only renders visible rows + an overscan buffer, keeping DOM nodes at O(visible)
 * regardless of total list size. Essential for long feeds, message histories, and
 * large data sets.
 *
 * SCROLL POLICY: This component does NOT decide when to scroll. It only scrolls
 * when `shouldAutoScroll` is true. The caller is responsible for scroll decisions.
 *
 * @param {VirtualListProps} props
 * @returns {JSX.Element}
 */
const VirtualList = memo(function VirtualList({
  items,
  renderItem,
  itemHeight,
  estimateSize: estimateSizeProp,
  gap = 0,
  overscan = 5,
  height,
  scrollToBottom = false,
  shouldAutoScroll,
  className,
  innerClassName,
  itemClassName,
  getItemKey,
  scrollElementRef,
  containerRef: externalContainerRef,
  onVirtualApiReady,
}) {
  const internalRef = useRef(null);

  // Expose the scroll container to the authority so it can read live
  // scroll position and make consistent decisions across both paths.
  useEffect(() => {
    const el = scrollElementRef ? scrollElementRef.current : internalRef.current;
    if (externalContainerRef && el) {
      externalContainerRef.current = el;
    }
  }, [scrollElementRef, externalContainerRef]);

  const resolvedEstimateSize = estimateSizeProp ?? itemHeight ?? 60;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => (scrollElementRef ? scrollElementRef.current : internalRef.current),
    estimateSize: () => resolvedEstimateSize + gap,
    overscan,
    getItemKey: getItemKey || ((index) => items[index]?.id ?? index),
  });

  // Expose virtualizer API to parent for unified scroll runtime
  useEffect(() => {
    if (onVirtualApiReady) {
      onVirtualApiReady(virtualizer);
    }
  }, [onVirtualApiReady, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  // Auto-scroll to bottom for chat-like UIs
  // This is the ONLY scroll logic inside VirtualList, and it is gated
  // entirely by the authority's shouldAutoScroll decision.
  useEffect(() => {
    // If shouldAutoScroll is provided, it is the authority's decision.
    // If not provided, fall back to legacy scrollToBottom behavior.
    const allowed = shouldAutoScroll !== undefined ? shouldAutoScroll : scrollToBottom;
    if (!allowed) return;

    virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'auto' });
  }, [items.length, scrollToBottom, shouldAutoScroll, virtualizer]);

  const innerContent = (
    <div
      className={cn('relative w-full', innerClassName)}
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualItems.map((virtualRow) => (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={virtualizer.measureElement}
          role="listitem"
          className={cn('absolute left-0 w-full', itemClassName)}
          style={{
            top: 0,
            transform: `translateY(${virtualRow.start}px)`,
            paddingBottom: gap ? `${gap}px` : undefined,
          }}
        >
          {renderItem(items[virtualRow.index], virtualRow.index, virtualRow)}
        </div>
      ))}
    </div>
  );

  if (scrollElementRef) {
    return innerContent;
  }

  return (
    <div
      ref={internalRef}
      role="list"
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict', height: height || undefined }}
    >
      {innerContent}
    </div>
  );
});

export default VirtualList;
