import React, { createContext, useContext, memo } from 'react';
import { useViewport } from '@/hooks/use-viewport.js';
import { useLayoutMachine } from '@/hooks/use-layout-machine.js';

/**
 * @typedef {Object} ViewportContextValue
 * @property {number} viewportWidth
 * @property {number} viewportHeight
 * @property {number} offsetTop
 * @property {number} offsetLeft
 * @property {number} keyboardHeight
 * @property {boolean} isKeyboardOpen
 * @property {number} layoutHeight
 * @property {number} layoutWidth
 * @property {string} layoutPhase
 * @property {boolean} isLayoutStable
 * @property {number} layoutTransitionId
 * @property {boolean} isInitialized
 */

/**
 * SAFE FALLBACK — every field has a stable production-safe default.
 */
const VIEWPORT_FALLBACK = Object.freeze({
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 375,
  viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 667,
  offsetTop: 0,
  offsetLeft: 0,
  keyboardHeight: 0,
  isKeyboardOpen: false,
  layoutHeight: typeof window !== 'undefined' ? window.innerHeight : 667,
  layoutWidth: typeof window !== 'undefined' ? window.innerWidth : 375,
  layoutPhase: 'stable',
  isLayoutStable: true,
  layoutTransitionId: 0,
  isInitialized: true,
});

const ViewportContext = createContext(VIEWPORT_FALLBACK);

/**
 * ViewportProvider — Single source of truth for viewport + keyboard state.
 *
 * Mounts once at the app root. The underlying `useViewport` hook attaches
 * exactly ONE set of visualViewport listeners. All descendants read from
 * this context instead of attaching their own listeners.
 *
 * Also runs the layout state machine (useLayoutMachine) to derive a unified
 * phase ('boot' → 'initializing' → 'stable' → 'keyboard-opening' →
 * 'keyboard-open' → 'keyboard-closing' → 'resizing').
 *
 * @param {{ children: React.ReactNode }} props
 */
export const ViewportProvider = memo(function ViewportProvider({ children }) {
  const metrics = useViewport();
  const layout = useLayoutMachine(metrics);

  const value = {
    ...metrics,
    layoutPhase: layout.phase,
    isLayoutStable: layout.isStable,
    layoutTransitionId: layout.transitionId,
    isInitialized: metrics.viewportHeight > 0,
  };

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
});

/**
 * SAFE hook to consume the unified viewport context.
 *
 * NEVER throws in production. Returns fallback values if called outside
 * the provider tree.
 *
 * @returns {ViewportContextValue}
 */
export function useViewportContext() {
  const ctx = useContext(ViewportContext);

  if (!ctx) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[ViewportProvider] useViewportContext called outside provider tree. ' +
        'Returning safe fallback values.'
      );
    }
    return VIEWPORT_FALLBACK;
  }

  return ctx;
}

/**
 * STRICT hook for dev-time validation. Throws if context is missing.
 * Use ONLY in test code or when you explicitly want to fail fast.
 *
 * @returns {ViewportContextValue}
 * @throws {Error} If used outside of ViewportProvider
 */
export function useViewportContextStrict() {
  const ctx = useContext(ViewportContext);
  if (!ctx) {
    throw new Error('useViewportContextStrict: must be used inside ViewportProvider');
  }
  return ctx;
}
