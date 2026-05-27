import { useMemo } from 'react';
import { createNativeScrollRuntime } from './nativeScrollRuntime.js';
import { createVirtualScrollRuntime } from './virtualScrollRuntime.js';

/**
 * React hook that creates a unified scroll runtime.
 *
 * Returns the SAME contract regardless of mode:
 *   - 'native'  → wraps DOM element ref
 *   - 'virtual' → wraps @tanstack/react-virtual API
 *
 * @param {Object} params
 * @param {'native'|'virtual'} params.mode
 * @param {Object} params.refs
 * @param {React.RefObject<HTMLElement>} [params.refs.containerRef] — for native mode
 * @param {Object} [params.refs.virtualApi] — for virtual mode (virtualizer instance)
 * @returns {ReturnType<createNativeScrollRuntime>}
 */
export function useUnifiedScrollRuntime({ mode, refs }) {
  return useMemo(() => {
    if (mode === 'virtual' && refs.virtualApi) {
      return createVirtualScrollRuntime(refs.virtualApi);
    }
    return createNativeScrollRuntime(refs.containerRef);
  }, [mode, refs.containerRef, refs.virtualApi]);
}
