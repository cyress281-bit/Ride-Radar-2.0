/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCROLL AUTHORITY — Single Source of Truth for ALL Messaging Scroll Behavior
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * No component may scroll the message list except through this module.
 * No component may decide whether to scroll except through this module.
 *
 * Architecture:
 *   - ONE near-bottom threshold (shared constant)
 *   - ONE scroll decision engine (rules-based, ZERO DOM/virtualization awareness)
 *   - ONE scroll execution path (batched via rAF)
 *   - ONE user-scroll-state tracker (reactive, not ref-based)
 *   - ONE scroll runtime contract (unified: native OR virtual)
 *
 * The authority is a PURE DECISION ENGINE. It does not touch DOM elements,
 * virtualizer instances, or any platform-specific APIs. All scroll operations
 * are delegated to a ScrollRuntime, which is injected at registration time.
 *
 * Hard rules:
 *   - NEVER scroll during keyboard-opening / keyboard-closing
 *   - NEVER auto-scroll if user intentionally scrolled up
 *   - NEVER snap to bottom after keyboard close unless user was already there
 *   - ALWAYS defer scroll during transition, then re-evaluate policy before executing
 *
 * @module scroll-authority
 */

import { useRef, useCallback, useState, useEffect } from 'react';

// ── Shared constants ─────────────────────────────────────────────────────────

/** Pixel threshold for "near bottom" — single source of truth */
export const NEAR_BOTTOM_THRESHOLD = 120;

/** Debounce window for scroll events (ms) */
const SCROLL_EVENT_DEBOUNCE_MS = 0; // immediate — we read position synchronously

// ── Scroll decision engine (pure functions, no React, no DOM) ────────────────

/**
 * Determine if auto-scroll should be allowed.
 *
 * @param {Object} state
 * @param {string} state.layoutPhase
 * @param {boolean} state.isLayoutStable
 * @param {boolean} state.isNearBottom
 * @param {boolean} state.isUserScrolledUp
 * @param {boolean} state.isFromSelf
 * @returns {{ shouldScroll: boolean, reason: string }}
 */
export function shouldAutoScroll({
  layoutPhase,
  isLayoutStable,
  isNearBottom,
  isUserScrolledUp,
  isFromSelf,
}) {
  // Hard block: never scroll during keyboard transitions
  if (layoutPhase === 'keyboard-opening' || layoutPhase === 'keyboard-closing') {
    return { shouldScroll: false, reason: 'blocked:keyboard-transition' };
  }

  // Hard block: never scroll during resize
  if (layoutPhase === 'resizing') {
    return { shouldScroll: false, reason: 'blocked:resizing' };
  }

  // Hard block: layout must be stable or keyboard fully open
  if (!isLayoutStable && layoutPhase !== 'keyboard-open') {
    return { shouldScroll: false, reason: 'blocked:layout-unstable' };
  }

  // Allow scroll if message is from self (user just sent it).
  // This takes precedence over user-scroll-up because the user expects
  // to see their own message after sending.
  if (isFromSelf) {
    return { shouldScroll: true, reason: 'allowed:from-self' };
  }

  // User intent override: if user scrolled up, only scroll if they're back near bottom
  if (isUserScrolledUp && !isNearBottom) {
    return { shouldScroll: false, reason: 'blocked:user-scrolled-up' };
  }

  // Allow scroll if near bottom (actively following)
  if (isNearBottom) {
    return { shouldScroll: true, reason: 'allowed:near-bottom' };
  }

  // Default: don't scroll
  return { shouldScroll: false, reason: 'blocked:default' };
}

/**
 * Determine if a deferred scroll (previously blocked) should now execute.
 *
 * @param {Object} state — same shape as shouldAutoScroll
 * @returns {{ shouldScroll: boolean, reason: string }}
 */
export function shouldExecuteDeferred(state) {
  // Deferred scroll must re-evaluate ALL rules, including user intent.
  // This prevents snapping to bottom after keyboard close if user scrolled up.
  return shouldAutoScroll(state);
}

// ── Scroll execution layer (batched via rAF) ─────────────────────────────────

const scheduledScrolls = new Set();
let rafId = null;

function flushScheduledScrolls() {
  rafId = null;
  scheduledScrolls.forEach((fn) => {
    try {
      fn();
    } catch {
      // Safety: don't let one failed scroll break others
    }
  });
  scheduledScrolls.clear();
}

/**
 * Schedule a scroll action to run in the next animation frame.
 * Multiple calls in the same frame are deduplicated.
 *
 * @param {Function} fn — scroll action to execute
 */
export function scheduleScroll(fn) {
  scheduledScrolls.add(fn);
  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      // Double-rAF for iOS layout stability
      requestAnimationFrame(flushScheduledScrolls);
    });
  }
}

/**
 * Cancel any pending scheduled scrolls.
 */
export function cancelPendingScrolls() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  scheduledScrolls.clear();
}

// ── React hook: useScrollAuthority ───────────────────────────────────────────

/**
 * React hook that provides the complete scroll authority for a message list.
 *
 * This hook is a PURE DECISION ENGINE. It has ZERO awareness of DOM elements,
 * virtualizer APIs, or scroll implementation details. All physical scroll
 * operations are delegated to a ScrollRuntime that is registered via
 * registerRuntime().
 *
 * Usage:
 *   const authority = useScrollAuthority({ layoutPhase, isLayoutStable });
 *   authority.registerRuntime(runtime); // from useUnifiedScrollRuntime
 *   authority.onScroll(); // call from onScroll handler
 *   authority.onNewMessage({ isFromSelf }); // call when messages change
 *   authority.onLayoutStable(); // call when layout stabilizes
 *
 * @param {Object} params
 * @param {string} params.layoutPhase
 * @param {boolean} params.isLayoutStable
 * @returns {{
 *   registerRuntime: (runtime: ScrollRuntime) => void,
 *   onScroll: () => void,
 *   onNewMessage: (opts: { isFromSelf: boolean }) => void,
 *   onLayoutStable: () => void,
 *   scrollToBottom: (opts?: { behavior?: 'auto'|'smooth' }) => void,
 *   isNearBottom: () => boolean,
 *   isUserScrolledUp: boolean,
 *   pendingScroll: boolean,
 * }}
 */
export function useScrollAuthority({ layoutPhase, isLayoutStable }) {
  const runtimeRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [pendingScroll, setPendingScroll] = useState(false);
  const pendingScrollRef = useRef(false);
  const lastMessageFromSelfRef = useRef(false);

  /**
   * Register the scroll runtime. This is the ONLY way the authority
   * communicates with the physical scroll layer.
   *
   * @param {Object} runtime — ScrollRuntime instance (native or virtual)
   */
  const registerRuntime = useCallback((runtime) => {
    runtimeRef.current = runtime;
  }, []);

  const checkIsNearBottom = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return true;
    return rt.isNearBottom(NEAR_BOTTOM_THRESHOLD);
  }, []);

  // Track scroll position and user intent
  const onScroll = useCallback(() => {
    const near = checkIsNearBottom();
    const scrolledUp = !near;
    setIsUserScrolledUp(scrolledUp);

    // Cancel any pending auto-scrolls when user intentionally scrolls up.
    // This prevents a race where a scroll was scheduled before the user
    // scrolled up, and the rAF executes after the intent change.
    if (scrolledUp) {
      cancelPendingScrolls();
    }
  }, [checkIsNearBottom]);

  // Handle new message arrival
  const onNewMessage = useCallback(
    ({ isFromSelf }) => {
      lastMessageFromSelfRef.current = isFromSelf;
      const near = checkIsNearBottom();
      const decision = shouldAutoScroll({
        layoutPhase,
        isLayoutStable,
        isNearBottom: near,
        isUserScrolledUp: !near,
        isFromSelf,
      });

      if (decision.shouldScroll) {
        scheduleScroll(() => {
          const rt = runtimeRef.current;
          if (rt) rt.scrollToBottom('auto');
        });
      } else {
        // Defer: mark pending but do NOT scroll yet
        pendingScrollRef.current = true;
        setPendingScroll(true);

        // If layout is already stable, the onLayoutStable effect will never
        // fire (it only triggers on isLayoutStable changes). Re-evaluate
        // immediately so deferred scrolls don't get orphaned.
        if (isLayoutStable) {
          // Use a microtask to let any concurrent state updates settle
          Promise.resolve().then(() => {
            onLayoutStable();
          });
        }
      }
    },
    [layoutPhase, isLayoutStable, checkIsNearBottom, onLayoutStable]
  );

  // Handle layout stabilization — re-evaluate deferred scrolls
  const onLayoutStable = useCallback(() => {
    if (!pendingScrollRef.current) return;

    const near = checkIsNearBottom();
    const decision = shouldExecuteDeferred({
      layoutPhase,
      isLayoutStable,
      isNearBottom: near,
      isUserScrolledUp: !near,
      isFromSelf: lastMessageFromSelfRef.current,
    });

    pendingScrollRef.current = false;
    setPendingScroll(false);

    if (decision.shouldScroll) {
      scheduleScroll(() => {
        const rt = runtimeRef.current;
        if (rt) rt.scrollToBottom('auto');
      });
    }
    // If decision is false, scroll stays deferred (dropped)
  }, [layoutPhase, isLayoutStable, checkIsNearBottom]);

  // Manual scroll-to-bottom (user clicks button)
  const scrollToBottom = useCallback(({ behavior = 'auto' } = {}) => {
    setIsUserScrolledUp(false);
    const rt = runtimeRef.current;
    if (rt) {
      scheduleScroll(() => rt.scrollToBottom(behavior));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPendingScrolls();
    };
  }, []);

  return {
    registerRuntime,
    onScroll,
    onNewMessage,
    onLayoutStable,
    scrollToBottom,
    isNearBottom: checkIsNearBottom,
    isUserScrolledUp,
    pendingScroll,
  };
}
