/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAYOUT TELEMETRY — Production-safe iOS keyboard + layout instrumentation
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Opt-in via: window.__RR_LAYOUT_TELEMETRY = true
 *
 * Design constraints:
 *   - ZERO impact when disabled (all functions are no-ops)
 *   - NO re-renders triggered
 *   - NO layout behavior changes
 *   - Uses existing transition buffer from use-layout-machine
 *   - Buffers in memory; does not auto-upload anywhere
 *
 * Event types:
 *   - layout_transition : phase changes (keyboard-opening, closing, etc.)
 *   - keyboard_event    : height anomalies, rapid oscillation
 *   - scroll_event      : scroll during unstable layout, blocked auto-scroll
 *
 * Usage in Safari DevTools:
 *   > window.__RR_LAYOUT_TELEMETRY = true
 *   > window.__RR_TELEMETRY_LOGS
 *   > window.__RR_TELEMETRY_SUMMARY()
 *
 * @module layout-telemetry
 */

/** @type {Array<{type: string, timestamp: number, [key: string]: any}>} */
const inMemoryBuffer = [];

const MAX_BUFFER_SIZE = 200;

/**
 * Check if telemetry is enabled. Reads the flag fresh each time so it can
 * be toggled at runtime without reload.
 */
function isEnabled() {
  return typeof window !== 'undefined' && window.__RR_LAYOUT_TELEMETRY === true;
}

/**
 * Push a telemetry event to the in-memory buffer.
 * Silently drops if buffer is full or telemetry is disabled.
 *
 * @param {string} type
 * @param {Object} [payload]
 */
function pushEvent(type, payload = {}) {
  if (!isEnabled()) return;
  if (inMemoryBuffer.length >= MAX_BUFFER_SIZE) {
    inMemoryBuffer.shift(); // drop oldest
  }
  inMemoryBuffer.push({
    type,
    timestamp: Date.now(),
    ...payload,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a layout phase transition.
 *
 * @param {string} from
 * @param {string} to
 * @param {number} viewportHeight
 * @param {number} keyboardHeight
 * @param {number} delta
 */
export function telemetryTransition(from, to, viewportHeight, keyboardHeight, delta) {
  pushEvent('layout_transition', {
    phase: to,
    from,
    viewportHeight,
    keyboardHeight,
    delta,
  });
}

/**
 * Record a keyboard height anomaly.
 *
 * @param {string} subtype — 'oscillation' | 'sudden_jump' | 'close_debounce'
 * @param {number} keyboardHeight
 * @param {number} previousHeight
 * @param {Object} [metadata]
 */
export function telemetryKeyboard(subtype, keyboardHeight, previousHeight, metadata = {}) {
  pushEvent('keyboard_event', {
    subtype,
    keyboardHeight,
    previousHeight,
    metadata,
  });
}

/**
 * Record a scroll anomaly.
 *
 * @param {string} subtype — 'blocked_during_transition' | 'auto_scroll_unstable' | 'deferred_executed' | 'user_scroll_during_keyboard'
 * @param {string} phase
 * @param {boolean} isNearBottom
 * @param {Object} [metadata]
 */
export function telemetryScroll(subtype, phase, isNearBottom, metadata = {}) {
  pushEvent('scroll_event', {
    subtype,
    phase,
    isNearBottom,
    metadata,
  });
}

// ── DevTools integration ───────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.__RR_TELEMETRY_LOGS = inMemoryBuffer;

  window.__RR_TELEMETRY_SUMMARY = function () {
    if (!isEnabled()) {
      console.log('[Telemetry] Disabled. Set window.__RR_LAYOUT_TELEMETRY = true');
      return;
    }
    const transitions = inMemoryBuffer.filter((e) => e.type === 'layout_transition');
    const keyboards = inMemoryBuffer.filter((e) => e.type === 'keyboard_event');
    const scrolls = inMemoryBuffer.filter((e) => e.type === 'scroll_event');

    const phaseCounts = transitions.reduce((acc, t) => {
      acc[t.phase] = (acc[t.phase] || 0) + 1;
      return acc;
    }, {});

    const oscillations = keyboards.filter((k) => k.subtype === 'oscillation');
    const blockedScrolls = scrolls.filter((s) => s.subtype === 'blocked_during_transition');

    console.table({
      totalEvents: inMemoryBuffer.length,
      transitions: transitions.length,
      keyboardAnomalies: keyboards.length,
      scrollAnomalies: scrolls.length,
      oscillations: oscillations.length,
      blockedScrolls: blockedScrolls.length,
      phaseDistribution: JSON.stringify(phaseCounts),
    });

    if (oscillations.length > 0) {
      console.warn('[Telemetry] Keyboard oscillations detected:', oscillations);
    }
    if (blockedScrolls.length > 0) {
      console.log('[Telemetry] Blocked scrolls (expected during transitions):', blockedScrolls.length);
    }
  };

  window.__RR_TELEMETRY_CLEAR = function () {
    inMemoryBuffer.length = 0;
    console.log('[Telemetry] Buffer cleared');
  };
}
