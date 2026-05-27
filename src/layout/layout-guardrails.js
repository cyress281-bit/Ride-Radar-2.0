/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAYOUT SYSTEM GUARDRAILS — Ride Radar 2.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file documents the single-source-of-truth rules for viewport,
 * keyboard, and layout state. It exports NO runtime logic.
 *
 * PURPOSE:
 * Prevent future developers and agents from reintroducing duplicate
 * viewport/keyboard listeners, competing calculations, or scroll logic
 * that bypasses the unified layout system.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Single source:  src/hooks/use-viewport.js
 *  Provider:       src/providers/ViewportProvider.jsx
 *  State machine:  src/hooks/use-layout-machine.js
 *  Context hook:   useViewportContext()  (from ViewportProvider)
 *
 *  NO OTHER FILE may directly touch window.visualViewport.
 *  NO OTHER FILE may independently calculate keyboard height.
 *  NO OTHER FILE may attach resize/scroll listeners for viewport changes.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORBIDDEN PATTERNS (DO NOT ADD THESE)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ❌ FORBIDDEN: visualViewport.addEventListener outside use-viewport.js
//    Reason: Creates duplicate listeners, timing drift, and race conditions.
//    Correct: Consume useViewportContext() which derives from the single listener.

// ❌ FORBIDDEN: Keyboard height calculation using window.innerHeight
//    Reason: window.innerHeight is the LAYOUT viewport, not the visual viewport.
//    Correct: Read keyboardHeight from useViewportContext().

// ❌ FORBIDDEN: Duplicate "is keyboard open" logic outside layout context
//    Reason: Multiple sources of truth cause inconsistent UI state.
//    Correct: Read isKeyboardOpen or layoutPhase from useViewportContext().

// ❌ FORBIDDEN: Scroll behavior tied directly to visualViewport events
//    Reason: Scroll logic should react to layout PHASE, not raw viewport events.
//    Correct: Gate scroll behavior on layoutPhase ('stable', 'keyboard-open', etc.).

// ❌ FORBIDDEN: New debounce-based keyboard detection logic
//    Reason: Debounce timing conflicts with the unified state machine.
//    Correct: The layout machine already debounces transitions (150–200ms).
//             Add timing adjustments to use-layout-machine.js if needed.

// ❌ FORBIDDEN: Setting --rr-viewport-height outside AppLayout
//    Reason: AppLayout is the single CSS variable authority.
//    Correct: AppLayout reads viewportHeight from context and writes the var.

// ❌ FORBIDDEN: Reading window.visualViewport directly for layout decisions
//    Reason: Bypasses the reactive context and state machine.
//    Correct: Always use useViewportContext().

// ❌ FORBIDDEN: Attaching window.addEventListener('resize') for viewport sizing
//    Reason: The unified hook already listens to resize + orientationchange.
//    Correct: Consume viewport metrics from context; they update automatically.

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALLOWED PATTERNS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ✅ ALLOWED: Consuming viewport metrics from useViewportContext()
//    import { useViewportContext } from '@/providers/ViewportProvider';
//    const { viewportHeight, keyboardHeight, isKeyboardOpen } = useViewportContext();

// ✅ ALLOWED: Consuming layout phase from useViewportContext()
//    const { layoutPhase, isLayoutStable, layoutTransitionId } = useViewportContext();

// ✅ ALLOWED: Using --rr-viewport-height CSS custom property
//    This is set by AppLayout and safe for non-React consumers (map libs, etc.).

// ✅ ALLOWED: AppLayout setting --rr-viewport-height from context
//    This is the ONE authorized CSS variable writer.

// ✅ ALLOWED: Non-layout resize listeners (e.g., image lazy-loading, canvas resize)
//    These must NOT compute keyboard height or affect page layout.

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXCEPTIONS (require explicit approval)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Third-party libraries that require direct visualViewport access
 *   (must be wrapped and isolated from React layout decisions)
 *
 * - Debug/telemetry code that reads visualViewport for logging only
 *   (must NOT affect UI state or trigger side effects)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * IF YOU NEED TO CHANGE LAYOUT TIMING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Do NOT add new hooks or listeners.
 * Modify ONLY these files:
 *   - src/hooks/use-viewport.js        (listener + metric derivation)
 *   - src/hooks/use-layout-machine.js  (phase transitions + debounce timing)
 *   - src/providers/ViewportProvider.jsx (context composition)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Intentionally empty export to satisfy module systems if imported.
export const LAYOUT_SYSTEM_FROZEN = true;
