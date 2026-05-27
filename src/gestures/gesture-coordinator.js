/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GESTURE COORDINATOR — iOS-Native Feel & Conflict Resolution
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single arbiter for all touch gestures in the messaging + overlay system.
 *
 * Design goals:
 *   - Prevent gesture conflicts (scroll vs drag vs swipe-back)
 *   - Lock gesture direction after small movement threshold
 *   - Respect iOS native gestures (swipe-back, system gestures)
 *   - Block lower-priority gestures when higher-priority ones are active
 *   - Zero synthetic delays, zero debounce on touchstart
 *
 * Priority hierarchy (highest first):
 *   1. SYSTEM     — iOS swipe-back, system gestures (never intercepted)
 *   2. NAVIGATION — Screen transitions, route changes
 *   3. OVERLAY    — BottomSheet drag, modal drag, overlay pan
 *   4. SCROLL     — Chat message list scroll
 *   5. DECORATIVE — Background animations, UI effects
 *
 * @module gesture-coordinator
 */

import { useRef, useCallback, useEffect } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

/** Pixel threshold to lock gesture direction */
const DIRECTION_LOCK_THRESHOLD = 10;

/** Time threshold to lock gesture direction (ms) */
const DIRECTION_LOCK_TIME_MS = 120;

/** Minimum velocity (px/ms) for a flick gesture */
const FLICK_VELOCITY_THRESHOLD = 0.5;

/** Horizontal angle threshold: beyond this, treat as horizontal swipe */
const HORIZONTAL_ANGLE_THRESHOLD = 30; // degrees from horizontal

/** Vertical angle threshold: beyond this, treat as vertical scroll */
const VERTICAL_ANGLE_THRESHOLD = 60; // degrees from horizontal

// ── Gesture priority enum ────────────────────────────────────────────────────

export const GesturePriority = {
  SYSTEM: 0,     // iOS native — never intercepted
  NAVIGATION: 1, // Route transitions
  OVERLAY: 2,    // BottomSheet, modals
  SCROLL: 3,     // Chat scroll
  DECORATIVE: 4, // Background effects
};

// ── Module-level gesture state (singleton across components) ─────────────────

let activeGestureOwner = null;
let activeGesturePriority = GesturePriority.DECORATIVE;
let gestureStartTime = 0;

/**
 * Request ownership of the current gesture stream.
 *
 * @param {string} ownerId — unique identifier for the gesture consumer
 * @param {number} priority — GesturePriority value
 * @returns {boolean} — true if ownership granted
 */
export function requestGestureOwnership(ownerId, priority) {
  // System gestures always win
  if (priority === GesturePriority.SYSTEM) return true;

  // If no active owner, grant immediately
  if (activeGestureOwner === null) {
    activeGestureOwner = ownerId;
    activeGesturePriority = priority;
    gestureStartTime = Date.now();
    return true;
  }

  // Same owner re-requesting (e.g., continued drag)
  if (activeGestureOwner === ownerId) return true;

  // Higher priority can preempt lower priority
  if (priority < activeGesturePriority) {
    activeGestureOwner = ownerId;
    activeGesturePriority = priority;
    gestureStartTime = Date.now();
    return true;
  }

  // Lower or equal priority cannot take over
  return false;
}

/**
 * Release gesture ownership.
 *
 * @param {string} ownerId
 */
export function releaseGestureOwnership(ownerId) {
  if (activeGestureOwner === ownerId) {
    activeGestureOwner = null;
    activeGesturePriority = GesturePriority.DECORATIVE;
  }
}

/**
 * Check if a gesture consumer currently owns the stream.
 *
 * @param {string} ownerId
 * @returns {boolean}
 */
export function hasGestureOwnership(ownerId) {
  return activeGestureOwner === ownerId;
}

/**
 * Check if any gesture is currently active at or above a priority level.
 *
 * @param {number} priority
 * @returns {boolean}
 */
export function isGestureActiveAtPriority(priority) {
  return activeGestureOwner !== null && activeGesturePriority <= priority;
}

/**
 * Force-reset gesture ownership (e.g., on route change, modal close).
 */
export function resetGestureOwnership() {
  activeGestureOwner = null;
  activeGesturePriority = GesturePriority.DECORATIVE;
}

// ── Direction detection ──────────────────────────────────────────────────────

/**
 * Determine gesture intent from initial movement vector.
 *
 * @param {number} dx — horizontal delta (px)
 * @param {number} dy — vertical delta (px)
 * @returns {'horizontal'|'vertical'|'ambiguous'}
 */
export function detectGestureDirection(dx, dy) {
  const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  // angle is 0° for right, 90° for down, 180° for left

  if (angle <= HORIZONTAL_ANGLE_THRESHOLD || angle >= 180 - HORIZONTAL_ANGLE_THRESHOLD) {
    return 'horizontal';
  }
  if (angle >= VERTICAL_ANGLE_THRESHOLD && angle <= 180 - VERTICAL_ANGLE_THRESHOLD) {
    return 'vertical';
  }
  return 'ambiguous';
}

/**
 * Compute velocity from delta and time.
 *
 * @param {number} delta — pixel delta
 * @param {number} dt — time delta (ms)
 * @returns {number} — velocity in px/ms
 */
export function computeVelocity(delta, dt) {
  if (dt <= 0) return 0;
  return Math.abs(delta) / dt;
}

// ── React hook: useGestureCoordinator ────────────────────────────────────────

/**
 * Hook that provides gesture arbitration for a component.
 *
 * Usage:
 *   const gestures = useGestureCoordinator('chat-scroll', GesturePriority.SCROLL);
 *   <div {...gestures.bindScrollContainer()} />
 *
 * @param {string} ownerId
 * @param {number} priority
 * @returns {{
 *   bindScrollContainer: () => Object,
 *   bindOverlayHandle: () => Object,
 *   isBlocked: boolean,
 * }}
 */
export function useGestureCoordinator(ownerId, priority) {
  const touchStartRef = useRef(null);
  const directionLockedRef = useRef(false);
  const isBlockedRef = useRef(false);

  const reset = useCallback(() => {
    touchStartRef.current = null;
    directionLockedRef.current = false;
    isBlockedRef.current = false;
    releaseGestureOwnership(ownerId);
  }, [ownerId]);

  // Auto-release on unmount
  useEffect(() => {
    return () => releaseGestureOwnership(ownerId);
  }, [ownerId]);

  /**
   * Bind props for a scroll container (chat message list).
   * Prevents scroll when a higher-priority gesture is active.
   */
  const bindScrollContainer = useCallback(() => {
    return {
      onTouchStart: (e) => {
        // Don't block if higher priority already owns
        if (isGestureActiveAtPriority(GesturePriority.SCROLL)) {
          isBlockedRef.current = true;
          return;
        }

        const t = e.touches[0];
        touchStartRef.current = {
          x: t.clientX,
          y: t.clientY,
          time: Date.now(),
        };
        directionLockedRef.current = false;
        isBlockedRef.current = false;

        // Attempt to claim ownership early
        requestGestureOwnership(ownerId, priority);
      },

      onTouchMove: (e) => {
        if (isBlockedRef.current) {
          // Still allow native scroll — just don't process custom logic
          return;
        }

        if (!touchStartRef.current) return;

        const t = e.touches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;
        const dt = Date.now() - touchStartRef.current.time;

        // Direction lock after threshold
        if (!directionLockedRef.current) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= DIRECTION_LOCK_THRESHOLD || dt >= DIRECTION_LOCK_TIME_MS) {
            directionLockedRef.current = true;
            const direction = detectGestureDirection(dx, dy);

            // If horizontal swipe detected, release ownership and let system handle it
            if (direction === 'horizontal') {
              releaseGestureOwnership(ownerId);
              isBlockedRef.current = true;
              return;
            }

            // If vertical, confirm ownership
            if (direction === 'vertical') {
              requestGestureOwnership(ownerId, priority);
            }
          }
        }
      },

      onTouchEnd: () => {
        reset();
      },

      onTouchCancel: () => {
        reset();
      },
    };
  }, [ownerId, priority, reset]);

  /**
   * Bind props for an overlay drag handle (BottomSheet handle).
   * Claims high priority and blocks scroll underneath.
   */
  const bindOverlayHandle = useCallback(() => {
    return {
      onTouchStart: (e) => {
        // Overlay always claims ownership on handle touch
        requestGestureOwnership(ownerId, priority);

        const t = e.touches[0];
        touchStartRef.current = {
          x: t.clientX,
          y: t.clientY,
          time: Date.now(),
        };
        directionLockedRef.current = false;
        isBlockedRef.current = false;
      },

      onTouchMove: (e) => {
        if (!hasGestureOwnership(ownerId)) return;

        if (!touchStartRef.current) return;

        const t = e.touches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const dy = t.clientY - touchStartRef.current.y;
        const dt = Date.now() - touchStartRef.current.time;

        if (!directionLockedRef.current) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= DIRECTION_LOCK_THRESHOLD || dt >= DIRECTION_LOCK_TIME_MS) {
            directionLockedRef.current = true;
            const direction = detectGestureDirection(dx, dy);

            // If clearly horizontal on overlay handle, release and let system swipe
            if (direction === 'horizontal') {
              releaseGestureOwnership(ownerId);
              isBlockedRef.current = true;
              return;
            }
          }
        }
      },

      onTouchEnd: () => {
        reset();
      },

      onTouchCancel: () => {
        reset();
      },
    };
  }, [ownerId, priority, reset]);

  return {
    bindScrollContainer,
    bindOverlayHandle,
    isBlocked: isBlockedRef.current,
  };
}

// ── CSS integration helpers ──────────────────────────────────────────────────

/**
 * CSS class string to apply to scroll containers for iOS-native feel.
 * These are passive styles — no JS required.
 */
export const NATIVE_SCROLL_CSS = [
  '-webkit-overflow-scrolling: touch',
  'overscroll-behavior-y: contain',
  'touch-action: pan-y',
].join('; ');

/**
 * CSS class string to apply to overlay handles.
 * Prevents scroll interference while allowing vertical drag.
 */
export const OVERLAY_HANDLE_CSS = [
  'touch-action: none',
  'user-select: none',
  '-webkit-user-select: none',
].join('; ');
