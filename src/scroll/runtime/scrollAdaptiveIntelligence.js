/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCROLL ADAPTIVE INTELLIGENCE — Dynamic Scroll Intent Calibration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wraps a ScrollPredictionSmoother (or any ScrollRuntime) with adaptive
 * parameters that respond to real-time chat dynamics. This is the third
 * layer in the composable scroll stack:
 *
 *   baseRuntime → predictionSmoother → adaptiveIntelligence → authority
 *
 * The authority consumes the final runtime transparently — it has zero
 * awareness that adaptive calibration, predictive smoothing, or any
 * layering exists.
 *
 * Adaptive Behaviors:
 *   1. DYNAMIC LOOKAHEAD       — Scales with velocity magnitude and burst density
 *   2. DYNAMIC HYSTERESIS      — Expands during high activity, contracts when idle
 *   3. INTENT CONFIDENCE SCORE — [0,1] score quantifying scroll intent certainty
 *   4. ACTIVITY STATE MACHINE  — idle / active / burst / reading
 *
 * @module scrollAdaptiveIntelligence
 */

// ── Configuration ────────────────────────────────────────────────────────────

/** Base lookahead for position projection (ms) */
const BASE_LOOKAHEAD_MS = 120;

/** Maximum lookahead cap during high-velocity bursts (ms) */
const MAX_LOOKAHEAD_MS = 280;

/** Minimum lookahead floor for precision near bottom (ms) */
const MIN_LOOKAHEAD_MS = 60;

/** Base hysteresis enter threshold (px) */
const BASE_ENTER_THRESHOLD = 140;

/** Base hysteresis exit threshold (px) */
const BASE_EXIT_THRESHOLD = 220;

/** Maximum threshold expansion during high activity (px) */
const MAX_THRESHOLD_EXPAND = 100;

/** Velocity magnitude threshold for "active scrolling" (px/ms) */
const ACTIVE_SCROLL_VELOCITY = 0.4;

/** High velocity threshold for burst mode (px/ms) */
const HIGH_VELOCITY = 1.2;

/** Idle timeout: no scroll activity → return to idle state (ms) */
const IDLE_TIMEOUT_MS = 2000;

/** Burst decay: how fast burst activity level decays (per sample, 0-1) */
const BURST_DECAY = 0.92;

/** Burst accumulation: how fast burst activity grows per scroll-to-bottom call */
const BURST_ACCUMULATION = 0.35;

/** Cooldown influence weight on confidence */
const COOLDOWN_INFLUENCE_WEIGHT = 0.3;

/** Velocity consistency window size (samples) */
const VELOCITY_HISTORY_SIZE = 8;

/** EMA alpha for velocity consistency smoothing */
const CONSISTENCY_EMA_ALPHA = 0.25;

/** Minimum velocity magnitude to register as meaningful motion (px/ms).
 *  Must be strictly less than ACTIVE_SCROLL_VELOCITY. */
const VELOCITY_NOISE_FLOOR = 0.05;

/** Frame cache TTL — one animation frame (~60fps) */
const FRAME_TTL_MS = 16;

/** Minimum velocity change to invalidate frame cache (px/ms) */
const VELOCITY_CHANGE_EPSILON = 0.01;

/** Scroll event gating: minimum scrollTop delta to warrant forced recompute (px) */
const SCROLL_EPSILON = 1.0;

/** Scroll event gating: minimum velocity change to warrant forced recompute (px/ms) */
const SCROLL_VELOCITY_EPSILON = 0.02;

/** Scroll event gating: minimum burst level change to warrant forced recompute */
const SCROLL_BURST_EPSILON = 0.05;

// ── Activity state machine ───────────────────────────────────────────────────

const ActivityState = {
  IDLE: 'idle',
  ACTIVE: 'active',
  BURST: 'burst',
  READING: 'reading',
};

function createActivityStateMachine() {
  let state = ActivityState.IDLE;
  let lastActivityTime = 0;
  let burstLevel = 0;

  return {
    /**
     * Update activity state based on current dynamics.
     * @param {number} velocity — smoothed velocity magnitude (px/ms)
     * @param {boolean} isInCooldown — from smoother
     * @param {number} now — performance.now()
     * @returns {string} current ActivityState
     */
    update(velocity, isInCooldown, now) {
      const velocityMag = Math.abs(velocity);
      const timeSinceActivity = now - lastActivityTime;

      // Accumulate burst level from scroll-to-bottom calls (inferred from external feed)
      // Burst level decays naturally; callers bump it via recordBurst()
      burstLevel *= BURST_DECAY;

      // Determine next state
      let nextState = state;

      if (isInCooldown && velocityMag > ACTIVE_SCROLL_VELOCITY) {
        nextState = ActivityState.READING;
      } else if (burstLevel > 0.5 || velocityMag > HIGH_VELOCITY) {
        nextState = ActivityState.BURST;
      } else if (velocityMag > ACTIVE_SCROLL_VELOCITY || burstLevel > 0.15) {
        nextState = ActivityState.ACTIVE;
      } else if (timeSinceActivity > IDLE_TIMEOUT_MS) {
        nextState = ActivityState.IDLE;
      }

      // Only update activity timestamp on meaningful motion
      if (velocityMag > VELOCITY_NOISE_FLOOR) {
        lastActivityTime = now;
      }

      state = nextState;
      return state;
    },

    /** Record a scroll-to-bottom call as burst activity */
    recordBurst() {
      burstLevel = Math.min(1, burstLevel + BURST_ACCUMULATION);
      lastActivityTime = performance.now();
    },

    getState() {
      return state;
    },

    getBurstLevel() {
      return burstLevel;
    },

    reset() {
      state = ActivityState.IDLE;
      lastActivityTime = 0;
      burstLevel = 0;
    },
  };
}

// ── Velocity consistency tracker ─────────────────────────────────────────────

function createVelocityConsistencyTracker() {
  const history = [];
  let smoothedConsistency = 1;

  return {
    /**
     * Feed a velocity sample and compute directional consistency.
     * @param {number} velocity — signed velocity (px/ms)
     * @returns {number} consistency ∈ [0, 1], higher = more consistent direction
     */
    sample(velocity) {
      history.push(velocity);
      if (history.length > VELOCITY_HISTORY_SIZE) {
        history.shift();
      }

      if (history.length < 3) {
        smoothedConsistency = 1;
        return smoothedConsistency;
      }

      // Compute sign consistency: what fraction of samples share the majority sign
      const positiveCount = history.filter((v) => v > 0).length;
      const negativeCount = history.filter((v) => v < 0).length;
      const dominantCount = Math.max(positiveCount, negativeCount);
      const rawConsistency = dominantCount / history.length;

      // EMA smooth the consistency value itself
      smoothedConsistency =
        CONSISTENCY_EMA_ALPHA * rawConsistency +
        (1 - CONSISTENCY_EMA_ALPHA) * smoothedConsistency;

      return smoothedConsistency;
    },

    getConsistency() {
      return smoothedConsistency;
    },

    reset() {
      history.length = 0;
      smoothedConsistency = 1;
    },
  };
}

// ── Adaptive parameter engine ────────────────────────────────────────────────

function createAdaptiveParameterEngine() {
  return {
    /**
     * Compute dynamic lookahead based on velocity magnitude and burst level.
     * @param {number} velocityMag — |velocity| in px/ms
     * @param {number} burstLevel — 0 to 1
     * @param {string} activityState — current ActivityState
     * @returns {number} lookahead in ms
     */
    computeLookahead(velocityMag, burstLevel, activityState) {
      let lookahead = BASE_LOOKAHEAD_MS;

      // Scale with velocity: faster scrolling needs more lookahead
      // to predict where the user will land
      const velocityFactor = Math.min(velocityMag / HIGH_VELOCITY, 1);
      lookahead += velocityFactor * (MAX_LOOKAHEAD_MS - BASE_LOOKAHEAD_MS);

      // Burst activity extends lookahead to absorb rapid content changes
      const burstFactor = burstLevel * burstLevel; // quadratic for stronger effect
      lookahead += burstFactor * (MAX_LOOKAHEAD_MS - BASE_LOOKAHEAD_MS) * 0.5;

      // Reading state: reduce lookahead for precision (user is stationary)
      if (activityState === ActivityState.READING) {
        lookahead *= 0.6;
      }

      // Idle state: minimal lookahead, user isn't interacting
      if (activityState === ActivityState.IDLE) {
        lookahead *= 0.5;
      }

      return Math.max(MIN_LOOKAHEAD_MS, Math.min(MAX_LOOKAHEAD_MS, lookahead));
    },

    /**
     * Compute dynamic hysteresis thresholds based on activity level.
     * @param {number} burstLevel — 0 to 1
     * @param {number} velocityMag — |velocity| in px/ms
     * @param {string} activityState — current ActivityState
     * @returns {{ enter: number, exit: number }}
     */
    computeThresholds(burstLevel, velocityMag, activityState) {
      let expansion = 0;

      // Burst activity expands thresholds to prevent premature exit
      expansion += burstLevel * MAX_THRESHOLD_EXPAND;

      // Active scrolling also expands — user is in motion, be forgiving
      if (velocityMag > ACTIVE_SCROLL_VELOCITY) {
        expansion += (velocityMag / HIGH_VELOCITY) * MAX_THRESHOLD_EXPAND * 0.5;
      }

      // Reading state: tighten thresholds — user is stationary, precision matters
      if (activityState === ActivityState.READING) {
        expansion *= 0.3;
      }

      // Idle: contract to base for snappy re-engagement
      if (activityState === ActivityState.IDLE) {
        expansion = 0;
      }

      expansion = Math.min(MAX_THRESHOLD_EXPAND, expansion);

      return {
        enter: BASE_ENTER_THRESHOLD + expansion,
        exit: BASE_EXIT_THRESHOLD + expansion,
      };
    },
  };
}

// ── Intent confidence calculator ─────────────────────────────────────────────

function createConfidenceCalculator() {
  return {
    /**
     * Compute scroll intent confidence ∈ [0, 1].
     *
     * Higher confidence = more certain the user wants to follow the bottom.
     * Lower confidence = user may be reading history or disengaged.
     *
     * @param {Object} params
     * @param {number} params.velocityConsistency — [0, 1]
     * @param {number} params.timeSinceCooldown — ms since cooldown ended, or 0 if active
     * @param {number} params.cooldownRemaining — ms remaining in cooldown, or 0
     * @param {number} params.projectedDistance — projected distance from bottom (px)
     * @param {number} params.actualDistance — actual distance from bottom (px)
     * @param {number} params.burstLevel — 0 to 1
     * @param {string} params.activityState — ActivityState
     * @returns {number} confidence ∈ [0, 1]
     */
    compute({
      velocityConsistency,
      timeSinceCooldown,
      cooldownRemaining,
      projectedDistance,
      actualDistance,
      burstLevel,
      activityState,
    }) {
      // Start neutral
      let confidence = 0.5;

      // ── Factor 1: Velocity direction consistency ──
      // Consistent downward scrolling = high confidence user is following
      // Mixed direction = low confidence (exploring, not following)
      confidence += (velocityConsistency - 0.5) * 0.25;

      // ── Factor 2: Cooldown state ──
      if (cooldownRemaining > 0) {
        // Active cooldown strongly suppresses confidence
        const cooldownRatio = Math.min(1, cooldownRemaining / 600);
        confidence -= cooldownRatio * COOLDOWN_INFLUENCE_WEIGHT;
      } else if (timeSinceCooldown > 0) {
        // Time since cooldown ended: gradual recovery
        const recovery = Math.min(1, timeSinceCooldown / 1500);
        confidence += recovery * 0.15;
      }

      // ── Factor 3: Distance from bottom ──
      // Use the MORE conservative of projected and actual distance
      const conservativeDistance = Math.max(projectedDistance, actualDistance);
      const enterRatio = conservativeDistance / BASE_ENTER_THRESHOLD;
      if (enterRatio < 1) {
        // Within enter threshold: strong confidence
        confidence += (1 - enterRatio) * 0.25;
      } else if (enterRatio < 2) {
        // Between enter and 2x enter: moderate confidence decay
        confidence -= (enterRatio - 1) * 0.15;
      } else {
        // Far from bottom: very low confidence
        confidence -= 0.3;
      }

      // ── Factor 4: Burst activity ──
      // High burst can either increase confidence (if near bottom = engaged)
      // or decrease it (if far from bottom = overwhelmed)
      if (conservativeDistance < BASE_ENTER_THRESHOLD) {
        confidence += burstLevel * 0.1;
      } else {
        confidence -= burstLevel * 0.15;
      }

      // ── Factor 5: Activity state modifiers ──
      switch (activityState) {
        case ActivityState.IDLE:
          // Idle user: if near bottom, assume they want to follow
          // If far, they walked away
          if (conservativeDistance < BASE_ENTER_THRESHOLD) {
            confidence += 0.1;
          } else {
            confidence -= 0.15;
          }
          break;
        case ActivityState.READING:
          // Reading = intentionally not at bottom, suppress confidence
          confidence -= 0.2;
          break;
        case ActivityState.BURST:
          // Burst mode: high activity, trust hysteresis more than confidence
          confidence = confidence * 0.9 + 0.05;
          break;
        case ActivityState.ACTIVE:
          // Active but not burst: moderate, let velocity guide
          break;
      }

      // Clamp to valid range
      return Math.max(0, Math.min(1, confidence));
    },
  };
}

// ── Scroll Adaptive Intelligence ─────────────────────────────────────────────

/**
 * Wrap a ScrollRuntime (typically already wrapped by ScrollPredictionSmoother)
 * with adaptive parameter calibration.
 *
 * Returns a new ScrollRuntime with the IDENTICAL contract, plus two
 * introspection methods: getScrollConfidence() and getAdaptiveDebugState().
 *
 * @param {Object} runtime — base runtime (smoothed or raw)
 * @returns {Object} adaptive ScrollRuntime
 */
export function createScrollAdaptiveIntelligence(runtime) {
  const activity = createActivityStateMachine();
  const consistencyTracker = createVelocityConsistencyTracker();
  const paramEngine = createAdaptiveParameterEngine();
  const confidenceCalc = createConfidenceCalculator();

  let unsubscribeScroll = null;
  let disposed = false;
  let lastConfidence = 0.5;
  let lastCooldownEndTime = 0;

  // Track scroll-to-bottom calls to infer message arrival bursts
  let lastScrollToBottomTime = 0;
  let scrollToBottomFrequency = 0;

  // Hysteresis state for near-bottom (isolated in closure, not on object)
  let nearBottomState = false;

  // ── Frame cache for deduplicated computation ──
  let cachedFrame = null;
  let cachedFrameTime = 0;

  // Dirty detection snapshot — frozen copy of inputs that produced cachedFrame
  let cachedSnapshot = null;

  // Dev-only perf counter (not exposed externally)
  let frameRecomputeCount = 0;

  // ── Hot path instrumentation (dev-only) ──
  let hotPathMetrics = {
    recompute: 0,
    cacheHit: 0,
    runtimeCalls: 0,
    allocations: 0,
  };

  // ── Internal: read velocity from smoother if available, else estimate ──

  function getVelocity() {
    // If wrapping a smoother, read its velocity directly
    if (runtime.getSmoothedVelocity) {
      return runtime.getSmoothedVelocity();
    }
    // Otherwise we don't have velocity — return 0 (conservative)
    return 0;
  }

  function isInCooldown() {
    if (runtime.isInCooldown) {
      return runtime.isInCooldown();
    }
    return false;
  }

  // ── Internal: compute all adaptive parameters for current frame ──

  function computeFrame(force = false) {
    const now = performance.now();

    // ── Cache hit check ──
    if (!force && cachedFrame && cachedSnapshot) {
      const age = now - cachedFrameTime;
      if (age < FRAME_TTL_MS) {
        // Within TTL — read runtime ONCE for dirty detection
        const scrollTop = runtime.getScrollTop();
        const velocity = getVelocity();
        const inCooldown = isInCooldown();
        const burstLevel = runtime.pendingBurstCount
          ? runtime.pendingBurstCount() / 4
          : 0;

        const scrollTopChanged = scrollTop !== cachedSnapshot.scrollTop;
        const velocityChanged = Math.abs(velocity - cachedSnapshot.velocity) > VELOCITY_CHANGE_EPSILON;
        const cooldownChanged = inCooldown !== cachedSnapshot.inCooldown;
        const burstChanged = Math.abs(burstLevel - cachedSnapshot.burstLevel) > 0.02;

        if (!scrollTopChanged && !velocityChanged && !cooldownChanged && !burstChanged) {
          // All inputs stable — return cached frame unchanged
          hotPathMetrics.cacheHit++;
          return cachedFrame;
        }
      }
      // TTL expired or inputs changed — fall through to recompute
    }

    // ── Cache miss — full recompute with single snapshot ──
    frameRecomputeCount++;
    hotPathMetrics.recompute++;

    // Capture ALL runtime state in ONE snapshot. No runtime reads after this point.
    hotPathMetrics.runtimeCalls += 5;

    const scrollTop = runtime.getScrollTop();
    const scrollHeight = runtime.getScrollHeight();
    const clientHeight = runtime.getClientHeight();
    const velocity = getVelocity();
    const inCooldown = isInCooldown();

    if (runtime.pendingBurstCount) hotPathMetrics.runtimeCalls++;

    const burstLevel = runtime.pendingBurstCount ? runtime.pendingBurstCount() / 4 : 0;

    // Guard against invalid runtime values (e.g., uninitialized virtualizer)
    const safeScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
    const safeScrollHeight = Number.isFinite(scrollHeight) ? scrollHeight : 0;
    const safeClientHeight = Number.isFinite(clientHeight) ? clientHeight : 0;

    hotPathMetrics.allocations++; // snapshot object

    const snapshot = Object.freeze({
      scrollTop: safeScrollTop,
      scrollHeight: safeScrollHeight,
      clientHeight: safeClientHeight,
      velocity,
      velocityMag: Math.abs(velocity),
      inCooldown,
      burstLevel,
      timestamp: now,
    });

    // ── All subsequent logic uses snapshot ONLY ──

    // Update activity state machine
    const activityState = activity.update(snapshot.velocity, snapshot.inCooldown, now);

    // Update velocity consistency
    const velocityConsistency = consistencyTracker.sample(snapshot.velocity);

    // Compute adaptive lookahead
    const lookaheadMs = paramEngine.computeLookahead(
      snapshot.velocityMag,
      snapshot.burstLevel,
      activityState
    );

    // Compute adaptive thresholds
    const thresholds = paramEngine.computeThresholds(
      snapshot.burstLevel,
      snapshot.velocityMag,
      activityState
    );

    // Compute distances from snapshot
    const actualDistance = Math.max(
      0,
      snapshot.scrollHeight - snapshot.scrollTop - snapshot.clientHeight
    );
    const projectedDistance = Math.max(
      0,
      actualDistance - snapshot.velocity * lookaheadMs
    );

    // Track cooldown end for confidence recovery
    if (!snapshot.inCooldown && lastConfidence < 0.3) {
      lastCooldownEndTime = now;
    }
    const timeSinceCooldown = snapshot.inCooldown ? 0 : now - lastCooldownEndTime;

    // Estimate cooldown remaining
    const cooldownRemaining = snapshot.inCooldown ? 600 : 0;

    // Compute confidence
    const confidence = confidenceCalc.compute({
      velocityConsistency,
      timeSinceCooldown,
      cooldownRemaining: Math.max(0, cooldownRemaining),
      projectedDistance,
      actualDistance,
      burstLevel: snapshot.burstLevel,
      activityState,
    });

    // Final NaN guard
    const safeConfidence = Number.isFinite(confidence) ? confidence : 0.5;
    lastConfidence = safeConfidence;

    // Store snapshot for next frame's dirty detection
    cachedSnapshot = snapshot;

    hotPathMetrics.allocations++; // frame object

    // Build and cache frame
    const frame = {
      activityState,
      velocity: snapshot.velocity,
      velocityMag: snapshot.velocityMag,
      velocityConsistency,
      burstLevel: snapshot.burstLevel,
      lookaheadMs,
      thresholds,
      actualDistance,
      projectedDistance,
      confidence: safeConfidence,
      inCooldown: snapshot.inCooldown,
      timeSinceCooldown,
      scrollToBottomFrequency,
      snapshot,
    };

    cachedFrame = frame;
    cachedFrameTime = now;

    return frame;
  }

  // ── Scroll event gating state ──
  let lastGatedScrollTop = -1;
  let lastGatedVelocity = 0;
  let lastGatedBurstLevel = 0;

  // ── Start listening to scroll events for continuous adaptation ──

  unsubscribeScroll = runtime.onScroll(() => {
    if (disposed) return;

    const scrollTop = runtime.getScrollTop();
    const velocity = getVelocity();
    const burstLevel = runtime.pendingBurstCount
      ? runtime.pendingBurstCount() / 4
      : 0;

    // ── Pre-recompute gating layer ──
    // Skip forced recomputes when scroll deltas are below meaningful
    // change thresholds. Mobile touch input fires 60-120 events/sec;
    // many are sub-pixel jitter that don't affect scroll decisions.
    const scrollDelta = Math.abs(scrollTop - lastGatedScrollTop);
    const velocityDelta = Math.abs(velocity - lastGatedVelocity);
    const burstDelta = Math.abs(burstLevel - lastGatedBurstLevel);

    const shouldSkip =
      scrollDelta < SCROLL_EPSILON &&
      velocityDelta < SCROLL_VELOCITY_EPSILON &&
      burstDelta < SCROLL_BURST_EPSILON;

    if (shouldSkip) {
      // No meaningful change — reuse cached frame. Subsequent callers
      // (isNearBottom, getScrollConfidence) still hit cache.
      return;
    }

    // Meaningful change detected — update gate state and recompute
    lastGatedScrollTop = scrollTop;
    lastGatedVelocity = velocity;
    lastGatedBurstLevel = burstLevel;

    computeFrame(/* force */ true);
  });

  // ── Wrapped runtime API ──

  const adaptiveRuntime = {
    getScrollTop: () => runtime.getScrollTop(),

    getScrollHeight: () => runtime.getScrollHeight(),

    getClientHeight: () => runtime.getClientHeight(),

    scrollToBottom: (behavior = 'auto') => {
      if (disposed) return;

      // Record burst activity from this scroll-to-bottom call
      activity.recordBurst();
      lastScrollToBottomTime = performance.now();

      // Update frequency tracker (scrolls per second, rough)
      scrollToBottomFrequency =
        scrollToBottomFrequency * 0.7 + 0.3;

      // Delegate to underlying runtime (which may be the smoother)
      runtime.scrollToBottom(behavior);
    },

    /**
     * Adaptive near-bottom detection with dynamic thresholds and projection.
     *
     * The authority calls this to decide auto-scroll eligibility. We return
     * a smoothed, adaptive decision that accounts for:
     *   - Current activity level (idle/active/burst/reading)
     *   - Velocity magnitude and consistency
     *   - Burst density from message arrivals
     *   - Confidence score (used as a soft gate)
     */
    isNearBottom: (_threshold) => {
      if (disposed) return true;

      const frame = computeFrame();

      // If confidence is very low, override to false regardless of position
      // This prevents auto-scroll when user is clearly disengaged or reading
      if (frame.confidence < 0.15) {
        return false;
      }

      // Use adaptive thresholds for hysteresis
      const distance = frame.projectedDistance;

      if (nearBottomState) {
        // Currently near bottom — only exit if we exceed adaptive exit threshold
        if (distance > frame.thresholds.exit) {
          nearBottomState = false;
        }
      } else {
        // Currently not near bottom — only enter if we cross below adaptive enter threshold
        if (distance < frame.thresholds.enter) {
          nearBottomState = true;
        }
      }

      // Also force-enter if confidence is very high and we're reasonably close
      if (!nearBottomState && frame.confidence > 0.85 && distance < frame.thresholds.enter * 1.3) {
        nearBottomState = true;
      }

      return nearBottomState;
    },

    onScroll: (handler) => {
      const wrappedHandler = (evt) => {
        if (disposed) return;
        // Scroll event forces recompute; cache serves subsequent callers
        computeFrame(/* force */ true);
        handler(evt);
      };

      const unsub = runtime.onScroll(wrappedHandler);
      return () => {
        unsub();
      };
    },

    // ── Adaptive-specific introspection ──

    /**
     * Get the current scroll intent confidence score ∈ [0, 1].
     *
     * 0.0 = user is definitely not following (reading history, scrolled up)
     * 0.5 = uncertain / neutral
     * 1.0 = user is definitely following the bottom
     */
    getScrollConfidence: () => {
      // Refresh frame before returning
      computeFrame();
      return lastConfidence;
    },

    /**
     * Get complete adaptive debug state for telemetry / dev tools.
     * @returns {Object}
     */
    getAdaptiveDebugState: () => {
      const frame = computeFrame();
      return {
        confidence: frame.confidence,
        activityState: frame.activityState,
        velocity: {
          raw: frame.velocity,
          magnitude: frame.velocityMag,
          consistency: frame.velocityConsistency,
        },
        lookaheadMs: frame.lookaheadMs,
        thresholds: frame.thresholds,
        distances: {
          actual: frame.actualDistance,
          projected: frame.projectedDistance,
        },
        burst: {
          level: frame.burstLevel,
          frequency: frame.scrollToBottomFrequency,
        },
        cooldown: {
          active: frame.inCooldown,
          timeSinceEnd: frame.timeSinceCooldown,
        },
        nearBottomState: nearBottomState,
        // Dev-only perf counters
        _frameRecomputeCount: frameRecomputeCount,
        _hotPathMetrics: hotPathMetrics,
      };
    },

    // ── Lifecycle ──

    /** Reset all internal adaptive state */
    reset: () => {
      activity.reset();
      consistencyTracker.reset();
      lastConfidence = 0.5;
      lastCooldownEndTime = 0;
      lastScrollToBottomTime = 0;
      scrollToBottomFrequency = 0;
      nearBottomState = false;
      // Clear frame cache
      cachedFrame = null;
      cachedFrameTime = 0;
      cachedSnapshot = null;
      frameRecomputeCount = 0;
      hotPathMetrics.recompute = 0;
      hotPathMetrics.cacheHit = 0;
      hotPathMetrics.runtimeCalls = 0;
      hotPathMetrics.allocations = 0;
      lastGatedScrollTop = -1;
      lastGatedVelocity = 0;
      lastGatedBurstLevel = 0;
      if (runtime.reset) runtime.reset();
    },

    /** Dispose: clean up listeners and state */
    dispose: () => {
      disposed = true;
      if (unsubscribeScroll) {
        unsubscribeScroll();
        unsubscribeScroll = null;
      }
      if (runtime.dispose) runtime.dispose();
    },
  };

  return adaptiveRuntime;
}
