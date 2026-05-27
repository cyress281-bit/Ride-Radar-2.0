/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SCROLL POLICY ENGINE — Slack/WhatsApp-Grade Stability
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for ALL messaging scroll decisions.
 *
 * No component should ever "decide" whether to scroll. It asks the policy.
 *
 * Architecture:
 *   - layoutPhase is the ONLY behavioral driver
 *   - isNearBottom gates auto-scroll (never scroll if user is reading history)
 *   - isUserScrolledUp is a sticky override (user intentionally scrolled up)
 *
 * Hard rules:
 *   - keyboard-closing  → NEVER scroll (prevents iOS jump bug)
 *   - keyboard-opening  → NEVER scroll (prevents fighting native focus-scroll)
 *   - resizing          → NEVER scroll (wait for layout to settle)
 *   - stable            → scroll freely if near bottom
 *   - keyboard-open     → scroll freely if near bottom
 *
 * @param {Object} params
 * @param {string} params.layoutPhase       — from useLayoutMachine
 * @param {boolean} params.isLayoutStable   — from useLayoutMachine
 * @param {boolean} params.isNearBottom     — live scroll position
 * @param {boolean} params.isUserScrolledUp — user intentionally scrolled up
 * @param {number} params.keyboardHeight    — current keyboard height
 * @returns {{
 *   shouldAutoScroll: boolean,
 *   shouldForceScroll: boolean,
 *   shouldBlockScroll: boolean,
 *   shouldLockToPosition: boolean,
 *   phase: string,
 * }}
 */
export function useScrollPolicy({
  layoutPhase,
  isLayoutStable,
  isNearBottom,
  isUserScrolledUp,
  keyboardHeight,
}) {
  // ── Base policy by phase ─────────────────────────────────────────────────
  let shouldAutoScroll = false;
  let shouldForceScroll = false;
  let shouldBlockScroll = false;
  let shouldLockToPosition = false;

  switch (layoutPhase) {
    case 'keyboard-opening':
      shouldBlockScroll = true;
      shouldAutoScroll = false;
      shouldLockToPosition = true;
      break;

    case 'keyboard-open':
      shouldAutoScroll = isNearBottom;
      shouldBlockScroll = false;
      shouldLockToPosition = false;
      break;

    case 'keyboard-closing':
      shouldBlockScroll = true;
      shouldAutoScroll = false;
      shouldForceScroll = false;
      shouldLockToPosition = true;
      break;

    case 'resizing':
      shouldBlockScroll = true;
      shouldAutoScroll = false;
      shouldLockToPosition = true;
      break;

    case 'stable':
    default:
      shouldAutoScroll = true;
      shouldBlockScroll = false;
      shouldLockToPosition = false;
      break;
  }

  // ── Incoming message rule ────────────────────────────────────────────────
  // Auto-scroll ONLY if user is already near bottom (actively following).
  // Never pull a user out of message history.
  if (!isNearBottom) {
    shouldAutoScroll = false;
  }

  // ── User scroll override ─────────────────────────────────────────────────
  // If user intentionally scrolled up, suppress auto-scroll unless layout is
  // stable AND they're back near bottom (they scrolled back down manually).
  if (isUserScrolledUp) {
    if (layoutPhase === 'stable' && isNearBottom) {
      // User scrolled back down — allow auto-scroll again
      shouldAutoScroll = true;
    } else {
      shouldAutoScroll = false;
    }
  }

  // ── Force scroll: only when layout is fully settled and user is near bottom
  // Force scroll is used for explicit "scroll to bottom" actions (e.g. after
  // sending a message). It follows the same gating as auto-scroll.
  shouldForceScroll = shouldAutoScroll;

  // ── Final safety: block all scroll during any transition ─────────────────
  // This is a redundant guard — the switch above already handles it — but it
  // ensures that if a new phase is added without updating the switch, scroll
  // is blocked by default.
  if (!isLayoutStable && layoutPhase !== 'keyboard-open') {
    shouldBlockScroll = true;
    shouldAutoScroll = false;
    shouldForceScroll = false;
    shouldLockToPosition = true;
  }

  return {
    shouldAutoScroll,
    shouldForceScroll,
    shouldBlockScroll,
    shouldLockToPosition,
    phase: layoutPhase,
    isStable: isLayoutStable,
    isNearBottom,
    isUserScrolledUp,
    keyboardHeight,
  };
}
