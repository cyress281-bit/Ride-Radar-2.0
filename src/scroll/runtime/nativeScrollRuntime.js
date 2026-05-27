/**
 * Native DOM scroll runtime abstraction.
 *
 * Wraps a DOM element ref and exposes a uniform scroll contract.
 * No consumer outside this module may touch scrollTop, scrollHeight, etc.
 *
 * @param {{ current: HTMLElement|null }} ref
 * @returns {{
 *   getScrollTop: () => number,
 *   getScrollHeight: () => number,
 *   getClientHeight: () => number,
 *   scrollToBottom: (behavior?: 'auto'|'smooth') => void,
 *   isNearBottom: (threshold?: number) => boolean,
 *   onScroll: (handler: EventListener) => () => void,
 * }}
 */
export function createNativeScrollRuntime(ref) {
  return {
    getScrollTop: () => ref.current?.scrollTop ?? 0,

    getScrollHeight: () => ref.current?.scrollHeight ?? 0,

    getClientHeight: () => ref.current?.clientHeight ?? 0,

    scrollToBottom: (behavior = 'auto') => {
      const el = ref.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },

    isNearBottom: (threshold = 120) => {
      const el = ref.current;
      if (!el) return true;
      return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    },

    onScroll: (handler) => {
      const el = ref.current;
      if (!el) return () => {};
      el.addEventListener('scroll', handler, { passive: true });
      return () => {
        el.removeEventListener('scroll', handler);
      };
    },
  };
}
