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
 */

const ViewportContext = createContext(null);

/**
 * ViewportProvider — Single source of truth for viewport + keyboard state.
 *
 * Mounts once at the app root. The underlying `useViewport` hook attaches
 * exactly ONE set of visualViewport listeners. All descendants read from
 * this context instead of attaching their own listeners.
 *
 * Also runs the layout state machine (useLayoutMachine) to derive a unified
 * phase ('stable', 'keyboard-opening', 'keyboard-open', 'keyboard-closing',
 * 'resizing') that components can use to gate scroll and animation behavior.
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
  };

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
});

/**
 * Hook to consume the unified viewport context.
 *
 * @returns {ViewportContextValue}
 * @throws {Error} If used outside of ViewportProvider
 */
export function useViewportContext() {
  const ctx = useContext(ViewportContext);
  if (!ctx) {
    throw new Error('useViewportContext must be used inside <ViewportProvider>');
  }
  return ctx;
}
