/**
 * Virtual scroll runtime abstraction.
 *
 * Wraps a @tanstack/react-virtual virtualizer API and exposes the SAME
 * uniform scroll contract as nativeScrollRuntime.
 *
 * @param {Object} api — virtualizer instance or API object
 * @returns {{
 *   getScrollTop: () => number,
 *   getScrollHeight: () => number,
 *   getClientHeight: () => number,
 *   scrollToBottom: (behavior?: 'auto'|'smooth') => void,
 *   isNearBottom: (threshold?: number) => boolean,
 *   onScroll: (handler: Function) => () => void,
 * }}
 */
export function createVirtualScrollRuntime(api) {
  return {
    getScrollTop: () => api.getScrollOffset?.() ?? 0,

    getScrollHeight: () => api.getTotalSize?.() ?? 0,

    getClientHeight: () => api.getViewportSize?.() ?? 0,

    scrollToBottom: (behavior = 'auto') => {
      const count = api.getItemCount?.() ?? 0;
      if (count === 0) return;
      api.scrollToIndex?.(count - 1, {
        align: 'end',
        behavior,
      });
    },

    isNearBottom: (threshold = 120) => {
      const offset = api.getScrollOffset?.() ?? 0;
      const total = api.getTotalSize?.() ?? 0;
      const view = api.getViewportSize?.() ?? 0;
      return total - offset - view < threshold;
    },

    onScroll: (handler) => {
      // TanStack Virtual doesn't expose onScroll directly.
      // We return a no-op; scroll observation is handled via
      // the container's native scroll event in VirtualList.
      return () => {};
    },
  };
}
