import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

/**
 * @typedef {object} VirtualListProps
 * @property {Array} items - Array of data items to render
 * @property {(item: any, index: number, virtualRow: import('@tanstack/react-virtual').VirtualItem) => React.ReactNode} renderItem - Render function for each row
 * @property {number} itemHeight - Estimated row height in pixels
 * @property {number} [overscan=5] - Number of items to render beyond the visible area
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
  overscan = 5,
  className,
  innerClassName,
  itemClassName,
  getItemKey,
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    getItemKey: getItemKey || ((index) => items[index]?.id ?? index),
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict' }}
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
