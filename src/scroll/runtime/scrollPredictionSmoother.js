/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCROLL PREDICTION SMOOTHER — Frame-Level Scroll Intent Stabilization
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wraps a ScrollRuntime with predictive physics that stabilizes auto-scroll
 * decisions BEFORE they reach the authority. Eliminates jitter from:
 *   - Rapid message bursts
 *   - Momentary scroll position fluctuations
 *   - Borderline near-bottom flicker
 *   - Velocity noise from touch momentum
 *
 * Architecture:
 *   - Consumes a ScrollRuntime (native or virtual — identical contract)
 *   - Returns a ScrollRuntime with the SAME contract
 *   - Authority is unaware smoothing exists
 *   - Physical scrolls go through the smoother's predictive filter
 *
 * Smoothing Strategy:
 *   1. VELOCITY ESTIMATION   — EMA-filtered scroll velocity from frame deltas
 *   2. POSITION PROJECTION   — Predict scrollTop at lookahead horizon
 *   3. HYSTERESIS GATES      — Separate enter/exit thresholds prevent flip-flop
 *   4. INTENT COOLDOWN       — Brief lock after user scroll-up to prevent snap-back
 *   5. BURST COALESCING      — Rapid messages collapse into single scroll decision
 *
 * @module scrollPredictionSmoother
 */

// ── Configuration ────────────────────────────────────────────────────────────

/** Hysteresis: enter near-bottom zone (tighter — closer to bottom) */
const NEAR_BOTTOM_ENTER_THRESHOLD = 140;

/** Hysteresis: exit near-bottom zone (looser — further from bottom) */
const NEAR_BOTTOM_EXIT_THRESHOLD = 220;

/** Velocity smoothing factor (EMA alpha). Higher = more responsive. */
const VELOCITY_EMA_ALPHA = 0.3;

/** Lookahead window for position projection (ms) */
const LOOKAHEAD_MS = 120;

/** Minimum velocity to consider directional (px/ms) — filters noise */
const VELOCITY_NOISE_FLOOR = 0.05;

/** Cooldown after user scroll-up before auto-scroll can re-enable (ms) */
const USER_SCROLL_UP_COOLDOWN_MS = 600;

/** Burst window: messages arriving within this window coalesce (ms) */
const BURST_WINDOW_MS = 80;

/** Maximum burst queue size — safety valve */
const MAX_BURST_QUEUE = 8;

// ── Frame-level velocity estimator ───────────────────────────────────────────

function createVelocityEstimator() {
  let lastScrollTop = 0;
  let lastTime = 0;
  let smoothedVelocity = 0;
  let hasSample = false;

  return {
    /**
     * Feed a new scroll position sample.
     * @param {number} scrollTop
     * @param {number} now — performance.now()
     * @returns {number} smoothed velocity (px/ms, positive = downward)
     */
    sample(scrollTop, now) {
      if (!hasSample) {
        lastScrollTop = scrollTop;
        lastTime = now;
        hasSample = true;
        return 0;
      }

      const deltaTime = now - lastTime;
      if (deltaTime < 1) return smoothedVelocity; // Avoid division by near-zero

      const rawVelocity = (scrollTop - lastScrollTop) / deltaTime;

      // EMA smoothing
      smoothedVelocity =
        VELOCITY_EMA_ALPHA * rawVelocity +
        (1 - VELOCITY_EMA_ALPHA) * smoothedVelocity;

      // Noise floor: zero out tiny velocities to prevent drift
      if (Math.abs(smoothedVelocity) < VELOCITY_NOISE_FLOOR) {
        smoothedVelocity = 0;
      }

      lastScrollTop = scrollTop;
      lastTime = now;
      return smoothedVelocity;
    },

    reset() {
      hasSample = false;
      smoothedVelocity = 0;
    },

    getVelocity() {
      return smoothedVelocity;
    },
  };
}

// ── Hysteresis gate ──────────────────────────────────────────────────────────

function createHysteresisGate(enterThreshold, exitThreshold) {
  let state = false; // false = not near bottom, true = near bottom

  return {
    /**
     * Update hysteresis state with a new distance-from-bottom value.
     * @param {number} distance — pixels from bottom (smaller = closer)
     * @returns {boolean} current gated state
     */
    update(distance) {
      if (state) {
        // Currently near bottom — only exit if we exceed exit threshold
        if (distance > exitThreshold) {
          state = false;
        }
      } else {
        // Currently not near bottom — only enter if we cross below enter threshold
        if (distance < enterThreshold) {
          state = true;
        }
      }
      return state;
    },

    getState() {
      return state;
    },

    reset() {
      state = false;
    },
  };
}

// ── Burst coalescer ──────────────────────────────────────────────────────────

function createBurstCoalescer() {
  let queue = [];
  let timer = null;
  let lastFlushTime = 0;

  return {
    /**
     * Enqueue a scroll request. Returns true if this request should execute
     * immediately, false if it's being held for coalescing.
     *
     * @param {number} now — performance.now()
     * @returns {{ shouldExecute: boolean, flushCount: number }}
     */
    enqueue(now) {
      queue.push(now);

      // Safety: if queue is backing up, force a flush
      if (queue.length >= MAX_BURST_QUEUE) {
        const count = queue.length;
        queue = [];
        lastFlushTime = now;
        return { shouldExecute: true, flushCount: count };
      }

      // If this is the first in a potential burst, start the window timer
      if (queue.length === 1) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          // Timer fires after burst window — queue will be cleared on next enqueue
          // or by the actual scroll execution path
        }, BURST_WINDOW_MS);

        // First message in burst executes immediately (low latency)
        lastFlushTime = now;
        return { shouldExecute: true, flushCount: 1 };
      }

      // Subsequent messages within burst window — hold them
      return { shouldExecute: false, flushCount: 0 };
    },

    /**
     * Call after executing a scroll to clear the burst queue.
     * @param {number} now — performance.now()
     */
    flush(now) {
      const count = queue.length;
      queue = [];
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastFlushTime = now;
      return count;
    },

    /**
     * Peek at pending burst count without clearing.
     */
    pendingCount() {
      return queue.length;
    },

    reset() {
      queue = [];
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

// ── Scroll Prediction Smoother ───────────────────────────────────────────────

/**
 * Wrap a ScrollRuntime with predictive smoothing.
 *
 * Returns a new ScrollRuntime with the IDENTICAL contract. The authority
 * consumes this transparently — it has no idea smoothing is happening.
 *
 * @param {Object} runtime — base ScrollRuntime (native or virtual)
 * @returns {Object} smoothed ScrollRuntime
 */
export function createScrollPredictionSmoother(runtime) {
  const velocity = createVelocityEstimator();
  const hysteresis = createHysteresisGate(
    NEAR_BOTTOM_ENTER_THRESHOLD,
    NEAR_BOTTOM_EXIT_THRESHOLD
  );
  const burst = createBurstCoalescer();

  let userScrollUpTime = 0;
  let isInCooldown = false;
  let unsubscribeScroll = null;
  let disposed = false;

  // ── Internal: sample frame and update physics ──

  function sampleFrame() {
    if (disposed) return;
    const scrollTop = runtime.getScrollTop();
    const now = performance.now();
    velocity.sample(scrollTop, now);
  }

  // ── Internal: compute smoothed near-bottom ──

  function computeSmoothedNearBottom() {
    const scrollTop = runtime.getScrollTop();
    const scrollHeight = runtime.getScrollHeight();
    const clientHeight = runtime.getClientHeight();

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Project position forward by lookahead
    const v = velocity.getVelocity();
    const projectedDistance = distanceFromBottom - v * LOOKAHEAD_MS;

    // Use projected distance for hysteresis (predictive)
    return hysteresis.update(projectedDistance);
  }

  // ── Internal: check cooldown ──

  function checkCooldown() {
    if (!isInCooldown) return false;
    const now = performance.now();
    if (now - userScrollUpTime > USER_SCROLL_UP_COOLDOWN_MS) {
      isInCooldown = false;
      return false;
    }
    return true;
  }

  // ── Internal: enter cooldown ──

  function enterCooldown() {
    userScrollUpTime = performance.now();
    isInCooldown = true;
  }

  // ── Start listening to scroll events for velocity tracking ──

  unsubscribeScroll = runtime.onScroll(() => {
    if (disposed) return;

    const scrollTop = runtime.getScrollTop();
    const now = performance.now();
    const v = velocity.sample(scrollTop, now);

    // Detect user scroll-up (negative velocity = scrolling up)
    // Only trigger cooldown on meaningful upward velocity
    if (v < -0.3) {
      enterCooldown();
    }
  });

  // ── Wrapped runtime API ──

  const smoothedRuntime = {
    getScrollTop: () => runtime.getScrollTop(),

    getScrollHeight: () => runtime.getScrollHeight(),

    getClientHeight: () => runtime.getClientHeight(),

    scrollToBottom: (behavior = 'auto') => {
      if (disposed) return;

      // Burst coalescing: rapid successive calls collapse into one
      const now = performance.now();
      const burstDecision = burst.enqueue(now);

      if (!burstDecision.shouldExecute) {
        return;
      }

      // Execute the scroll (single scroll for the whole burst)
      burst.flush(now);
      runtime.scrollToBottom(behavior);
    },

    /**
     * Hysteresis-based near-bottom with predictive projection.
     *
     * This is the critical method — the authority calls this to decide
     * whether to auto-scroll. The smoother adds prediction + hysteresis
     * so the decision is stable, not jittery.
     */
    isNearBottom: (_threshold) => {
      if (disposed) return true;

      // Sample current frame for velocity
      sampleFrame();

      // Check cooldown first
      if (checkCooldown()) {
        // During cooldown, use the raw runtime value (conservative)
        // but still apply hysteresis so we don't flip-flop
        const scrollTop = runtime.getScrollTop();
        const scrollHeight = runtime.getScrollHeight();
        const clientHeight = runtime.getClientHeight();
        const distance = scrollHeight - scrollTop - clientHeight;
        return hysteresis.update(distance);
      }

      // Normal path: predictive hysteresis
      return computeSmoothedNearBottom();
    },

    onScroll: (handler) => {
      // Wrap handler so callers still get scroll events,
      // but we also maintain our internal velocity tracking
      const wrappedHandler = (evt) => {
        if (disposed) return;
        // Update physics before notifying consumer
        const scrollTop = runtime.getScrollTop();
        velocity.sample(scrollTop, performance.now());
        handler(evt);
      };

      const unsub = runtime.onScroll(wrappedHandler);
      return () => {
        unsub();
      };
    },

    // ── Smoother-specific introspection (not part of ScrollRuntime contract) ──

    /** @returns {number} current smoothed velocity (px/ms) */
    getSmoothedVelocity: () => velocity.getVelocity(),

    /** @returns {boolean} whether user-scroll-up cooldown is active */
    isInCooldown: () => isInCooldown,

    /** @returns {number} pending burst count */
    pendingBurstCount: () => burst.pendingCount(),

    /** Reset all internal state (e.g., on conversation switch) */
    reset: () => {
      velocity.reset();
      hysteresis.reset();
      burst.reset();
      isInCooldown = false;
      userScrollUpTime = 0;
    },

    /** Dispose: clean up listeners */
    dispose: () => {
      disposed = true;
      if (unsubscribeScroll) {
        unsubscribeScroll();
        unsubscribeScroll = null;
      }
      burst.reset();
    },
  };

  return smoothedRuntime;
}
