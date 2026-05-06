import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Generic virtual scrolling wrapper using @tanstack/react-virtual.
 * Only renders visible items + overscan buffer for O(visible) DOM nodes
 * instead of O(total) — critical for lists with 100+ items.
 *
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - (item, index, virtualRow) => ReactNode
 * @param {number} props.estimateSize - Estimated row height in px (for initial layout)
 * @param {number} [props.overscan=5] - Number of items to render beyond visible area
 * @param {string} [props.className] - Additional classes for the scroll container
 * @param {string} [props.innerClassName] - Additional classes for the inner (total-size) div
 * @param {string} [props.itemClassName] - Additional classes for each item wrapper
 * @param {number|string} [props.height] - Container height (CSS value), default 'auto'
 * @param {boolean} [props.scrollToBottom] - If true, scrolls to bottom when items change (for chat)
 * @param {Function} [props.getItemKey] - (index) => unique key for the item
 * @param {string} [props.gap] - Gap between items in px (applied as marginBottom)
 */
export default function VirtualList({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  className = '',
  innerClassName = '',
  itemClassName = '',
  height,
  scrollToBottom = false,
  getItemKey,
  gap = 0,
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey || ((index) => items[index]?.id || index),
  });

  // Scroll to bottom when items change (for chat-like views)
  const prevCountRef = useRef(items.length);
  if (scrollToBottom && items.length > prevCountRef.current) {
    // Schedule scroll after render
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'smooth' });
    });
  }
  prevCountRef.current = items.length;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: height || 'auto',
        overflow: height ? 'auto' : undefined,
        contain: 'strict',
      }}
    >
      <div
        className={innerClassName}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className={itemClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div style={{ paddingBottom: gap ? `${gap}px` : undefined }}>
              {renderItem(items[virtualRow.index], virtualRow.index, virtualRow)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook-based alternative for more control over the virtualizer instance.
 * Use this when you need access to the virtualizer directly (e.g., for scroll-to-bottom in chat).
 */
export function useVirtualList({
  items,
  parentRef,
  estimateSize,
  overscan = 5,
  getItemKey,
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey || ((index) => items[index]?.id || index),
  });

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior });
    }
  }, [items.length, virtualizer]);

  return {
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToBottom,
    scrollToIndex: virtualizer.scrollToIndex.bind(virtualizer),
  };
}
