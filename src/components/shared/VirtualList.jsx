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
 */

/**
 * VirtualList — High-performance virtual scrolling wrapper around @tanstack/react-virtual.
 *
 * Only renders visible rows + an overscan buffer, keeping DOM nodes at O(visible)
 * regardless of total list size. Essential for long feeds, message histories, and
 * large data sets.
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
  className,
  innerClassName,
  itemClassName,
  getItemKey,
}) {
  const parentRef = useRef(null);

  const resolvedEstimateSize = estimateSizeProp ?? itemHeight ?? 60;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => resolvedEstimateSize + gap,
    overscan,
    getItemKey: getItemKey || ((index) => items[index]?.id ?? index),
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Auto-scroll to bottom for chat-like UIs
  useEffect(() => {
    if (scrollToBottom && parentRef.current) {
      const el = parentRef.current;
      // Only scroll if user is already near bottom (within 150px)
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom || items.length <= overscan + 2) {
        virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'auto' });
      }
    }
  }, [items.length, scrollToBottom, overscan, virtualizer]);

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict', height: height || undefined }}
    >
      <div
        className={cn('relative w-full', innerClassName)}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
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
    </div>
  );
});

export default VirtualList;
