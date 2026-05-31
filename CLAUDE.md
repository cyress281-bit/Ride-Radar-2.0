# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Startup Checklist

Before doing anything else each session:
1. Read this file fully
2. Read the **Current Active Task** section below — this tells you exactly where we left off
3. Ask the user what they want to work on
4. Do not assume the current app state — verify before acting

---

---

## AI Team Charter

**This section governs how all AI tools collaborate on Ride Radar 2.0. Every AI must read this before contributing anything.**

### The Team
| Role | AI | Strengths | Primary Responsibility |
|---|---|---|---|
| **Architect & Reviewer** | Claude | Security, architecture, code quality, reasoning, debugging | Code review, security hardening, technical decisions, catching bad patterns |
| **Product & Vision** | ChatGPT | Product thinking, UX strategy, feature prioritization, user experience | App direction, feature design, priority calls, UX decisions |
| **Executor** | Kimi | Heavy code workload, long sessions, implementation | Writing and editing actual code based on approved plans |

### Rules of Engagement
1. **No AI has more leverage than another.** ChatGPT's history with this project does not make its decisions final. Claude's technical depth does not override product decisions. Every recommendation must be justified.
2. **Challenge each other.** If Claude disagrees with a direction ChatGPT set — say so clearly and explain why. If ChatGPT disagrees with Claude's architecture — push back with reasoning. Blind agreement wastes the owner's time.
3. **Document disagreements.** If two AIs reach different conclusions on the same problem, log both perspectives in this file under the relevant section and let the owner decide.
4. **Kimi executes, never decides.** Kimi should not make architectural or product decisions. If Kimi encounters an ambiguous situation it stops and flags it rather than guessing.
5. **No AI touches something outside its current task.** Minimum viable changes only. No scope creep.
6. **The owner is always the final decision maker.** All AI input is a recommendation. Nothing gets built without owner approval.

### Who Owns What
- **Security decisions** → Claude leads, ChatGPT reviews
- **Feature prioritization** → ChatGPT leads, Claude reviews for technical feasibility
- **Architecture & code patterns** → Claude leads, ChatGPT reviews for product fit
- **UI/UX decisions** → ChatGPT leads, Claude reviews for implementation complexity
- **Database schema changes** → Claude leads (RLS, PostGIS, Supabase behavior)
- **Code execution** → Kimi executes based on plans approved by Claude and/or ChatGPT

### How to Hand Off Between AIs
At the end of every session update the **Current Active Task** section with:
- What was decided or built
- Any open disagreements or unresolved questions
- What the next AI should pick up
- Which AI should handle the next step and why

## Protected Behaviors

**These are hard-won, owner-approved app behaviors. ANY change touching these areas is NOT "done" until it has been verified against the existing behavior on the actual iPhone PWA. This list overrides convenience, perf nits, and audit suggestions. If a proposed fix risks any of these, stop and get owner approval first.**

1. **Radar "Locate me"** must reliably recenter **and** zoom to the user (ref commit `45b55ef`).
2. **Radar rendering** must keep showing live **and** cached/offline signals.
3. **Chat** input and messages must stay usable above the iOS keyboard (ref commit `99e72a0`).
4. **Bottom sheets & modals** must not break page scroll (ref Dead Ends: iOS scroll lock).
5. **Auth/session loading** must never show false "not found" states (ref commit `d6823ce`).
6. **PWA updates** must not wipe in-progress form input or break launch.
7. **Bike Down / safety flows** must not silently fail or change UX without owner approval.
8. **Supabase migrations** must be additive unless a destructive change is explicitly approved by the owner.
9. **iOS `datetime-local` flex-wrap fix** must be preserved (see iOS Safari Quirks).

_Approved by owner 2026-05-31. Applies to Claude Code, Codex, and Kimi equally._

---

## Active Initiative — Splash & Loading "Premium Polish" (2026-05-31)

**Status:** ✅ **DONE — VERIFIED ON DEVICE BY OWNER (2026-05-31).** Final shipped design = the **"Alive Logo"** loader (the B→C cinematic was scrapped on device for overlap/clutter). Single unified `PageLoader` (`src/components/shared/PageLoader.jsx`) used everywhere — cold-start boot AND auth-gating — so two loaders can never overlap. Final composition: a **tight-cropped logo** `public/logo-mark.png` (the green art only — created by cropping `public/logo.png`, which is left untouched for the header) that gently **breathes** (scale-only, no glow box), sized `max-w-[88vw]`, with **"RIDE RADAR"** beneath it (uppercase, wide tracking, soft neon glow, first-launch fade-up + gentle glow-pulse synced to the breathing). One-time bloom-in intro on first launch (`sessionStorage` gated), clean `#040406` pre-paint, reduced-motion static frame, full a11y, framer-motion-free (CSS keyframes only). Owner approved through iteration ("looks great I love it"). (The B→C exploration + Codex review below is preserved for the record.) Tunable knobs: `max-w-[88vw]` (logo size), `gap-6` (logo↔wordmark spacing), `tracking-[0.32em]` + glow, and the `rr-brand-*` keyframes in `PageLoader.jsx`.

**Owner decisions locked:**
- **Scope:** Both the cold-start splash AND the in-content loaders, redesigned as one motion system, **plus** an instant pre-React paint in `index.html` to kill the cold-load blank flash.
- **Visual direction: "B → C"** — a radar-grid cinematic boot-up that resolves into a logo-forward bloom reveal, then hands off to the app.

### Claude Code's Findings — current state (verified read-only, 2026-05-31)
- **Cold web/PWA load shows a blank `#040406` flash:** `index.html` `#root` is empty with no inline markup; nothing paints until the JS bundle loads and React mounts.
- **`AppBootLoader` (`src/App.jsx:292–333)`** gates cold start: overlays `PageLoader` until BOTH auth `isLoading` resolves AND a **min 1800ms** elapses, then a 500ms `opacity+scale(1.02)+blur` fade. It passes a `longWait` prop that `PageLoader` **never uses** (dead prop).
- **`src/components/shared/PageLoader.jsx` = the current "splash":** a single neon EKG/heartbeat line (SVG, 2.4s loop) + a fading "RIDE RADAR" wordmark on black. Reduced-motion handled inline. Also reused as the auth-gating loader in `ProtectedRoute`/`AdminRoute`.
- **`src/components/shared/LoadingState.jsx` = in-content loaders** (separate motif): neon `radar-sweep` ring spinner + `skeleton` + `shimmer`.
- **Native (Capacitor)** already has a static splash: `splash.png` via SplashScreen plugin (1000ms, `#040406`, no spinner) — see `capacitor.config.ts`.
- **Prior art (NOT in main — lives only in worktree `practical-blackburn-a80afa/src/components/layout/SplashScreen.jsx`):** a full framer-motion radar-grid + EKG + scan-line + typed-terminal ("RIDE RADAR v2.0 / ESTABLISHING UPLINK… / PULSE DETECTED") + Skip + collapse-to-point splash (~3.2s). This is the direct basis to polish for the "B" half.
- **Assets/tools:** `framer-motion` already a dependency; `src/index.css` has a deep keyframe vocabulary (`radar-sweep`, `ekg`, `glow-pulse`, `rr-map-ping`, `rr-tune-in`, `rr-lock`, `rr-arrive`, `rr-breathe`, `radar-grid-drift`…). Logo is **raster `public/logo.png` only — no SVG** (⚠️ the C bloom scales the logo up; a small PNG will look soft — verify native resolution or source an SVG/large PNG before building the finale).

### Claude Code's proposed B→C design spec (for Codex to critique, NOT yet approved)
Unified cold-start sequence, skippable, reduced-motion-safe:
- **Phase 0 — instant pre-paint (in `index.html`, pre-React):** inline CSS paints black `#040406` + a faint static radar grid + dim "RIDE RADAR" immediately, so there is never a blank flash. Must visually match the React splash's first frame so the handoff is seamless (no jump/reflow).
- **Phase 1 (0–0.4s):** React splash mounts; radar grid fades to full, center blip pulses.
- **Phase 2 (0.4–1.4s):** EKG line traces across the grid; vertical scan line sweeps; cells brighten on pass.
- **Phase 3 (1.4–2.2s):** typed terminal lines appear with cursor; final line triggers EKG thicken + grid flash ("lock").
- **Phase 4 — B→C handoff (2.2–2.8s):** grid + text recede; the **RR logo blooms in** at center (neon radial bloom + one radar-ring ping); wordmark settles.
- **Phase 5 — exit (2.8–3.0s):** logo holds a beat, then scale-up + fade into the app (reuse the existing blur/scale exit).
- **Reduced motion:** skip the sequence → static frame (logo + "RIDE RADAR"), ~0.7s, then fade.
- **Skip button** top-right throughout (from the prototype).
- **First-cold-launch-only cinematic (proposed):** gate the full ~2.8s sequence behind a `sessionStorage` flag (like `ColdStartGuard`) so it does NOT replay on every in-session reload/navigation; in-session auth-gating loads use a LIGHT loader (EKG line or radar-sweep ring only), not the full cinematic. This is the key "premium but not annoying" decision.
- **In-content loader unification:** re-skin `LoadingState` spinner to share the splash's neon glow/easing tokens; keep skeleton/shimmer aligned.

### Likely files in scope (for the eventual Approved Task — NOT edited yet)
`index.html` (pre-paint) · NEW `src/components/splash/SplashScreen.jsx` (adapt worktree prototype) · `src/App.jsx` (`AppBootLoader` wiring + sessionStorage gate; resolve dead `longWait`) · `src/components/shared/PageLoader.jsx` (becomes the light in-session loader / reduced-motion frame) · `src/components/shared/LoadingState.jsx` (motif alignment) · `src/index.css` (shared keyframes + reduced-motion coverage) · logo asset (verify/upgrade) · optionally `capacitor.config.ts` + native `splash.png` (match first frame; possibly out of scope for v1).

### Risks / Protected Behaviors to honor
- **#6 PWA updates must not wipe in-progress input or break launch** — splash must run on cold launch only, NOT on a service-worker update reload mid-session (the sessionStorage gate covers this; Codex should confirm).
- **Accessibility / reduced-motion** — must collapse to a static branded frame (current PageLoader already does; preserve).
- **Non-blocking** — splash overlays while the app renders underneath (current `AppBootLoader` pattern); must not delay auth or interactivity.
- **Performance / no layout shift** — pre-paint CSS must be tiny and inline (no extra request); preload the logo so the Phase-4 bloom doesn't pop in; framer-motion is already loaded.
- **No regression to the auth-loading guard** (Protected Behavior #5) — `AppBootLoader`'s "unmount only after auth resolves AND min display" logic must be preserved.

### Open questions for owner / Codex
1. Total duration — is ~2.8s right, or snappier?
2. Logo finale: logo **standalone** or logo **+ wordmark**?
3. First-cold-launch-only cinematic vs. every cold load?
4. Keep the typed lines verbatim (`ESTABLISHING UPLINK… / PULSE DETECTED`) or new copy?
5. Align the native Capacitor splash too, or web-only for v1?
6. Logo asset: is `public/logo.png` high-res enough for a full-screen bloom, or do we need a better source?

### Codex's Findings
**Date:** 2026-05-31 | **Status:** Complete independent pass, read-only. All major claims verified against source.

**Current-state verification:**
- **Confirmed (nuance):** cold load is a near-black blank flash, not white — `index.html:2` sets `#040406`, `index.html:41` empty `#root`. No pre-React branded paint.
- **Confirmed:** `AppBootLoader` gates on auth + min display (`src/App.jsx:300-305`); actual timers are **1800ms min / 500ms exit** (`:308-313`, `:305`) — the comment at `:286-289` saying 2000/400 is **stale**.
- **Confirmed:** dead `longWait` prop — passed at `:296/:311/:330` but `PageLoader.jsx:4-83` never reads it.
- **Confirmed:** `PageLoader` is the splash + auth loader (`ProtectedRoute :96-98`, `AdminRoute :117-119`, `AppBootLoader :330`); reduced-motion at `PageLoader.jsx:41-51`.
- **Confirmed:** `LoadingState` separate motif (`:19-29/:31-45/:48-66`); native splash (`capacitor.config.ts:17-24`); worktree prototype exists, not in main.
- **Confirmed + measured:** logo is raster only; **`public/logo.png` is 1024×1024** (~205KB). SVGs exist for icons (`public/icon.svg`, `motorcycle-icon.svg`) but not for the logo.

**Spec critique:**
- **Do NOT copy the prototype's App integration.** It hides the whole app behind an opacity wrapper until splash completion and has an **8s safety timeout that reveals the app independent of auth** (`.claude/.../src/App.jsx:311-333`) — conflicts with **Protected Behavior #5**. Keep the current `AppBootLoader` pattern (route tree renders underneath; overlay unmounts only after auth resolved AND min display).
- **⚠️ Correction to Claude — framer-motion is NOT "already loaded" on the boot path.** It's a dep (`package.json:49`) but `vite.config.js:247-250` deliberately splits it into `vendor-framer`, loaded only when a motion page is visited. Importing it in the boot path pulls that chunk into initial launch. **Prefer CSS/keyframes for the boot splash;** if framer is used, keep it narrow and verify bundle output.
- **Inline pre-paint = right call, keep it tiny/static:** inline CSS/HTML only, no external font, no layout-affecting dims. `<link rel="preload" as="image" href="/logo.png">` reasonable, but logo is ~205KB — verify it doesn't compete with critical JS on slow mobile.
- **Perf:** fixed-position overlays (no layout shift); animate opacity/transform only; avoid big full-screen blur/filter on iPhone; reuse existing `src/index.css` keyframes (`radar-sweep`, `glow-pulse`, `rr-ekg`, reduced-motion `:1017-1056`).
- **A11y:** cinematic grid/terminal `aria-hidden`; one stable `role="status"`/`sr-only` label (not changing typed text); Skip must be keyboard-reachable, 44px, named. Reduced motion → static frame ~0.5-0.7s.
- **PWA #6 risk:** SW update can reload on `controllerchange` (`src/lib/registerSW.js:21-33`) and old-SW recovery can force reload (`:140-157`); the update banner refresh is user-initiated (`AppLayout.jsx:148-155`). The full cinematic must NOT run on those mid-session reloads, and the splash work must add no new auto-refresh/activation.

**Architectural calls:**
- **First-cold-launch-only gate:** approve, via **`sessionStorage`** (not localStorage) — replay once per browser/PWA session. Precedent: `ColdStartGuard`'s `rr_session_active` (`src/App.jsx:197-201`); use a distinct splash key (or share deliberately + document).
- **AppBootLoader integration:** approve **only if** it preserves the invariant — children render immediately; overlay removal waits for auth resolved AND min display. Cinematic finishes before auth → hold a light/static loader. Auth finishes before cinematic min → finish the min. **No safety timeout that reveals app while auth still loading.**
- **SW-update reload:** full cinematic should NOT run; pre-paint static frame may appear (document reloads) but React picks the light loader when `sessionStorage` shows active session or SW reload markers (`sw-last-reload`/`sw-fresh`) are present.

**Open-question recommendations (Codex):**
1. **Duration:** 2.1-2.4s default for first-session cinematic; 2.8s is upper bound, not default. Reduced motion 0.5-0.7s.
2. **Logo finale:** logo-forward bloom + restrained wordmark settle (logo is hero).
3. **First-launch-only:** yes, session-only; light loaders after.
4. **Terminal copy:** replace prototype copy with shorter/less gimmicky — recommend `RADAR ONLINE` / `SIGNAL LOCKED` / `RIDE READY`.
5. **Native splash:** web/PWA first for v1; align Capacitor in a separate task after the final first-frame/logo is approved.
6. **Logo asset:** 1024×1024 acceptable for a centered bloom **if capped to sane CSS sizes — do not upscale beyond native**; source a vector/larger PNG only if a huge full-screen logo is needed.

**Codex disagreements / owner decisions needed:**
- Disagrees with treating framer-motion as "already loaded" for cold-start perf (it's intentionally split out today).
- Agrees on the sessionStorage gate but wants explicit cinematic-skip on SW-update reloads, not just general cold-start wording.
- Worktree prototype = useful visual prior art, but its App-level integration must be **rejected** (hides app, can bypass auth-loading guard).

---

### Consensus / Disagreements (Claude Code + Codex, 2026-05-31)
**Strong consensus — near-complete agreement. Two corrections where Codex was right and Claude concedes:**

1. **framer-motion on the boot path (Codex correct → CONSENSUS):** Claude's "already loaded" was wrong — `vite.config.js:247-250` splits it into `vendor-framer`. **Decision: build the boot splash in CSS/keyframes** (reusing `src/index.css` vocabulary), not framer-motion. This also de-risks perf and keeps cold-start light. Claude concedes.
2. **Reject the prototype's App integration (CONSENSUS):** both agree the worktree prototype is visual prior art ONLY. Its opacity-hide + 8s auth-independent safety timeout must NOT be ported (violates Protected Behavior #5). Keep the existing `AppBootLoader` invariant: app renders underneath; overlay unmounts only after auth resolved AND min display; no safety timeout that reveals content while auth loads.
3. **SW-update reload (CONSENSUS):** full cinematic must be explicitly suppressed on `controllerchange`/recovery reloads (`registerSW.js:21-33`, `:140-157`), not just gated by general cold-start logic.
4. **first-launch-only via `sessionStorage` (CONSENSUS):** session-scoped; light loader for in-session loads. Use a distinct key or document sharing with `rr_session_active`.
5. **Pre-paint inline, tiny, static; fixed overlays; opacity/transform-only; a11y (aria-hidden cinematic + one stable status label + 44px named Skip); reduced-motion static frame (CONSENSUS).**

**No hard disagreements remain.** Differences are owner-preference only (duration, copy) — both AIs' recommendations are logged below.

### Owner decisions to lock before Kimi task is written
| # | Question | Claude rec | Codex rec | Owner choice |
|---|---|---|---|---|
| 1 | Cinematic duration | ~2.8s | 2.1-2.4s default | ✅ **LOCKED — generous/cinematic, do NOT rush. Build target ~3.2–3.6s for the full first-launch sequence** (owner: "this part is very important to me"). Safe because it's first-launch-only + skippable + app renders underneath. Reduced-motion still ~0.6s. **Each phase must feel continuously alive — no static dead air; "unhurried," not "stuck."** Skip button always present for users who opt out. |
| 2 | Logo finale | logo + optional wordmark | logo hero + restrained wordmark | ✅ **LOCKED — logo as hero + restrained wordmark settle** (both AIs agreed; owner did not object — revisit if desired). |
| 3 | First-launch-only | yes | yes | _TBD_ |
| 4 | Terminal copy | keep `UPLINK…/PULSE DETECTED` | `RADAR ONLINE / SIGNAL LOCKED / RIDE READY` | ✅ **LOCKED — punchier copy: `RADAR ONLINE` / `SIGNAL LOCKED` / `RIDE READY`** (owner choice). |
| 5 | Native splash now? | web-first v1 | web-first v1 | _TBD_ |
| 6 | Logo asset | verify res | 1024² ok if not upscaled | _TBD_ |
| 7 | Animation tech | (conceded) CSS keyframes | CSS keyframes | _TBD_ |

### Approved Task for Kimi — REVISED: "Alive Logo" Splash (SUPERSEDES the B→C cinematic)
**Status: DONE-pending-device-verification — All 3 phases executed, committed, and pushed. Build (lint + typecheck + build) passed for all phases. Awaiting owner on-device acceptance checklist and Claude Code diff review.** The prior B→C cinematic shipped, but on device it produced **two competing loaders** — the new cinematic AND the OLD EKG-heartbeat `PageLoader` that still renders during auth-gating — which overlapped and looked cluttered/ugly. Owner scrapped that direction. **New direction: ONE clean, elegant, logo-centric "alive" loader used EVERYWHERE (cold-start boot + auth-gating), so there is never a second/different loader to overlap.** This task removes the old EKG animation AND the busy cinematic.

**LOCKED DECISIONS (do not deviate):**
- **Single unified loader.** Every loading state in the app uses the SAME visual. No second style anywhere — this is the whole point; it structurally eliminates the overlap.
- **Logo-centric & "alive":** centered `public/logo.png` on `#040406` with a calm, premium idle animation (gentle breathing scale + neon glow pulse). "Alive," not busy. **No grid, no EKG line, no scan line, no typed terminal — those are removed.**
- First launch (per session) gets a one-time **bloom-in intro** (logo fades/scales in) then settles into the idle breathing. An **unhurried hold is fine** (owner values an unrushed moment) — it simply stays calmly alive. In-session / auth-gating loads start directly in the idle breathing (no re-intro).
- Keep the existing **`sessionStorage` first-launch gate** + stable lazy-`useState` `firstLaunch`/`reduced`. · **web/PWA only — do NOT touch `capacitor.config.ts`/native splash.** · logo `public/logo.png` (**never upscale beyond native**). · **CSS keyframes ONLY — do NOT import `framer-motion`** (code-split out of the boot path per `vite.config.js:247-250`). · reduced motion = static logo, no animation, opacity-only exit.

**GLOBAL RULES:**
- Execute exactly what is written. No extra files beyond those named; no unrelated refactors. If a step would alter a **Protected Behavior** or is ambiguous, STOP and flag here.
- **Per-phase workflow:** implement → `npm run lint` AND `npm run typecheck` AND `npm run build` → only if all three pass, `git commit` + `git push origin main` → next phase.
- Color literals where CSS vars may be unavailable (pre-paint): neon `hsl(107 100% 54%)`, bg `#040406`. Inside React/CSS you may use `hsl(var(--primary))`.
- a11y mandatory: `role="status"` + one stable `aria-label="Loading Ride Radar"`; decorative visuals `aria-hidden`.

---

#### PHASE 1 — build the single "alive logo" loader (replaces the old EKG `PageLoader`)
Rewrite `src/components/shared/PageLoader.jsx` into the ONE brand loader used everywhere:
- Full-screen `fixed inset-0 z-50 bg-[#040406]`, flex-centered. Centered `<img src="/logo.png" alt="" aria-hidden="true">` capped (e.g. `h-28 w-auto`, never beyond native).
- **Idle "alive" animation (default, continuous, calm):** gentle breathing — scale `1 → 1.035 → 1` PLUS a neon glow pulse (`drop-shadow` using `hsl(var(--primary))`) on a ~2.6s `ease-in-out` infinite loop. Optional: ONE very subtle slow radar-ring ping behind the logo (~3s loop, low opacity) — keep minimal; omit it if it adds any clutter.
- **`intro` prop (boolean):** when true, the logo first blooms in once (scale `0.9 → 1` + fade, ~0.6s) then enters the idle loop. When false/absent, start directly in idle.
- **`exiting` prop:** opacity + slight scale fade-out (~500ms) — keep the existing exit feel.
- **`onSkip` prop (optional):** if provided, render a subtle Skip button — `min-w-[44px] min-h-[44px]`, top-right, keyboard-reachable, `aria-label="Skip intro"`, calls `onSkip`.
- **On mount (`useLayoutEffect`, hoisted ABOVE the return):** `document.getElementById('rr-prepaint')?.remove();`
- **Reduced motion** (`window.matchMedia('(prefers-reduced-motion: reduce)').matches`): render the static logo only (no animation, no intro); opacity-only exit.
- `role="status"` + `aria-label="Loading Ride Radar"`; logo/ring `aria-hidden`.
- **DELETE the old EKG heartbeat SVG, its inline `<style>` block, and the "Ride Radar" label entirely.**
- **Verify:** build passes.

#### PHASE 2 — delete the cinematic + unify the wiring (this is what kills the overlap)
1. **Delete the file** `src/components/splash/SplashScreen.jsx`.
2. `src/App.jsx` → `AppBootLoader`: remove the `import SplashScreen ...` line. Keep the stable lazy-`useState` `firstLaunch`/`reduced` gate, the `sessionStorage` set effect, and `MIN_DISPLAY` (3400 first-launch / 600 else) as-is. Keep `handleSkip`, `tryExit`, and the `minElapsed && authDone → exiting → 500ms → visible=false` machinery (the auth invariant — NO app-revealing safety timeout). Render the unified loader for BOTH paths:
   ```jsx
   {visible && (
     <PageLoader
       intro={firstLaunch && !reduced}
       exiting={exiting}
       onSkip={firstLaunch && !reduced ? handleSkip : undefined}
     />
   )}
   ```
   (Always `PageLoader`; only first launch gets `intro` + Skip.)
3. **Leave `ProtectedRoute` (`~:97`) and `AdminRoute` (`~:118`) using `<PageLoader />`.** Now that `PageLoader` IS the alive-logo loader, the boot splash and the auth-gating loader are the SAME visual — so there is no second screen to overlap. Do NOT introduce any other loader component.
4. **Verify:** build passes; `rg SplashScreen src` returns no remaining import/JSX reference.

#### PHASE 3 — simplify the pre-paint + clean up keyframes
1. `index.html`: simplify `#rr-prepaint` to a CLEAN solid `#040406` screen — **remove the faint grid layer (`.rr-pp-grid`) and the "Ride Radar" wordmark text (`.rr-pp-word`)** so nothing clashes with / overlaps the React loader. (Optional: keep only a faint centered radial glow.) Keep `<link rel="preload" as="image" href="/logo.png">`, keep the `#rr-prepaint` node + its removal on React mount.
2. `src/index.css`: **remove all now-unused keyframes** — the `rr-splash-*` set (`rr-splash-ekg-draw`, `rr-splash-scan`, `rr-splash-logo-bloom`, `rr-splash-ring-ping`, `rr-splash-wordmark-settle`, `rr-splash-hold-pulse`) and any old EKG keyframes (`rr-ekg`, `rr-ekg-draw`, `rr-ekg-label`) **only if nothing else references them** (grep `rr-splash` and `rr-ekg` first — `LoadingState`/others must not break). Add the new minimal keyframes the loader needs: `rr-brand-breathe` (scale + glow), `rr-brand-bloom` (intro), and optionally `rr-brand-ring`.
3. **Verify:** build passes; grep shows no dangling references to deleted keyframes or to `SplashScreen`.

---

**Owner on-device acceptance checklist:**
1. Cold launch → clean dark screen → logo blooms in and gently breathes (alive) → fades into the app. **No second/old animation appears at any point.**
2. While auth resolves / on in-session reload → the SAME breathing-logo loader (never a different style; no overlap).
3. iOS reduced-motion ON → static logo, no animation, then app.
4. Skip (first launch only) works, is easily tappable, and never reveals the app before auth resolves.
5. Protected Behaviors intact: no wiped form input on PWA update (#6), no false "not found"/early reveal during auth (#5), chat keyboard + radar unaffected.

**When all phases done + pushed:** append an AI Handoff Log row with the commit hashes, set this task Status to DONE-pending-device-verification, and leave for Claude Code diff review.

---

## Active Initiative — Navigation / Transition Speed (2026-05-31)

**Status:** ✅ **DONE — VERIFIED BY OWNER (2026-05-31).** Dual-pass inspection (Kimi swarm + Claude Code) → reconciled → shipped. **Shipped & verified:** MapLibre 918 KB chunk-leak fix (`439bbda` — removed from every non-map page's initial load); F1 data-prefetch on intent for broadcast detail + rider profile (`f863e52` — helpers aligned to page query keys/shapes, `withRoutePreload` extended); F2 BottomNav tab preload (`8fa023d`); F3 `gcTime` 5min→30min (`d3bf9fa`); F5 dead `vendor-leaflet` chunk removed (`4c4dc47`). All build-green; Claude Code reviewed all diffs against spec (F1 key/shape alignment confirmed correct); no Protected Behaviors touched. **Held / not done (intentional):** F1c messages prefetch (chat = Protected Behavior #3, Claude-led — helper still misaligned, dormant/unwired), BroadcastDetail 2-query waterfall (Kimi#5), public-route blank-on-load (Kimi#6). Kimi's full findings: `audit-listings/navigation-speed-findings.md`. The dual-inspector cross-check paid off: Kimi caught the MapLibre leak Claude missed; Claude caught the prefetch key-misalignment Kimi missed.

**🔴 BIGGEST WIN — ✅ FIXED (commit `439bbda`), pending radar device-check:** the main entry chunk was statically importing the 918 KB `vendor-maplibre` on **every** page. Root cause confirmed: the `manualChunks` `vendor-maplibre` rule trapped Rollup's shared runtime helper inside the map bundle, so every page chunk (login/legal/settings — no maps) imported the whole 918 KB just to get that helper (the entry imported only `{_ as a}`, the helper, not real map code). **Fix:** removed the `vendor-maplibre` manualChunks rule (`vite.config.js`) so Rollup async-splits MapLibre into a chunk loaded ONLY by the map routes. **Verified via fresh build:** entry + Login/Privacy/Terms/Settings/Conversations no longer reference maplibre; it's confined to `BroadcastFeedPage`/`LiveMapMapLibre`/`maplibre-gl` chunk; no maplibre modulepreload in `index.html`. lint+typecheck+build green. **Owner device-check:** confirm `/home` radar map still renders (Protected Behavior #1/#2 — same MapLibre code, just relocated to a lazy chunk).

**Reconciliation note:** Kimi#2=F2 (BottomNav, agree), Kimi#3=F1 (prefetch, agree — my task adds the key/queryFn alignment Kimi didn't spell out). Kimi#4 proposed `refetchOnMount:false` and claimed the TQ v5 default is `"always"` — **that's inaccurate (the default is `true` → only refetches when stale).** Our F3 (raise `gcTime`) is the safer fix for the same "revisit refetch" issue and is what's approved; `refetchOnMount:false` is a larger freshness change, not approved. Kimi#5 (BroadcastDetail waterfall) + #6 (public-route blank) are real but lower priority / out of this batch.

The HIGH-impact safe gap actioned below: **data-prefetch helpers in `src/lib/query-client.js` are defined but never called AND are misaligned with the real page hooks.** Approved Task = wire them (aligned) + small preload/cache/cleanup wins. **Messages prefetch is HELD (chat = Protected Behavior #3).**

### Approved Task for Kimi — Navigation Speed (F1 broadcast+rider, F2, F3, F5)
**Status: DONE-pending-device-verification — All 4 phases executed, committed, and pushed. Build (lint + typecheck + build) passed for all phases. Awaiting owner on-device verification and Claude Code diff review.**

#### PHASE 1 — F1: wire data prefetch to intent (broadcast detail + rider profile)
The chunks already preload on tap; the DATA does not. The existing helpers are **misaligned** — fix them to mirror the page hooks EXACTLY, then wire them via an extended `withRoutePreload`.

1. **Fix the two helpers in `src/lib/query-client.js`** so their queryKey + queryFn are identical to the consuming page (otherwise the prefetch never hits the page's query):
   - `prefetchBroadcastDetail(qc, broadcastId)`: keep key `broadcastKeys.detail(broadcastId)`; **replace the raw `supabase...select('*')` queryFn with `getBroadcastById(broadcastId)`** (exactly as `BroadcastDetailPage.jsx:566-570`). Import `getBroadcastById` from the same module `BroadcastDetailPage` imports it from. Keep `staleTime: 60000`.
   - `prefetchRiderProfile(qc, userId)`: keep key `['profile', userId]`; **replace the raw query with `getProfileByUserId(userId)`** (exactly as `RiderProfilePage.jsx:208-212`). Import `getProfileByUserId` from `@/features/profile/api/profile-api`. Set `staleTime: 30000` (match the page). Keep the existing `getQueryData` early-return guard.
   - **Do NOT touch `prefetchConversationMessages`** — it is HELD (see bottom).
2. **Extend `withRoutePreload` in `src/lib/routePreload.js`** to accept an optional second arg `dataLoader` that also fires on the same intent (backward-compatible — existing single-arg call sites are unaffected). React Query dedupes prefetches internally, so no per-element guard is needed for the data loader. Exact shape:
   ```js
   export function withRoutePreload(loader, dataLoader) {
     const trigger = (el) => {
       triggerOnce(loader, el);
       if (dataLoader) Promise.resolve().then(() => { try { dataLoader(); } catch {} });
     };
     return {
       onPointerEnter(e) { if (e.pointerType === 'mouse') trigger(e.currentTarget); },
       onFocus(e) { trigger(e.currentTarget); },
       onPointerDown(e) { trigger(e.currentTarget); },
     };
   }
   ```
3. **Wire the two safe sites** (add `useQueryClient` + import the matching prefetch fn from `@/lib/query-client`, then pass the data loader as the 2nd arg to the existing `withRoutePreload`):
   - `src/components/shared/RideCard.jsx:258` → `{...withRoutePreload(preloadBroadcastDetail, () => prefetchBroadcastDetail(qc, broadcast.id))}` (the card already has the `broadcast` prop; `qc = useQueryClient()`).
   - `src/features/broadcast/components/RadarBottomSheet.jsx:80` → `{...withRoutePreload(preloadRiderProfile, () => prefetchRiderProfile(qc, userId))}` (the rider row already has `userId`; add `qc = useQueryClient()` to that component).
- **Verify:** build green. Tapping a ride card / rider row warms its detail data so the destination renders with data already present (no spinner). No behavior change otherwise.

#### PHASE 2 — F2: BottomNav intent preload
`src/components/layout/BottomNav.jsx`: import `withRoutePreload` and `preloadHome`, `preloadMessages`, `preloadProfile` from `@/lib/routePreload`. Add a `preload` field to each `TABS` entry (`/home`→`preloadHome`, `/messages`→`preloadMessages`, `/profile`→`preloadProfile`) and spread `{...withRoutePreload(tab.preload)}` on each `<NavLink>`. Chunk-only preload; behavior-neutral.
- **Verify:** build green.

#### PHASE 3 — F3: retain query cache longer
`src/lib/query-client.js`: in `defaultOptions.queries`, change `gcTime: 5 * 60 * 1000` → `gcTime: 30 * 60 * 1000`. (Returning to a list after >5 min now paints cached data instantly + background-refetches instead of showing a cold spinner; `staleTime` still governs freshness. Hooks with their own `gcTime` are unaffected.)
- **Verify:** build green.

#### PHASE 4 — F5: delete dead chunk rule
`vite.config.js:231-234`: delete the `vendor-leaflet` `manualChunks` branch (Leaflet was fully removed). First `rg leaflet package.json` to confirm it's absent; if absent, remove the branch. Pure cleanup.
- **Verify:** build green.

#### HELD — F1c messages prefetch (Claude Code follow-up, NOT for Kimi)
Wiring `prefetchConversationMessages` to `ConversationItem` is held: the helper's key `['messages', conversationId]` is misaligned with the hook's `['messages', conversationId, user?.id]` (`use-messages.js:23`) and the hook applies `hydrateMessageImages` (signed URLs) the raw helper skips — a wrong prefetch could cache unhydrated/broken data or never hit. Chat is **Protected Behavior #3**, so this needs Claude-led alignment + on-device verification.

**When all phases done + pushed:** append an AI Handoff Log row with commit hashes, set this task Status to DONE-pending-device-verification, leave for Claude Code review.

---

## Current Active Task

**Purpose:** This is the handoff log between AI tools (Claude Code, Kimi, Claude browser). Update it at the end of every session so the next AI picks up exactly where you left off — no re-explaining, no wasted tokens.

**Last Updated By:** Claude Code
**Date:** 2026-05-31

---

## How the Review Process Works

**This section governs how Claude Code and Codex cross-check each other before anything goes to Kimi.**

1. Owner brings a problem — either Claude Code or Codex investigates first and writes their findings below
2. Owner takes the same problem to the other AI — it reads this file, runs its own independent investigation, and writes its findings below WITHOUT reading the first report until it's done
3. Each AI then reads the other's report and either confirms, challenges, or flags a disagreement
4. Owner resolves any disagreements
5. Only after both AIs sign off does the **Approved Task for Kimi** get filled in
6. Kimi executes exactly what is written there — no interpretation, no decisions
7. Claude Code and Codex both review Kimi's diff before the owner merges/pushes

**Rules:**
- Never overwrite the other AI's findings section — append or comment only
- If you disagree with the other AI's conclusion, write exactly why under Disagreements
- The Approved Task for Kimi must be left blank until both AIs have signed off
- Kimi must not act on anything in this file except the Approved Task section

---

### Current Problem
Triage of the **Comprehensive Codebase Audit Report (dated 2026-05-31)** — an AI-generated audit produced by "20 parallel auditors" claiming 508 findings (48 CRITICAL, 134 HIGH, etc.). Before any of it becomes work, every finding needs independent verification: AI multi-agent audit dumps routinely contain a large fraction of false positives and already-fixed items. This review cycle triages the **20 explicitly-named CRITICAL findings (C-001 … C-020)** — the only ones the report specifies with enough detail to verify. The remaining 28 unnamed CRITICALs and all HIGH/MEDIUM/LOW items are referenced only by category counts and cannot be verified as written.

**Goal of this cycle:** Determine which named CRITICALs are real, correct their severities, and hand only the genuinely-actionable residue forward — nothing gets fixed on the strength of the audit alone.

**Raw listings available for reference (NOT verified):** Kimi organized the full 508-item audit dump into structured markdown at `audit-listings/README.md` with sub-files by severity, by file, and by category. These are comparison aids only — the triage below supersedes them.

> _Prior review cycle (DM page `/messages/:id` "Conversation not found") is CLOSED — fixed in commit `d6823ce`, verified on device. See the AI Handoff Log and Known Issues table for its record._

---

### Claude Code's Findings
**Date:** 2026-05-31 | **Status:** Complete (independent triage of the 20 named CRITICAL findings)

**Method:** Read-only verification. I checked the four cheapest/most-falsifiable claims myself, then dispatched three parallel verification sub-agents (security+Supabase, error-handling, performance+PWA), each instructed to be skeptical, trace full enforcement/caller paths, and cite `file:line` evidence. No files were edited during triage. Verdict legend: **CONFIRMED** (real, severity correct) · **INFLATED** (real but severity overstated) · **FALSE** (wrong / already-fixed / unreachable).

**Verdict table — all 20 named CRITICALs:**

| ID | Claim (short) | Verdict | Real severity | Evidence / why |
|---|---|---|---|---|
| C-001 | JWT in localStorage (XSS theft) | INFLATED | Low | `supabase.js` + `capacitor-storage.js:17` — localStorage is the *standard* Supabase web default; native uses encrypted Capacitor storage. Proposed httpOnly-cookie+proxy fix is infeasible for an anon-key serverless arch. |
| C-002 | `capacitor-storage.js` missing → auth crash | FALSE | — | File **exists** at `src/lib/capacitor-storage.js`. Auditor used a stale checkout. |
| C-003 | 5 tables have no RLS | FALSE | — | All 5 have `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY`: `20260519000003_add_user_posts_post_comments.sql`, `20260516000000_create_broadcast_comments.sql`, `20260521143125_add_official_event_requests.sql`. Stale checkout. |
| C-004 | Admin client-side only → priv-esc | INFLATED | Low | `admin-api.js:183-189` client `assertAdmin()` is only defense-in-depth; DB enforces server-side via `is_admin()` RLS (`20260506_admin_rls_policies.sql:82-129`), and role self-change is blocked by `WITH CHECK`. No escalation path. |
| C-005 | `get_live_map_presence()` no `search_path` | **CLOSED — already fixed on live** | — | Triage was correct *against the local migration*, but live verification (2026-05-31, Supabase MCP) showed the live function is a different, already-hardened 4-arg version (`STABLE` + `search_path = public, auth`); advisor no longer lists it. The hardening migration was reverted (would have created an insecure overload). Local migrations are diverged from live. |
| C-006 | No offline fallback page | **CONFIRMED** | Low | `vite.config.js:174 navigateFallback: null`; no `offline.html` in `public/`. But Workbox precaches the app shell (`globPatterns`) so only a true cold deep-link while offline fails — edge case for an auth-gated SPA. |
| C-007 | No bg sync → Bike Down lost offline | INFLATED | Low–Med | `query-client.js:32,41 networkMode: 'offlineFirst'` pauses + auto-resumes in-session mutations. Real gap is narrower: **no durable cross-reload queue** (no `persistQueryClient`/Background Sync), so an offline submit lost to an app-kill is gone. "Zero offline handling" is wrong. |
| C-008 | Auth bypasses TanStack Query | **CONFIRMED** | Low | `use-auth.js:67-69` profile via `useState`; `use-profile.js:21-35` is a separate `useQuery(['profile',userId])` → possible duplicate self-fetch. Bridged partly by `refreshProfile` → `invalidateQueries`. Architectural smell, not a bug. |
| C-009 | ViewportProvider value not memoized | **CONFIRMED** | Low | `ViewportProvider.jsx:58 const value = {` (no `useMemo`) → all subscribers re-render on every viewport change. Real perf nit. |
| C-010 | Scroll-lock trap in PostDetailSheet | FALSE | — | `use-body-scroll-lock.js:33` cleanup is unconditional, AND both call sites mount only when `post` is truthy (`ProfilePage.jsx:424`, `RiderProfilePage.jsx:711`). Trap is unreachable. |
| C-011 | Raw `<img>` on broadcast detail | **CONFIRMED** | Low | `BroadcastDetailPage.jsx:915/1024/454` are raw `<img>`, not `OptimizedImage`. But all have fixed Tailwind dims (`h-72`, `w-11 h-11`, `w-8 h-8`) → CLS impact minimal. |
| C-012 | `hardDeleteBroadcast` throws, breaks contract | FALSE | — | `broadcast-api.js:130-134` does throw, but siblings throw too (the "{data,error}" header comment is aspirational), and the sole caller (`AdminReportsPage.jsx:166`) runs it inside a React Query `mutationFn` → throw is caught. No uncaught rejection. |
| C-013 | Sign-out clears state before API | INFLATED | Low | `use-auth.js:372-386` actually `await`s `apiSignOut()` **first**, then clears, then re-throws. Optimistic clear is deliberate (commented) and is the safe-failure direction. Claim's premise (clears first) is factually wrong. |
| C-014 | `Promise.all` uploads no error handling | FALSE | (Low edge) | `use-create-broadcast.js:208-227` wraps insert in `try/catch` + `storage.remove(uploadedPaths)` cleanup, plus `onError`. Only residual: a partial `Promise.all` rejection at `:179` can orphan already-uploaded files (narrow Low hardening), not "no error handling". |
| C-015 | Onboarding upload no validation | FALSE | — | `OnboardingPage.jsx:174/190` → `prepareLocalImage` → `validateFile` (`image-utils.js:119`) enforces type + size; `uploadImage` re-validates at `:147`; inputs also `accept=`. Validation happens downstream. |
| C-016 | No `prefers-reduced-motion` support | FALSE | — | `index.css:1017` has a comprehensive `@media (prefers-reduced-motion: reduce)` block using `*` + explicitly neutralizing every named animation (radar sweep, EKG, glow, shimmer, float, etc.). |
| C-017 | `getEventRsvpCounts` client-side count | **CONFIRMED** | Low | `admin-api.js:164-178` fetches all matching `event_rsvps` rows and counts in a JS loop instead of DB aggregation. Admin-only, bounded by `.in()`. Perf nit. |
| C-018 | All PWA icons missing from `public/` | FALSE | — | `public/` contains `icon-192.png`, `icon-512.png`, `maskable-icon-512.png`, `apple-touch-icon.png`, `icon-1024.png`, `favicon-32.png`, etc. Stale checkout. |
| C-019 | `Link` used but never imported → crash | INFLATED | Low (latent) | `LiveMapMapLibre.jsx:238` uses `<Link>` with **no import** — but its only consumer `SignalListItem` is rendered by `SignalList`, gated behind `variant !== 'radar'` (`:1000`), and the sole mount (`BroadcastFeedPage.jsx:270`) passes `variant="radar"`. Latent landmine, not a live crash. One-line fix prevents future breakage. |
| C-020 | Stale settings in shared realtime channel | INFLATED | Low | `use-notifications.js:182` channel created without settings; effect deps `[userId, qc]` exclude settings → stale closure is real. BUT undefined settings → `shouldShowNotification` returns **true** (fails *open*, shows extra) and the list `select` re-filters (`:147`). UX nit, not data exposure. |

**Tally:** of the 20 named CRITICALs → **8 FALSE · 6 INFLATED · 6 CONFIRMED.** **Zero are actually critical-severity.** Every confirmed item is Low or Low–Med.

**Cross-cutting conclusion:**
The audit's `file:line` citations were accurate where checkable, but it **systematically inflated severity** by pattern-matching smells (localStorage tokens, client-side admin checks, `throw`, closure capture, raw `<img>`) without tracing the compensating control — server-side RLS, React Query mutation wrappers, downstream `validateFile`, `offlineFirst` pause/resume, fixed image dims, fail-open-then-re-filter. Several FALSE findings (C-002, C-003, C-018) prove at least one auditor ran against a **stale checkout**. One finding (C-016) describes a fix that is **already fully implemented**.

**Recommendation:** Do **not** treat the report as a worklist. The genuinely-actionable residue is a small set of Low items (see proposed Approved Task). The 28 unnamed CRITICALs and 134 HIGHs should be presumed to carry the same ~70% false/inflated rate and be re-derived from code before any work, not lifted from the report.

**Confidence:** High on the 20 named items (each traced to source). Unverifiable on the unnamed/aggregate findings by design — the report does not specify them.

---

### Codex's Findings
**Date:** 2026-05-31 | **Status:** Complete for first-pass subset, not a full C-001...C-020 independent triage

**Process note:** Codex first inspected the high-signal runtime/accessibility subset originally proposed for a minimal patch, before seeing Claude Code's full verdict table in this file. After reading the current `CLAUDE.md`, Codex is **not claiming** this as the full independent 20-critical pass requested in Claude's placeholder. Treat this as a focused comparison report covering the files Codex actually inspected.

**Scope inspected:**

| File | What was checked |
|---|---|
| `src/lib/supabase.js` | Whether `capacitorStorage` import/use exists |
| `src/lib/capacitor-storage.js` | Whether the alleged missing module exists and exports the adapter |
| `src/components/shared/AvatarWithStatus.jsx` | Whether the alleged missing component exists and exports correctly |
| `src/features/map/components/LiveMapMapLibre.jsx` | Whether `<Link>` is used without importing it |
| `src/features/profile/components/PostDetailSheet.jsx` | Whether scroll lock is unconditional before the null render guard |
| `src/features/broadcast/api/broadcast-api.js` | Whether `hardDeleteBroadcast()` throws despite the module-level `{ data, error }` convention |
| `src/components/layout/AppHeader.jsx` | Whether header touch targets are below 44px |
| `src/index.css` | Whether reduced-motion support exists and whether later animation utilities are covered |
| `src/features/broadcast/pages/BroadcastDetailPage.jsx` | Whether raw `<img>` tags remain on the detail page |

#### Codex First-Pass Verdicts

| Audit ID | Codex verdict | Corrected severity | Evidence | Recommendation |
|---|---|---:|---|---|
| `C-002` missing `capacitor-storage.js` | FALSE | — | `src/lib/capacitor-storage.js:15` exports `capacitorStorage`; `src/lib/supabase.js:2` imports it; `src/lib/supabase.js:130` uses it. | No action. Audit was stale. |
| `H-043` missing `AvatarWithStatus.jsx` | FALSE | — | `src/components/shared/AvatarWithStatus.jsx:34` exports `AvatarWithStatus`; imports resolve in Settings, ConversationPage, RiderSearch, RequestsTab, CrewTab, and ConversationItem. | No action. Audit was stale. |
| `C-019` `<Link>` used without import | CONFIRMED but inflated | Low latent runtime risk | `LiveMapMapLibre.jsx:238` renders `<Link>`; top imports do not include `Link` from `react-router-dom`. | Add `import { Link } from 'react-router-dom';`. This is a one-line hardening fix even if current route composition does not hit that branch. |
| `C-010` PostDetailSheet scroll lock trap | CONFIRMED as a local code smell; reachability disputed | Low if reachable | `PostDetailSheet.jsx:25` calls `useBodyScrollLock(true)` before `if (!post) return null` at line 45. | Change to `useBodyScrollLock(!!post)` if touching this file. Claude says current call sites only mount when `post` is truthy, making the trap unreachable today. Codex agrees this lowers severity but still prefers the one-token defensive fix. |
| `C-012` `hardDeleteBroadcast()` throws | CONFIRMED as contract inconsistency; severity disputed | Low | `broadcast-api.js:130-133` throws on error. The module header says all functions return `{ data, error }`. | Codex recommends returning `{ data: null, error }` for consistency. Claude notes the sole caller is a React Query mutation and catches throws, so this is not a crash bug. |
| `H-027` AppHeader touch targets | CONFIRMED | Low accessibility | `AppHeader.jsx:256`, `275`, and `300` use `min-w-[40px] min-h-[40px]`. | Change the three header actions to `min-w-[44px] min-h-[44px]`. |
| `C-016` missing reduced motion | INFLATED / partially false | Low polish | `index.css:1017` has a broad `@media (prefers-reduced-motion: reduce)` block. Later utilities at `index.css:1114`, `1123`, `1194`, `1197`, `1200`, `1203`, and `1208` define additional animations after that block. | The broad audit claim is false. Optional hardening: add a later reduced-motion override for the animation utilities declared after the first reduced-motion block. |
| `C-011` raw `<img>` on broadcast detail | CONFIRMED but inflated | Low performance/CLS | `BroadcastDetailPage.jsx:454`, `504`, `915`, and `1024` use raw `<img>`; `OptimizedImage` exists but is not imported by this page. | Separate patch after layout check. Existing fixed dimensions lower CLS risk, but this remains a legitimate consistency/perf item. |

#### Codex Proposed Minimal Patch Candidate

Codex would approve these only after owner/Claude signoff:

1. Add missing `Link` import in `LiveMapMapLibre.jsx`.
2. Increase the three `AppHeader.jsx` action touch targets from 40px to 44px.
3. Optionally change `PostDetailSheet.jsx` to `useBodyScrollLock(!!post)` as defensive hardening, while acknowledging current call sites likely make it unreachable.
4. Optionally change `hardDeleteBroadcast()` to return `{ data: null, error }`, while acknowledging the current caller safely handles thrown mutation errors.
5. Optionally add reduced-motion overrides for animation utility classes declared after the existing reduced-motion block.

#### Codex Deferred Follow-Ups

1. Replace raw `<img>` usage in `BroadcastDetailPage.jsx` with existing optimized image/avatar patterns after checking sizing and visual behavior.
2. Perform a real independent C-001...C-020 pass if the owner still wants a full Codex-vs-Claude comparison. Codex has now read Claude's table, so a clean blind pass would need a separate model/session or should be labeled as a non-blind review.
3. Validate the larger security/database claims against live Supabase before any database or RLS work.

---

### Consensus / Disagreements
**Status: PARTIAL CONSENSUS ONLY** — Claude completed a full 20-critical triage. Codex completed a focused first-pass subset, not a full independent 20-critical triage.

- **Agreement:** The external audit is not a reliable worklist. Several claims were stale or already fixed (`capacitor-storage.js`, `AvatarWithStatus.jsx`, PWA icons per Claude), and the severities are inflated.
- **Agreement:** `C-019` is real but low/latent: `LiveMapMapLibre.jsx` uses `<Link>` without importing it. One-line fix is reasonable.
- **Agreement:** `C-011` is real but low: `BroadcastDetailPage.jsx` has raw `<img>` tags, but fixed dimensions reduce the claimed CLS severity.
- **Agreement:** `C-016` is not a missing reduced-motion implementation. Codex adds nuance that later animation utility classes are declared after the existing reduced-motion block and could be covered by an extra override.
- **Disagreement / nuance on `C-010`:** Claude rates it FALSE because current call sites only mount `PostDetailSheet` when `post` is truthy and the hook cleanup is unconditional. Codex agrees it is likely unreachable today, but still marks the local unconditional `useBodyScrollLock(true)` before a null guard as a low-risk defensive cleanup if the file is touched.
- **Disagreement / nuance on `C-012`:** Claude rates it FALSE because the sole caller uses a React Query mutation and catches throws. Codex agrees there is no uncaught runtime bug, but still marks the function as inconsistent with the module header's `{ data, error }` contract.
- **Three-way agreement (Claude Code + Codex + Kimi, 2026-05-31):** All three independently read the source. Unanimous: **zero of the 20 named CRITICALs are actually critical**; the audit is a lead generator, not a worklist. The DB/security verdicts (C-003 FALSE, C-005 CONFIRMED, C-017 CONFIRMED) are now confirmed by all three independently — no longer resting on Claude's sub-agents alone.
- **Resolved disagreement — C-009 (ViewportProvider memo):** Kimi initially rated it "zero risk." Claude Code and Codex both corrected this: `ViewportProvider` feeds `keyboardHeight`/layout phase into the iOS chat-keyboard flow (commit `99e72a0`), so a `useMemo` with an incomplete dependency list would silently freeze keyboard tracking. **Final team position: C-009 is OPTIONAL, line-by-line reviewed, and iPhone-keyboard-verified — NOT an automatic/improvised change.** Held out of the approved batch.
- **Correction — C-017 (getEventRsvpCounts):** The audit's suggested `select('id', { count: 'exact', head: true })` is **WRONG** — `getEventRsvpCounts` returns *per-broadcast* counts and `head:true` returns only a grand total, which would break the per-event breakdown. The correct fix is a `GROUP BY` RPC, but that creates a code→DB dependency with a deploy-ordering hazard given the diverged migration history. **C-017 pulled from the mechanical batch → Claude-led optional follow-up only.**
- **Owner decision (2026-05-31):** Owner approved the **Protected Behaviors** section (see top of file) and a tightly-scoped fix batch. **Kimi executes all approved code work.** Behavior-neutral items approved (C-019, C-005); H-027 owner-gated (visual change); everything else held. See Approved Task below. Governing rule from owner: *if any fix would alter the app's intended behavior, it is left out.*

---

### Approved Task for Kimi
**Status: DONE — All phases executed, committed, and pushed. Build (lint + typecheck + build) passed for both phases. Awaiting Claude Code review.**

**Global rules for this task (from owner, 2026-05-31):**
- Execute ONLY the changes specified below, character-for-character. No refactoring, no cleanup of adjacent code, no extra files.
- Every change here was chosen because it does NOT alter the app's intended behavior. If, while implementing, you find ANY change would alter intended behavior or touch a **Protected Behavior** (top of file), STOP and flag it in this file — do not push it.
- **Per-phase workflow:** implement the phase (agent swarm may parallelize across the *different* files within a phase) → run `npm run lint` **and** `npm run typecheck` **and** `npm run build` → ONLY if all three pass, `git commit` then `git push origin main` for that phase → then start the next phase. Never advance past or push a red build; fix it within the phase first.
- One commit per phase, clear message (e.g. `fix(audit): phase 1 — behavior-neutral client fixes (C-019, C-010, C-012)`).
- **Do NOT touch the HELD items** (H-027, C-011, C-009, C-017, and the do-not-touch list at the bottom).
- When ALL phases are done: append an **AI Handoff Log** row summarizing what shipped (with commit hashes), set this task's Status to DONE, and leave the result for Claude Code review.

---

#### PHASE 1 — behavior-neutral client code (3 independent files; swarm-parallel safe)

**Fix 1 — C-019: add the missing `Link` import.**
- File: `src/features/map/components/LiveMapMapLibre.jsx`
- Find this exact line (near the top imports):
  ```js
  import { cn } from '@/lib/utils.js';
  ```
- Insert a new line immediately AFTER it:
  ```js
  import { Link } from 'react-router-dom';
  ```
- Nothing else changes. (`<Link>` is already used at line ~238 inside `SignalListItem`; this only supplies the missing import. The component is not mounted on the radar variant today, so runtime behavior is unchanged — this only prevents a latent crash if a non-`radar` variant is ever rendered.)
- **Verify:** lint + typecheck pass. No visual/behavior change expected.

**Fix 2 — C-010: make the scroll lock defensive in `PostDetailSheet`.**
- File: `src/features/profile/components/PostDetailSheet.jsx`
- Find this exact line (~line 25):
  ```js
  useBodyScrollLock(true);
  ```
- Replace it with:
  ```js
  useBodyScrollLock(!!post);
  ```
- Behavior-neutral: both call sites only mount this component when `post` is truthy, so `!!post` evaluates to `true` exactly when it does today. This only hardens against a future call site that could mount it with a null post. No visible change.
- **Verify:** lint + typecheck pass.

**Fix 3 — C-012: make `hardDeleteBroadcast` return `{ data, error }` instead of throwing.**
- File: `src/features/broadcast/api/broadcast-api.js`
- Find this exact function:
  ```js
  export async function hardDeleteBroadcast(id) {
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) throw error;
    return { data: null, error: null };
  }
  ```
- Replace ONLY the line `if (error) throw error;` **inside this function** with:
  ```js
    if (error) return { data: null, error };
  ```
- Behavior-neutral: the sole caller (`AdminReportsPage.jsx`) does `const { error } = await hardDeleteBroadcast(...); if (error) throw error;` — so on error the same exception still reaches the same React Query handler. Success path unchanged. (Do NOT change the other functions in this file that also throw.)
- **Verify:** lint + typecheck pass.

---

#### PHASE 2 — additive DB migration (no runtime dependency)

> **⚠️ SUPERSEDED / REVERTED (2026-05-31, Claude Code).** This migration was created by Kimi (`06db5ab`) then **removed** in a follow-up commit. When Claude Code went to apply it to the live DB via Supabase MCP, the live `get_live_map_presence` turned out to be a **completely different, already-hardened, 4-argument function** (`viewer_lat, viewer_lng, radius_miles, exclude_user_ids`) that is already `STABLE` + `SET search_path = public, auth`, with full distance/self/block filtering. The `function_search_path_mutable` advisor does **not** list it — **C-005 is already fixed on live.** The migration below targets a stale **zero-arg** snapshot; applying it would NOT replace the live function (different signature) but would **create a second, far more permissive zero-arg overload** that leaks all visible presence with no distance/self/block filtering and a wrong `search_path` (missing `auth`). That is a security regression + Protected Behavior violation, so the file was pulled. **C-005 is CLOSED — already resolved on live. Do not recreate this migration.** The local migration history is confirmed diverged from live; any future DB function work must verify live-vs-local first. (Real remaining `function_search_path_mutable` instances live on OTHER functions — `update_broadcast_location`, `lock_connection_request_participants`, `set_updated_at`, `update_conversation_last_message` — Claude-led follow-up, verify-against-live first.)

**Fix 4 — C-005 (REVERTED — see warning above): harden `get_live_map_presence()` (additive DB migration).**
- ~~Create a NEW file (do not edit any existing migration):~~
  `supabase/migrations/20260531_harden_get_live_map_presence_search_path.sql` — **REMOVED.**
- Exact file contents:
  ```sql
  -- Hardening: pin search_path and mark STABLE on get_live_map_presence().
  -- Additive and behavior-preserving. The function body is identical to the
  -- original (20260512_live_map_presence_server_time.sql); only volatility
  -- (STABLE) and SET search_path are added. It reads only public.live_map_presence
  -- and now() — no PostGIS dependency — so search_path = public, pg_temp is safe.
  -- Resolves Supabase advisor: function_search_path_mutable.

  CREATE OR REPLACE FUNCTION get_live_map_presence()
  RETURNS TABLE (
    user_id uuid,
    display_name text,
    avatar_url text,
    vehicle_label text,
    is_visible boolean,
    location_precision text,
    lat double precision,
    lng double precision,
    accuracy_meters int,
    approximate_radius_miles numeric,
    source text,
    last_seen_at timestamptz,
    expires_at timestamptz,
    updated_at timestamptz
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  BEGIN
    RETURN QUERY
    SELECT
      p.user_id,
      p.display_name,
      p.avatar_url,
      p.vehicle_label,
      p.is_visible,
      p.location_precision,
      p.lat,
      p.lng,
      p.accuracy_meters,
      p.approximate_radius_miles,
      p.source,
      p.last_seen_at,
      p.expires_at,
      p.updated_at
    FROM live_map_presence p
    WHERE p.is_visible = true
      AND p.expires_at > now()
    ORDER BY p.last_seen_at DESC
    LIMIT 250;
  END;
  $$;

  -- Preserve execute grant (CREATE OR REPLACE keeps existing privileges; included for clarity).
  GRANT EXECUTE ON FUNCTION get_live_map_presence() TO authenticated;
  ```
- **Do NOT attempt `supabase db push`** (migration history is diverged — it fails). Just create the file. **Application to the live DB is a separate Claude-Code-led step** (via Supabase MCP / SQL editor) after owner approval. The app works whether or not this is applied yet (no code depends on it), so there is no deploy-ordering risk. Protected Behavior #8 satisfied: additive only.

---

#### HELD — do NOT touch (owner decision 2026-05-31)

**Owner explicitly deferred these THREE — the payoff is small and the regression risk is higher. They compile/pass the build but can ONLY be verified safe by on-device iPhone testing, so they are held until the owner wants them done with that verification:**
- **H-027** — AppHeader touch targets 40px → 44px. Visible UI/layout change (could nudge header height/alignment). HELD.
- **C-011** — `BroadcastDetailPage` raw `<img>` → `OptimizedImage`. Visible layout/aspect risk on the hero image + avatars. HELD.
- **C-009** — `ViewportProvider` `useMemo`. Feeds the iOS chat-keyboard flow (Protected Behavior #3, commit `99e72a0`); a wrong dependency list would silently freeze keyboard height. Low payoff, real downside. HELD.

**Other items — not for Kimi:**
- **C-017** — `getEventRsvpCounts`: the audit's `head:true` suggestion is WRONG (breaks per-broadcast counts). Correct fix needs a `GROUP BY` RPC with deploy-ordering care → **Claude Code follow-up only**.
- **C-001 / C-006 / C-007 / C-008 / C-013 / C-020** — do NOT touch (auth/cookie rewrite, offline page, Bike Down queue, auth→useQuery, sign-out behavior, notification-filter change). C-007 is a ChatGPT/owner product decision.
- Everything else from the audit is FALSE, already-fixed, or too inflated/unspecified to action.

---

### Focused Swarm Audit (9 Sweeps, 2026-05-31) — Triage

**Source:** Owner ran a second, focused 9-sweep swarm (~96 findings, one theme per agent). Claude Code triaged it read-only with live-DB verification.

**Headline:** Same stale-checkout flaw as the 508-item audit — three claims are provably false (live `get_live_map_presence` already hardened; `AvatarWithStatus.jsx` exists; `SafetyActions.jsx` is a complete 313-line component, not "404/14 bytes"). BUT the *code-level* sweeps (2, 5, 6, 7) verified largely accurate.

| Sweep | Verdict |
|---|---|
| 1 — Supabase Security (17) | ⛔ FALSE / unverifiable — stale local migrations ≠ live; RLS "missing policy" claims self-refuting (app works daily). No action without live verification. |
| 2 — Silent failures (13) | ✅ CONFIRMED at code level — calls lack `.select()` row-count checks. ⚠️ NOT a safe blind batch (see read-back caveat). `deletePost` storage-before-delete ordering = real latent bug. |
| 3 — Realtime leak (1) | Known (= C-020). Low, fails-open. |
| 4 — Waterfalls (4) | Real, Low. Message-image N+1 needs infra (skip). |
| 5 — Re-renders (3) | NotificationsPage memo = safe. **ViewportProvider memo = C-009, HELD** (iOS keyboard, Protected Behavior #3). Audit wrongly calls it "zero-risk." |
| 6 — Loading/error states (5) | Mixed. `blockedIds ?? new Set()` guard = clean win (approved for Kimi). Error-state surfacing adds visible UI. |
| 7 — API contract (14) | Real, mostly Low (C-012 class; callers re-throw / RQ catches). |
| 8 — Dead code (missing files = FALSE; exports = real) | Missing-files false. Dead exports real but Low-value cleanup (violates minimum-viable-change). |
| 9 — A11y (35) | Real but **visible** (H-027 class, owner-gated). Some files already comply. |

**⚠️ Read-back caveat (the trap the audit missed):** adding `.select()` to a `.delete()`/`.update()` requires the row to be readable under that table's RLS SELECT policy (see "Supabase — Key Behaviors"). On a table whose SELECT policy hides the post-update state, `.select()` returns 0 rows *on success*, turning a working mutation into a false failure. So Sweep 2's "SAFE_TO_BATCH: yes" is wrong — each fix is a per-table, RLS-verified, Claude-led job, NOT a Kimi mechanical batch.

**Done by Claude Code (2026-05-31):** Sweep 2 safety-flow fixes for `removeBroadcast` + `resolveBroadcast` (Bike Down) in `broadcast-api.js` — added `.select('id')` + 0-row detection so a blocked/no-op update surfaces an error instead of false success. **Verified safe against live RLS first:** both PERMISSIVE SELECT policies on `broadcasts` include `auth.uid() = author_id`, so the author always reads back their own row even after `status='expired'` — no read-back trap. Success-path UX is identical; only the (currently silent) failure path now surfaces. Callers (`useRemoveBroadcast`/`useResolveBroadcast`) already `if (error) throw` → toast. Build green.

#### Sweep 2 — remaining items resolution (Claude Code, 2026-05-31)
Every remaining item was checked against the **live RLS SELECT policy** for its table (the read-back gate). Result: 4 safe, 7 intentionally skipped.

**✅ FIXED (read-back verified safe; `.select('id')` + 0-row detection added):**
| Function | Table | Why safe |
|---|---|---|
| `removeFriendship` | `friendships` | SELECT policy == DELETE policy (`auth.uid() IN (user_a,user_b)`) → deleter always reads back. |
| `removeBlock` | `user_blocks` | SELECT == DELETE (`is_admin() OR blocker_user_id=auth.uid()`) → safe incl. admin. |
| `declineConnectionRequest` | `connection_requests` | Recipient (`to_user_id`) is in the SELECT policy → reads back the declined row. |
| `deletePost` | `user_posts` | SELECT covers owner + admin. **Also reordered: storage cleanup now runs only AFTER the confirmed row delete** (fixes the orphaned-image bug — previously storage was wiped before a delete that could be silently blocked). |

**⛔ SKIPPED — do NOT blindly add `.select()` (each would create a NEW bug or hide a deeper one):**
| Function | Reason | Real fix (needs owner approval) |
|---|---|---|
| `cancelConnectionRequest` | **`connection_requests` has NO DELETE policy at all** — the delete is already RLS-blocked server-side, so cancel is non-functional today. Adding `.select()` would just turn the silent no-op into a constant error toast. | Add a DELETE policy (`auth.uid()=from_user_id AND status='pending'`) via additive migration, THEN add the 0-row check. |
| `acceptConnectionRequest` | Its 0-row path is an **intentional optimistic-lock race** (`.eq('status','pending')`), not an RLS silent failure. A strict 0-row=error would break graceful double-accept handling. | Leave as-is. |
| `deletePostComment` | **Read-back trap.** SELECT policy = `(post visible) AND (NOT blocked)` with no `is_admin` bypass. Admin moderating a private post, or an owner deleting a blocked user's comment, deletes successfully but `.select()` returns 0 rows → false failure. | Use a `SECURITY DEFINER` RPC that deletes + returns a count, or align SELECT policy. |
| `deleteBroadcastComment` | **Read-back trap.** SELECT = `can_view_active_broadcast(broadcast_id)`; deleting a comment on an expired/hidden broadcast (or as admin) can't read back → false failure. | Same RPC approach. |
| `deleteMessage` | Sender-deletes-own is safe, but it's **also called by admin moderation** (`AdminReportsPage`) and the DELETE policy is `from_user_id=auth.uid()` with no `is_admin` → admin message deletion is already RLS-blocked. `.select()` would expose that as an error in the admin tool. | Add admin DELETE policy or moderation RPC first. |
| `hardDeleteBroadcast` | Admin-only function, but the only DELETE policy on `broadcasts` is `auth.uid()=author_id` (no `is_admin`) → admins **cannot** hard-delete others' broadcasts today; it silently no-ops. `.select()` would surface a pre-existing capability gap. | Add admin DELETE policy via migration, then add the 0-row check. |
| `updateBroadcast` | Read-back is safe (author SELECT), but its contract is throw-based + returns `{id}` (a Sweep 7 inconsistency). Best fixed together with the Sweep 7 contract pass, not piecemeal. | Combined Sweep 2+7 pass. |

**Net:** the careful per-table check turned a "13 zero-risk fixes" audit claim into **6 shipped real fixes** (2 safety-flow + 4 here) and surfaced **3 latent server-side RLS gaps** (`cancelConnectionRequest`, `deleteMessage`-admin, `hardDeleteBroadcast`-admin) that the audit never noticed — these are the genuinely valuable finds and need additive migrations + owner approval before any client change.

**Update (2026-05-31) — the 3 RLS gaps are now FIXED at the DB level.** Owner approved; Claude Code applied an additive migration to live (`iygtbcserdmvhhjicyyp`) via Supabase MCP: new PERMISSIVE DELETE policies `admin_delete_broadcasts` (`is_admin()`), `admin_delete_messages` (`is_admin()`), and `senders_can_cancel_connection_requests` (`auth.uid() = from_user_id`). Existing author/sender policies preserved (permissive OR). Verified on live + `get_advisors` shows no new advisory. Local file: `supabase/migrations/20260531_add_admin_delete_and_cancel_request_policies.sql`. **Empirical pre-check:** confirmed admin moderation had never actually deleted *another* user's content — the only ever "remove content" action targeted an admin's *own* broadcast (worked under the author-only policy), so no production data was wrongly retained; the gap was purely forward-looking. **Client hardening DONE (2026-05-31):** added `.select('id')` + 0-row detection to `hardDeleteBroadcast`, `deleteMessage` (throw-style, admin-moderation-only), and `cancelConnectionRequest` (the `.eq('status','pending')` race now surfaces as "already handled" instead of false success). Read-back verified safe (admin SELECTs via `is_admin()` policies; sender SELECTs own request). Build green. This closes the entire Sweep 2 thread.

#### Approved Task for Kimi — `blockedIds` crash guard (one line, behavior-neutral)
- File: `src/features/broadcast/pages/BroadcastFeedPage.jsx`
- Find (~line 140, inside the `useNearbyBroadcasts(...)` args):
  ```js
  Array.from(blockedIds)
  ```
- There are **two** occurrences (the `useNearbyBroadcasts` call ~line 140 and the `useLiveMapPresence` `blockedUserIds` ~line 149). Replace **both** with:
  ```js
  Array.from(blockedIds ?? new Set())
  ```
- Behavior-neutral: `useBlockedIds()` returns a Set today, so `?? new Set()` only triggers if it's ever `undefined` — preventing a `TypeError` that would crash the entire radar page. No visible change.
- **Verify:** lint + typecheck + build. Then commit + push per standard workflow. Do NOT touch anything else from the 9-sweep audit — the rest is FALSE, HELD, visible, or Claude-led (see triage table above).

---

### AI Handoff Log
| Session | AI Used | What Was Done |
|---|---|---|
| 2026-05-31 | Claude Code | **Navigation Speed initiative VERIFIED — DONE.** Reviewed Kimi's 4-phase batch against spec: F1 prefetch helpers correctly aligned to page query keys/shapes (the critical check — broadcast `getBroadcastById`/`broadcastKeys.detail`, rider `getProfileByUserId`/`['profile',userId]`/30s), `withRoutePreload` extension + RideCard/RadarBottomSheet wiring correct, F2/F3/F5 correct, held messages path untouched, no Protected Behaviors touched, build green. Earlier this session also fixed the MapLibre 918 KB chunk-leak (`439bbda`) — the biggest win. Initiative status set to DONE-verified. Remaining (intentional): F1c messages prefetch (Claude-led, chat), Kimi#5 waterfall, Kimi#6 public-route blank. **Owner on-device check recommended:** `/home` radar renders; ride-card/rider taps show data instantly; first post-login load lighter. |
| 2026-05-31 | Kimi | **Shipped Navigation Speed batch (all 4 phases).** Phase 1 (`f863e52`): F1 — aligned `prefetchBroadcastDetail` to use `getBroadcastById` (matching `BroadcastDetailPage` hook) and `prefetchRiderProfile` to use `getProfileByUserId` with `staleTime: 30000` (matching `RiderProfilePage`); extended `withRoutePreload` with optional `dataLoader` 2nd arg; wired data prefetch on intent at `RideCard.jsx:258` (`prefetchBroadcastDetail(qc, broadcast.id)`) and `RadarBottomSheet.jsx:80` (`prefetchRiderProfile(qc, userId)`). Phase 2 (`8fa023d`): F2 — added `withRoutePreload` to all 3 `BottomNav` tabs (Radar, Comm., Profile) so chunks preload on hover/touch intent. Phase 3 (`d3bf9fa`): F3 — raised global `gcTime` from 5min to 30min so cached query data survives longer between navigations. Phase 4 (`4c4dc47`): F5 — deleted dead `vendor-leaflet` `manualChunks` branch in `vite.config.js` (Leaflet confirmed absent from `package.json`). All behavior-neutral perf wins; no Protected Behaviors touched. Messages prefetch remains HELD per task spec. **Next:** owner on-device verification + Claude Code review. |
| 2026-05-31 | Claude Code | **Splash final polish VERIFIED — initiative fully DONE.** Per owner, added a `RIDE RADAR` wordmark and cropped the logo for a clean fit: generated `public/logo-mark.png` (tight crop of the green art via PIL, original `logo.png` untouched), switched the splash to it with `max-w-[88vw]` (dropped the `104vw` overflow trick), and added the wordmark beneath (soft neon glow + first-launch fade-up + gentle glow-pulse synced to the logo breathing). Commit `6a59f9d`. Owner approved. Status = VERIFIED. Splash/loading initiative is complete. |
| 2026-05-31 | Claude Code | **Splash "Alive Logo" VERIFIED on device — initiative DONE.** After the B→C cinematic failed on device (competing loaders / clutter), shipped + iterated the unified alive-logo loader: removed the glow box (breathing is scale-only), and scaled the logo to `w-[104vw]` so the green art fills the width (black padding overflows invisibly) — owner approved ("looks great I love it"). Commits: `9384d8d`/`ea35ce2`/`5adf1a3` (Kimi build), `d5036ab` (first-launch stability fix), `914a1c5` (glow removal + responsive size), `c6a6ba4` (green-fills-width). Status set to VERIFIED. Optional future polish (not requested): crop `logo.png` to a tight transparent asset for an exact edge-fit without the overflow technique. |
| 2026-05-31 | Kimi | **Shipped REVISED "Alive Logo" splash (all 3 phases).** Phase 1 (`9384d8d`): rewrote `PageLoader.jsx` — single unified alive-logo loader with gentle breathing scale+glow (`rr-brand-breathe` 2.6s), optional `intro` bloom-in, `exiting` fade, `onSkip` button, reduced-motion static frame, full a11y. Deleted old EKG SVG + inline styles + label. Phase 2 (`ea35ce2`): deleted `SplashScreen.jsx` and its import; unified `AppBootLoader` to always render `PageLoader` (with `intro`/`onSkip` only on first launch) — eliminates the competing-loader overlap that failed on-device. Phase 3 (`5adf1a3`): simplified `index.html` prepaint to clean solid `#040406` + faint radial glow (removed grid/wordmark); cleaned `index.css` — removed all unused `rr-ekg` + `rr-splash-*` keyframes and dead `.rr-ekg` class, added `rr-brand-breathe`/`rr-brand-bloom` to global CSS. Zero dangling references verified. **Next:** owner on-device acceptance checklist + Claude Code review. |
| 2026-05-31 | Claude Code | **Reviewed Kimi's B→C splash diffs + fixed a blocker.** Phase 1 (`index.html`) and Phase 2 (`SplashScreen.jsx` + keyframes) were on-spec. **Blocker in Phase 3 (`App.jsx`):** `firstLaunch` was recomputed inline every render, so once the mount effect set the `rr_splash_seen` sessionStorage flag, the next auth-driven re-render flipped it to `false` and swapped `<SplashScreen>`→`<PageLoader>` mid-cinematic — the unhurried ~3.4s moment never completed. Fixed by capturing `firstLaunch` + `reduced` once via lazy `useState` initializers. Cleaned 3 nits: hoisted `PageLoader`'s `useLayoutEffect` out of JSX; removed dead `index.css` keyframes (`rr-splash-grid-fade`, `rr-splash-cursor`) + the ineffective reduced-motion `@media` block (reduced motion handled in JS); gave the reduced-motion frame an opacity-only exit fade. lint+typecheck+build green. **Next:** owner on-device acceptance test (checklist in the Approved Task). |
| 2026-05-31 | Kimi | **Shipped Splash & Loading "B→C" Premium Polish (all 4 phases).** Phase 1 (`9d3da3f`): instant pre-paint overlay in `index.html` — preload `logo.png`, inline `#rr-prepaint` style + static grid/wordmark, DOM node before module script. Phase 2 (`a3a3956`): new `src/components/splash/SplashScreen.jsx` with 5-phase ~3.4s cinematic (grid→EKG→scan→typed text→logo bloom→holding loop), reduced-motion static frame, skip button, full a11y; appended keyframes to `src/index.css` with reduced-motion override. Phase 3 (`5f94eec`): wired into `AppBootLoader` — `sessionStorage` first-launch gate, `MIN_DISPLAY` 3400ms/600ms, removed dead `longWait` state, conditional `SplashScreen` vs `PageLoader`; added prepaint cleanup to `PageLoader.jsx`. Phase 4: `LoadingState.jsx` already aligned — skipped. All changes behavior-neutral; no Protected Behaviors touched. Held items from prior audit remain untouched. **Next:** owner on-device acceptance checklist + Claude Code review. |
| 2026-05-31 | Claude Code | **Reviewed Kimi's `blockedIds` crash guard (Sweep 6) — APPROVED.** Diff (`95dc0d6` + doc `adefe50`) matches the approved spec verbatim: both `Array.from(blockedIds)` → `Array.from(blockedIds ?? new Set())` (lines 140/149), only `BroadcastFeedPage.jsx` touched, no HELD items disturbed. Re-verified lint+typecheck+build green locally; pulled `main`. **This closes the 9-sweep audit thread** — every actionable item is now shipped, owner-held (ViewportProvider C-009, touch targets H-027/a11y), or documented-and-skipped with a reason. **Session totals (2026-05-31):** reverted the unsafe C-005 migration; shipped 9 silent-failure client fixes across Sweep 2 (`removeBroadcast`/`resolveBroadcast`/`removeFriendship`/`removeBlock`/`declineConnectionRequest`/`deletePost`/`hardDeleteBroadcast`/`deleteMessage`/`cancelConnectionRequest`); applied + verified the additive admin/cancel DELETE RLS migration on live; reviewed both Kimi batches. **Pending owner action:** on-device verification of moderation/safety paths; optional Sweep 2+7 `updateBroadcast` contract pass; held items remain held. |
| 2026-05-31 | Kimi | **Applied approved `blockedIds` crash guard (Sweep 6).** Commit `95dc0d6`: replaced both `Array.from(blockedIds)` with `Array.from(blockedIds ?? new Set())` in `BroadcastFeedPage.jsx` (lines 140, 149 — `useNearbyBroadcasts` and `useLiveMapPresence` args). Behavior-neutral: `useBlockedIds()` returns a Set today, so `?? new Set()` only guards against a future `undefined` that would crash the radar page. Lint + typecheck + build passed. Nothing else from the 9-sweep audit touched. **Next:** Claude Code review. |
| 2026-05-31 | Claude Code | **Fixed the 3 admin/cancel DELETE RLS gaps at the DB level (live).** Empirically verified first that admin moderation had never deleted another user's content (the sole "remove content" action targeted an admin's own broadcast → no data wrongly retained; gap was forward-looking only). Applied additive migration via Supabase MCP: `admin_delete_broadcasts` + `admin_delete_messages` (`is_admin()`) + `senders_can_cancel_connection_requests` (`auth.uid()=from_user_id`). Existing author/sender policies preserved; live-verified; no new advisor. Local record: `supabase/migrations/20260531_add_admin_delete_and_cancel_request_policies.sql`. **Next:** optional client `.select()` 0-row hardening on the 3 functions (now read-back-safe, not required for correctness). |
| 2026-05-31 | Claude Code | **Completed remaining Sweep 2 silent-failure items with per-table live-RLS verification.** Pulled live SELECT/DELETE/UPDATE policies for 7 tables. FIXED 4 (read-back verified safe): `removeFriendship`, `removeBlock`, `declineConnectionRequest`, `deletePost` (+ reordered storage cleanup to after the confirmed delete — fixes orphaned-image bug). SKIPPED 7 with documented reasons: `cancelConnectionRequest` (no DELETE policy → broken server-side), `acceptConnectionRequest` (intentional optimistic lock), `deletePostComment`/`deleteBroadcastComment` (read-back traps for admin/blocked/expired cases), `deleteMessage`+`hardDeleteBroadcast` (admin DELETE RLS gaps), `updateBroadcast` (defer to Sweep 2+7 pass). Surfaced 3 latent server-side RLS gaps needing additive migrations + owner approval. Build green. **Next:** owner decision on the 3 RLS-gap migrations; optional combined Sweep 2+7 contract pass. |
| 2026-05-31 | Claude Code | **Triaged the focused 9-sweep swarm audit (~96 findings) + shipped Sweep 2 safety-flow fixes.** Same stale-checkout flaw as the 508 audit (3 claims provably false on live). Verdict table written above. Verified live `broadcasts` RLS SELECT policies before touching code — confirmed `.select()` read-back is safe (author-id clause). Added `.select('id')` + 0-row detection to `removeBroadcast` + `resolveBroadcast` (Bike Down silent-failure hardening); success UX unchanged, build green. Spec'd a one-line `blockedIds ?? new Set()` crash guard as an approved Kimi task. Everything else (Sweep 1 false, ViewportProvider/touch-targets held, dead-code low-value) left out. **Next:** Kimi executes the `blockedIds` guard; optional Claude-led continuation on remaining Sweep 2 items (each RLS-verified). |
| 2026-05-31 | Claude Code | **Reviewed Kimi's audit batch + reverted the C-005 migration.** Verified all Phase 1 code diffs (C-019/C-010/C-012) match the approved spec verbatim and that no HELD files were touched — batch APPROVED, stays on `main`. Then, applying C-005 to live via Supabase MCP, discovered the live `get_live_map_presence` is a different, already-hardened **4-arg** function (`STABLE`, `search_path = public, auth`, full distance/self/block filtering); the `function_search_path_mutable` advisor does not list it. C-005 was **already fixed on live**. Kimi's migration targeted a stale zero-arg snapshot and, due to the signature mismatch, would have created a **second, far more permissive overload** (leaks all presence, no filtering, wrong search_path) — a security/Protected-Behavior regression. **Removed** the migration file (`supabase/migrations/20260531_harden_get_live_map_presence_search_path.sql`), marked C-005 CLOSED, and documented the live-vs-local migration divergence. Live DB was NOT modified. **Next:** optional Claude-led pass on the genuinely-mutable functions (`update_broadcast_location`, `lock_connection_request_participants`, `set_updated_at`, `update_conversation_last_message`), verifying live-vs-local first. |
| 2026-05-31 | Kimi | **Executed approved 2-phase audit fix batch.** Phase 1 (`ccb445f`): C-019 added missing `Link` import in `LiveMapMapLibre.jsx`; C-010 changed `useBodyScrollLock(true)` → `useBodyScrollLock(!!post)` in `PostDetailSheet.jsx`; C-012 changed `hardDeleteBroadcast` to return `{ data: null, error }` instead of throwing. Phase 2 (`06db5ab`): created additive migration `20260531_harden_get_live_map_presence_search_path.sql` pinning `search_path = public, pg_temp` and adding `STABLE` to `get_live_map_presence()`. All changes behavior-neutral. Lint + typecheck + build passed for both phases. Held items untouched: H-027, C-011, C-009, C-017, and the full do-not-touch list. **Next:** Claude Code review of the diff. |
| 2026-05-31 | Claude Code | **Owner finalized the Kimi execution plan.** Owner reviewed the 3 behavior-sensitive fixes (H-027 header sizes, C-011 broadcast images, C-009 viewport memo) and chose to HOLD all three (low payoff / higher regression risk / only verifiable on iPhone). Approved Task rewritten as a 2-phase agent-swarm plan for the 4 behavior-neutral fixes — Phase 1: C-019 `Link` import + C-010 defensive scroll-lock + C-012 `hardDeleteBroadcast` return contract; Phase 2: C-005 additive DB migration. Owner directed Kimi to commit + push to `main` after each phase whose build (`lint` + `typecheck` + `build`) passes, and to update this log + task status when done. C-017 remains Claude-led; the do-not-touch list stands. **Next:** Kimi executes the phased plan from the Approved Task section. |
| 2026-05-31 | Claude Code | Finalized audit triage after three-way independent agreement (Claude+Codex+Kimi). Owner approved a **Protected Behaviors** section (added at top of file) and a tightly-scoped fix batch. Wrote precise fix-by-fix **Approved Task for Kimi**: Tier 1 (behavior-neutral, approved now) = C-019 `Link` import + C-005 additive DB hardening migration; Tier 2 (owner-gated, visual) = H-027 44px touch targets. Caught and corrected the C-017 trap (audit's `head:true` suggestion breaks per-broadcast counts → pulled from Kimi batch, now Claude-led). C-009 held (iOS keyboard regression risk). |
| 2026-05-31 | Kimi | Organized the 508-audit findings into structured comparison-ready listings under `audit-listings/` — CRITICAL.md, HIGH.md, MEDIUM.md, LOW.md, by-file CROSS_REFERENCE.md, by-category CATEGORY_BREAKDOWN.md, and README index. These are for Codex/Claude comparison; they do NOT imply the findings are verified. See CLAUDE.md Current Active Task for triage status. |
| 2026-05-31 | Codex | Added Codex's focused first-pass inspection report for the 2026-05-31 comprehensive audit. Confirmed stale/false claims for missing `capacitor-storage.js` and `AvatarWithStatus.jsx`; confirmed low-severity issues around missing `Link` import, raw `<img>` usage, AppHeader 40px touch targets, and nuanced local concerns for `PostDetailSheet` scroll lock and `hardDeleteBroadcast()` return contract. Logged partial consensus/disagreements against Claude's full triage. No code changes applied; no Kimi task approved. |
| 2026-05-31 | Claude Code | Independent triage of the 2026-05-31 "Comprehensive Codebase Audit Report" (508 claimed findings). Verified all 20 named CRITICALs (C-001…C-020) read-only via direct checks + 3 parallel sub-agents tracing full enforcement/caller paths. Result: **8 FALSE, 6 INFLATED, 6 CONFIRMED — zero actually critical** (all confirmed items Low/Low-Med). At least one auditor used a stale checkout (C-002/C-003/C-018 false); C-016 describes an already-shipped fix. Full verdict table written to Claude Code's Findings. Candidate Low-severity residue listed under Approved Task (NOT approved). **Next:** Codex runs its own independent pass on the same 20 before any consensus or Kimi work. |
| 2026-05-30 | Claude Code + Codex + Kimi | Radar "Locate me" no longer centered/zoomed. Three-way independent investigation reached unanimous root cause: a misplaced cleanup `return` on the `map.resize()` line in `MapLibreFitToItems` (`LiveMapMapLibre.jsx`) made all `flyTo`/`fitBounds` camera logic unreachable dead code. Kimi applied the approved fix (relocated RAF cleanup so every exit path returns it and the camera branches are reachable). Claude Code verified the diff against the approved task — matches verbatim; lint + typecheck pass. Awaiting iPhone PWA verification. Secondary watch item (raised by Codex): `autoFitDisabled` (lines ~801/962) could block recenter after manual pan, but the `fitKey` reset effect (~815-817) already handles it — test case 3 below confirms. |
| 2026-05-29 | Claude Code | Post-fix independent verification of DM page fix. Confirmed fix correct in source. Updated findings section with full independent report. Flagged open question: same latent `authIsLoading` bug may exist in `/broadcast/:id` and `/profile/:userId`. |
| 2026-05-28 | Codex | Independently inspected `/messages/:id` chat page issue. Confirmed the current working tree already includes the auth-loading guard fix in `src/features/chat/pages/ConversationPage.jsx`, no local diff remains, and the remaining risk is whether the deployed build includes that change. |
| 2026-05-28 | Claude Code | Diagnosed DM page failure — ruled out RLS/schema, confirmed auth timing race as root cause, wrote findings above awaiting Codex review |
| 2026-05-28 | Kimi | Connected all 3 AIs to MCP servers (GitHub, Supabase, Vercel); created `.mcp.json`; added AI Team Charter, Dead Ends, Current Active Task, and AI Handoff Log sections to CLAUDE.md; confirmed Leaflet fully removed |
| 2026-05-28 | Claude browser | Planning session — Vercel/deployment review, CLAUDE.md overhaul, Leaflet cleanup confirmed |
| 2026-05-27 | Kimi | System Collapse — removed 15 runtime files (~5,200 lines), simplified 24+ source files, restored Supabase + React Query as sole data flow systems |

---

## Project Overview

Ride Radar 2.0 is a React-based social network for motorcyclists built on Supabase. The app enables riders to:
- Create and discover nearby rides (broadcasts)
- Message other riders in real-time
- Build connections and manage friendships
- Report safety alerts with geolocation

**Tech Stack:**
- React 18 + Vite 6
- Supabase (auth, database, storage, real-time)
- TanStack Query v5 for data fetching with offline support
- React Router v6 for navigation
- Tailwind CSS 3.4 + Radix UI components (shadcn/ui)
- PostGIS for geospatial queries
- MapLibre GL JS + react-map-gl v8 (maps) — fully migrated, Leaflet completely removed and confirmed absent from dependencies
- PWA (Progressive Web App) with service worker caching
- Capacitor 8 (iOS/Android native shells)
- Deployed on Vercel

**AI Development Tools:**
- Supabase MCP Server (direct database access for Claude Code)
- See `SUPABASE_MCP_SETUP.md` for MCP configuration and authentication

---

## Development Rules — ALWAYS Follow These

These rules override default behavior. Follow them exactly.

1. **Never commit or push without explicit user approval.** The user will say "commit and push" and provide an exact commit message. Do not commit proactively.
2. **Always explain what you plan to change and why before touching any file.** Show the full proposed diff or exact lines before making edits. Wait for approval.
3. **Minimum viable fix only.** Do not refactor, restructure, add abstractions, or clean up unrelated code. Only touch files directly related to the stated issue.
4. **Never change anything outside the specific issue described.** If you need to modify something adjacent, stop and ask first.
5. **Never drop, rename, or alter Supabase columns without explicit approval.** Always prefer additive database changes over destructive ones.
6. **Do not run the app or make database changes unless explicitly instructed.**
7. **When the user provides an exact commit message, use it verbatim — do not reword it.**
8. **After every push, show the output of `git log --oneline -5` and `git status`.**

---

## Testing Workflow

- The app is tested as a PWA on iPhone
- After approved changes, commit and push to main
- User tests via iPhone PWA after each push
- Safari on Mac is used to inspect iPhone console logs via Web Inspector
- Temporary `console.log` statements are acceptable for debugging but must be removed before the final push of any fix

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code (targets src/, excludes src/lib/ and src/components/ui/)
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type check (uses JSDoc types from jsconfig.json)
npm run typecheck

# Preview production build
npm preview

# Run tests
npm run test
```

---

## Environment Setup

Create `.env` file with Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

See `.env.example` for template.

---

## Architecture

### Authentication Flow
- **SupabaseAuthContext** (`src/lib/SupabaseAuthContext.jsx`) wraps the entire app
- Provides: `user`, `profile`, `isAuthenticated`, `isLoading`, `signIn`, `signUp`, `signOut`, `refreshProfile`
- Sessions persist in localStorage with auto-refresh
- Protected routes redirect unauthenticated users to `/login`

### Data Layer (React Query + Supabase)
Custom hooks in `src/hooks/` wrap TanStack Query for Supabase operations:
- **useNearbyBroadcasts** - PostGIS server-side distance calculation with real-time subscriptions
- **useConversations** - List conversations with real-time updates
- **useConversationMessages** - Messages with WebSocket subscriptions
- **useSendMessage** - Optimistic updates for message sending
- **useCreateBroadcast** - Create broadcasts (solo_ride, iso, event, alert)
- **useBlockedProfiles** - Block management
- **useProfileBatch** - Efficient profile lookups (avoids waterfalls)
- **useOnlineStatus** - Detects online/offline network state
- **usePWAInstall** - Manages PWA install prompt and detection

### Real-Time Subscriptions
All real-time features use Supabase subscriptions (WebSockets). Pattern:
1. React Query for initial data fetch
2. `supabase.channel().on('postgres_changes', ...)` for live updates
3. `queryClient.invalidateQueries()` to refetch when changes occur
4. Cleanup subscriptions in `useEffect` return

### Routing Structure
- `/login` - SupabaseLogin page (public)
- `/landing` - Marketing page (public)
- `/onboarding` - First-time profile setup (semi-protected)
- `/home` - Feed with nearby broadcasts
- `/broadcast` - Create new broadcast
- `/broadcast/:id` - Broadcast details with RSVP/connection requests
- `/messages` - Conversation list
- `/messages/:id` - Conversation view (real-time chat)
- `/profile` - Current user profile
- `/profile/:userId` - Other user's profile
- `/notifications` - Connection requests & activity
- `/settings` - Privacy controls

All routes under `/home`, `/messages`, `/broadcast`, `/profile`, `/notifications`, `/settings` use the `Layout` component (bottom navigation bar).

### Component Organization
```
src/
  App.jsx               # Root app + routing
  components/           # Shared components
    ui/                 # Radix UI primitives (shadcn/ui) — DO NOT LINT
  features/             # Feature modules
    admin/
    auth/
    broadcast/          # Broadcasts + RSVP
    chat/
    connections/
    legal/
    map/
    notifications/
    profile/
    safety/
    settings/
  hooks/                # Shared custom hooks
  lib/                  # Core utilities (Supabase client, auth, analytics, etc.)
  providers/
  utils/
```

### Database Schema (Supabase)
Key tables (all have RLS policies):
- `users` - Auth users (from Supabase Auth)
- `user_profiles` - User profile data (display_name, bio, avatar, bike info)
- `broadcasts` - Posts with geolocation (uses PostGIS GEOGRAPHY type)
- `conversations` - Chat threads
- `messages` - Chat messages
- `connection_requests` - Friend requests
- `friendships` - Accepted connections
- `user_blocks` - Blocked users
- `reports` - Safety reports
- `notifications` - Activity feed
- `user_settings` - Privacy preferences (including `analytics_enabled` for opt-out)
- `event_rsvps` - RSVP records for event broadcasts (`interested`, `going`, `maybe`, `not_going`)

**Important:** All geospatial queries use the `get_nearby_broadcasts` RPC function (server-side PostGIS) instead of client-side distance calculations.

### Image Uploads
Images are uploaded to Supabase Storage bucket `uploads`:
- Avatar images: `avatars/{userId}/{filename}`
- Bike photos: `bikes/{userId}/{filename}`
- Event posters: `events/{broadcastId}/{filename}`
- Alert images: `alerts/{broadcastId}/{filename}`

Use `src/lib/localImageUpload.js` for upload logic with validation from `src/lib/uploadValidation.js`.

---

## Supabase — Key Behaviors

- **RLS silent failures:** A DELETE blocked by an RLS USING clause returns `{ error: null, data: [] }` — no error, 0 rows affected. Always use `.select()` on deletes and check `data.length` to distinguish a successful delete from a silently blocked one.
- **Upsert read-back:** After `upsert(...)`, adding `.select().single()` may fail (PGRST116) if the RLS SELECT policy doesn't allow reading the row back. Only read back data when the SELECT policy permits it.
- **Active Supabase project ID:** `iygtbcserdmvhhjicyyp`

---

## PWA (Progressive Web App)

Ride Radar is a fully functional PWA with offline support, installability, and background sync.

**Key Files:**
- `vite.config.js` - PWA plugin configuration (Workbox, caching strategies)
- `public/manifest.json` - PWA manifest
- `src/lib/registerSW.js` - Service worker registration and install prompt
- `src/hooks/useOnlineStatus.js` - Online/offline detection
- `src/components/OfflineBanner.jsx` - Offline status UI

**Service Worker:**
- Registered at `/sw.js?v=velocity` (static query string)
- `skipWaiting: true`, `clientsClaim: true`, `autoUpdate`
- Vercel serves `sw.js` with `Cache-Control: public, max-age=0, must-revalidate`

**Caching Strategies:**
- Map tiles: CacheFirst (14d)
- Supabase Storage images: CacheFirst (30d)
- Fonts: CacheFirst (1yr)
- Supabase REST GET: NetworkFirst (4h)
- Static assets: Precached by Workbox

**iOS Safari known behavior:** Safari checks for SW updates at most once every 24 hours, regardless of HTTP headers. A `?v=velocity` static string cannot force updates — it must change between builds.

### iOS Safari Known Quirks

**iOS Safari — datetime-local input overflow fix:**
`input[type="datetime-local"]` overflows its container on iOS regardless of `width:100%`, `max-width:100%`, or `overflow-hidden` on the parent. The ONLY fix that works is wrapping the input in a flex container with `min-width:0`, and setting `flex:1 min-width:0` on the input itself:
```jsx
<div style={{ display: 'flex', minWidth: 0, width: '100%' }}>
  <Input type="datetime-local" style={{ flex: 1, minWidth: 0 }} />
</div>
```

---

## Linting Configuration
ESLint runs on `src/components/**`, `src/features/**`, `src/hooks/**`, `src/providers/**`, `src/utils/**`, `src/App.jsx`, and `src/main.jsx` (excludes `src/lib/` and `src/components/ui/`). Rules enforce:
- No unused imports (auto-removed with `eslint-plugin-unused-imports`)
- React hooks rules
- No prop-types required (uses JSDoc for types)

---

## Path Aliases
`@/` maps to `src/` directory (configured in `vite.config.js` and `jsconfig.json`):
```javascript
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
```

---

## Analytics & Monitoring

- **Sentry** (`src/lib/sentry.js`) - Error tracking, performance monitoring, session replay
- **Plausible** (`src/lib/analytics.js`) - Privacy-focused, cookieless analytics
- **Web Vitals** (`src/lib/performanceMonitoring.js`) - Core Web Vitals tracking
- **Admin Dashboard** (`/admin/monitoring`) - Real-time system health

**Privacy:** No PII collected, users can opt out via Settings, GDPR compliant.
Analytics only runs in production with proper environment variables configured.

---

## Tailwind Theme
Custom broadcast type colors defined in `tailwind.config.js`:
- `bg-alert` - Red for safety alerts
- `bg-solo` - Blue for solo rides
- `bg-iso` - Purple for "in search of" posts
- `bg-event` - Green for events

These are safelisted to ensure they're included in the build.

---

## Common Patterns

### Creating a new data hook:
```javascript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useMyData(params) {
  return useQuery({
    queryKey: ['my-data', params],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('some_field', params);
      
      if (error) throw error;
      return data;
    },
    enabled: !!params,
    staleTime: 30000,
  });
}
```

### Adding real-time subscriptions:
```javascript
useEffect(() => {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'my_table' },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ['my-data'] });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

---

## MapLibre GL JS

The app uses **MapLibre GL JS** via `react-map-gl` v8 for all maps. Leaflet has been fully removed.

**Critical react-map-gl v8 constraint:** `useMapLibre()` returns a `MapCollection`, NOT the raw map instance. The actual `MapRef` is at `.current`:
```jsx
const map = useMapLibre().current;  // ✅ MapRef — has .getMap()
const mapInstance = map.getMap();    // ✅ MapInstance — raw MapLibre GL API
```

**skipMethods (20 methods NOT proxied by MapRef):** `setMaxBounds`, `setMinZoom`, `setMaxZoom`, `setMinPitch`, `setMaxPitch`, `setRenderWorldCopies`, `setProjection`, `setStyle`, `addSource`, `removeSource`, `addLayer`, `removeLayer`, `setLayerZoomRange`, `setFilter`, `setPaintProperty`, `setLayoutProperty`, `setLight`, `setTerrain`, `setFog`, `remove`

Any of these MUST be called on `mapInstance` (from `.getMap()`), NOT on the `MapRef`.

**Ref vs. current trap:** When passing a map ref to a hook, pass the ref OBJECT, not `ref.current`:
```jsx
// ❌ Stale closure — captures null at render time
const { showPopup } = useMapLibrePopup(mapRef.current);

// ✅ Live ref read — reads .current at execution time
const { showPopup } = useMapLibrePopup(mapRef);
```

### Map Files
- `src/features/map/components/LiveMapMapLibre.jsx` — Main radar map
- `src/features/broadcast/components/LocationPickerMap.jsx` — Pin placement map for event/alert/bike_down forms
- `src/features/broadcast/components/AlertPinMap.jsx` — Re-exports LocationPickerMap

---

## Current Known Issues

| Issue | Status | Notes |
|---|---|---|
| RSVP toggle deselect | FIXED | Resolved. Root cause was vercel.json invalid wildcard pattern silently failing all deploys. |
| PWA iOS SW update delay | Investigated, no fix applied | iOS Safari 24hr SW update throttle + static `?v=velocity` string. |
| Supabase migration history diverged | 🚨 Active | ~40 remote-only migrations not in local repo. `db push` fails. Manual SQL application required. **Confirmed dangerous 2026-05-31:** local migration files can describe a *stale* version of a live object (e.g. `get_live_map_presence` is 4-arg + hardened on live but 0-arg in local migrations). ALWAYS verify the live object via Supabase MCP (`pg_get_functiondef` / `get_advisors`) before applying any DB change — a `CREATE OR REPLACE` against a stale signature creates a divergent overload, not a replacement. |
| Sentry fetch failures | 🚨 Active | POST to ingest endpoint failing — likely rate-limited or CORS. Not user-facing. |
| requestAnimationFrame jank | 🚨 Active | 199ms frame time on lower-end devices. Needs React profiling. |
| Direct messaging page fails to load | FIXED — awaiting iPhone PWA verification | `ConversationPage.jsx` now includes `authIsLoading` in its loading guard (commit `d6823ce`, 2026-05-29). Open follow-up: audit `/broadcast/:id` and `/profile/:userId` for the same latent pattern. |
| Radar "Locate me" locates but doesn't center/zoom | FIXED — verified on iPhone PWA (2026-05-30) | Misplaced cleanup `return` after `map.resize()` in `MapLibreFitToItems` (`LiveMapMapLibre.jsx`) made the `flyTo`/`fitBounds` camera logic unreachable. Fix relocates the RAF cleanup to every exit path so the camera branches run (commit `45b55ef`). Verified on device: all three cases pass — locate w/ no prior fix, locate when already located, and locate after a manual pan (`autoFitDisabled` reset confirmed working). |
| 2026-05-31 "Comprehensive Codebase Audit Report" (508 findings) | TRIAGED + behavior-neutral batch shipped | Claude Code verified all 20 named CRITICALs (C-001…C-020): **8 FALSE, 6 INFLATED, 6 CONFIRMED — none actually critical**. Kimi shipped the 3 behavior-neutral client fixes (C-019/C-010/C-012, commit `ccb445f`) — reviewed & approved. C-005 DB migration was created then **reverted**: live verification showed it was already fixed on live and the file would have created an insecure overload (see AI Handoff Log + Phase 2 warning). HELD: H-027, C-011, C-009. C-017 = Claude-led. Do not action the report as a worklist. |
| 2026-05-31 Focused 9-sweep swarm audit (~96 findings) | TRIAGED — Sweep 2 thread CLOSED | Same stale-checkout flaw (Sweep 1 false, 3 claims disproven on live). **Sweep 2 silent-failure hardening shipped** (commits `ddd8a14`, `0b6646a`, `9e751aa`): `.select()` + 0-row detection on `removeBroadcast`/`resolveBroadcast` (Bike Down), `removeFriendship`/`removeBlock`/`declineConnectionRequest`/`deletePost` (+ storage-orphan reorder), `hardDeleteBroadcast`/`deleteMessage`/`cancelConnectionRequest` — each verified safe against live RLS read-back. Skipped `acceptConnectionRequest` (intentional optimistic lock), `deletePostComment`/`deleteBroadcastComment` (read-back traps), `updateBroadcast` (Sweep 2+7 combined later). Full triage + per-table reasoning in the Focused Swarm Audit section above. Other sweeps: HELD (ViewportProvider C-009, touch targets) or low-value (dead code). `blockedIds` guard = pending Kimi task. |
| Admin moderation / cancel-request DELETE RLS gaps | FIXED (live) — awaiting iPhone verification | Discovered during Sweep 2 (2026-05-31): admins could not delete other users' broadcasts/messages (DELETE policies were author/sender-only, no `is_admin`) and `connection_requests` had **no DELETE policy** so cancel silently no-op'd. Empirically confirmed no prior admin deletion of others' content ever succeeded (no data wrongly retained). Fixed via additive migration `20260531_add_admin_delete_and_cancel_request_policies.sql` (live-applied + verified, commit `1ceb29c`): `admin_delete_broadcasts`, `admin_delete_messages`, `senders_can_cancel_connection_requests`. **Verify on device:** admin "remove content" on another user's broadcast/message disappears; sent-request cancel sticks after refresh. |

---

## Deferred Follow-Ups (owner-gated, to do later)

Two non-urgent items parked here so they aren't lost. Neither is blocking; both need the owner + a real iPhone.

### 1. On-device verification of the shipped moderation/safety fixes (DO THIS — free, ~5 min)
The Sweep 2 + RLS-gap fixes (commits `ddd8a14`, `0b6646a`, `9e751aa`, `1ceb29c`) passed build + live-RLS checks but have NOT been tapped through on the device. A green build does not prove the safety/social flows still feel right. Verify:
- **Admin "remove content"** on *another* user's broadcast AND message → content actually disappears (was a silent no-op before).
- **Cancel a sent connection request** → it stays gone after refresh (was a silent no-op before).
- **Bike Down resolve/remove** (Protected Behavior #7) → signal leaves Radar and still shows "Rider found safe"; normal success flow unchanged. Only the *failure* path now shows a toast instead of false success.
Once confirmed, flip the relevant Known Issues rows from "awaiting iPhone verification" to "verified on device."

### 2. Accessibility / touch-target batch (optional polish — VISIBLE changes, needs device eyeball)
From Sweep 9 + H-027. All low-risk but they change how the UI looks, so they must be checked on device for layout shifts (esp. the header — Protected Behavior #3 area). Scope:
- **Touch targets → 44px:** AppHeader 3 action buttons (40→44), RadarOverlay drag handle + "don't show again" checkbox, BroadcastForm chips/buttons, PostCreateSheet close/share/remove, BottomSheet drag handle + close, LoginForm password toggle, ReportButton trigger + close, MessageInput remove-image, LocationDisclosureDialog close.
- **Labels:** add `aria-label`/`<label>` to the message textarea and the post caption textarea.
- **Announcements:** add `aria-live="polite"` to status text (username availability, draft saved, report result, account-deletion status) and `role="button"` + `aria-expanded` where noted (failed-message retry, LoginForm "forgot password" toggle).
These are batchable but should ship in a dedicated PR the owner reviews on the phone — NOT folded into unrelated work. Held until then.

---

## Dead Ends — Approaches Already Tried That Did NOT Work

**Purpose:** Read this before proposing fixes. Do not re-suggest anything listed here unless you have a specific, concrete reason it would now behave differently — and if so, state that reason explicitly. This section is the single biggest time/token saver in this file. Append to it whenever something is ruled out.

**Format:** `Problem → what was tried → why it failed → what actually worked (if known)`

- **iOS datetime-local input overflow** → tried `width:100%`, `max-width:100%`, and `overflow-hidden` on the parent → none constrained the input on iOS Safari → WORKED: flex wrapper with `min-width:0` plus `flex:1; min-width:0` on the input (see iOS Safari Quirks section).
- **Forcing iOS PWA service worker updates** → tried the static `?v=velocity` query string → iOS Safari throttles SW update checks to ~once/24h and ignores the static string → the version string must change *between builds* to have any effect.
- **iOS PWA drag gestures via Pointer Events alone** → `pointerdown`/`pointermove` → `touchmove` often never fires on iOS because Safari treats it as a scroll gesture inside fixed/absolute containers → WORKED: raw `touchstart`/`touchmove`/`touchend` listeners as a fallback + `touch-action:none` on the drag handle.
- **iOS PWA bottom-sheet scrolling** → `overflow-hidden` on page root and on the open sheet container → a `fixed` + `overflow-hidden` ancestor blocks all descendant scrolling on iOS; parent `overflow-hidden` kills the child's scroll context → WORKED: remove those, give the sheet content an explicit `height` (not just `max-height`), `touch-action:pan-y`.
- **DM page "Conversation not found" — RLS suspected** → checked SELECT policies on `messages` and `conversations`, checked `conversation_notifications` policies, verified `public.messages` schema → all correct, RLS is not the cause → actual cause is auth timing race: TQ v5 disabled queries have `isLoading=false`, so `ConversationPage` shows error state while `user=null` during auth validation. Fix: include `authIsLoading` in the `isLoading` guard.

<!-- TEMPLATE — copy for new entries:
- **<problem>** → tried <approach> → failed because <reason> → WORKED: <fix, or "still open">.
-->
