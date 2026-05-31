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
| C-005 | `get_live_map_presence()` no `search_path` | **CONFIRMED** | Low–Med | `20260512_live_map_presence_server_time.sql:44` — `SECURITY DEFINER` with no `SET search_path` and not `STABLE`. Genuine outlier; peer functions set it. Matches Supabase `function_search_path_mutable` advisory. |
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
**Status: APPROVED — Kimi executes Tier 1 exactly as written. Tier 2 requires explicit owner "go" first. Touch nothing else.**

**Global rules for this task (from owner, 2026-05-31):**
- Execute ONLY the changes specified below, character-for-character. No refactoring, no cleanup of adjacent code, no extra files.
- These changes were chosen specifically because they do NOT alter the app's intended behavior. If, while implementing, you find ANY change would alter intended behavior or touch a **Protected Behavior** (see top of file), STOP and flag it — do not proceed.
- After edits: run `npm run lint` and `npm run typecheck`. Do not commit/push — leave the diff for Claude Code review and owner approval.

---

#### TIER 1 — APPROVED NOW (behavior-neutral)

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

**Fix 2 — C-005: harden `get_live_map_presence()` (additive DB migration).**
- Create a NEW file (do not edit any existing migration):
  `supabase/migrations/20260531_harden_get_live_map_presence_search_path.sql`
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

#### TIER 2 — OWNER-GATED (do NOT run until owner explicitly says "do H-027")

**Fix 3 — H-027: AppHeader touch targets 40px → 44px.**
- This is a **visible UI change** (slightly larger header tap targets). It is an accessibility improvement, not behavior-neutral, so it needs explicit owner go-ahead and an on-device header check.
- File: `src/components/layout/AppHeader.jsx`
- Replace ALL THREE occurrences of the substring:
  `min-w-[40px] min-h-[40px]`
  with:
  `min-w-[44px] min-h-[44px]`
  (occurrences are at lines ~256, ~275, ~300 — the Admin, Notifications, and Profile actions).
- **Verify on iPhone PWA:** header must not overflow, wrap, or shift; icons stay centered. If the header layout changes in any unexpected way, revert and flag (Protected Behavior #6 area).

---

#### HELD — Claude-led or not actioned (do NOT touch)

- **C-017** — `getEventRsvpCounts`: the audit's `head:true` suggestion is WRONG (breaks per-broadcast counts). Correct fix needs a `GROUP BY` RPC with deploy-ordering care → **Claude Code follow-up only**, not Kimi.
- **C-009** — `ViewportProvider` memo: held; only with line-by-line review + iPhone chat-keyboard verification (Protected Behavior #3). Not now.
- **C-011 / C-010 / C-012 / C-020** — low upside, real or potential regression risk; not actioned.
- **C-001 / C-006 / C-007 / C-008 / C-013** — do NOT touch (auth rewrite, offline page, Bike Down queue, auth→useQuery, sign-out behavior). C-007 is a ChatGPT/owner product decision.
- Everything else from the audit is FALSE, already-fixed, or too inflated/unspecified to action.

---

### AI Handoff Log
| Session | AI Used | What Was Done |
|---|---|---|
| 2026-05-31 | Claude Code | Finalized audit triage after three-way independent agreement (Claude+Codex+Kimi). Owner approved a **Protected Behaviors** section (added at top of file) and a tightly-scoped fix batch. Wrote precise fix-by-fix **Approved Task for Kimi**: Tier 1 (behavior-neutral, approved now) = C-019 `Link` import + C-005 additive DB hardening migration; Tier 2 (owner-gated, visual) = H-027 44px touch targets. Caught and corrected the C-017 trap (audit's `head:true` suggestion breaks per-broadcast counts → pulled from Kimi batch, now Claude-led). C-009 held (iOS keyboard regression risk). **Next:** Kimi executes Tier 1 exactly, runs lint+typecheck, leaves diff for Claude Code review — no commit/push. |
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
| Supabase migration history diverged | 🚨 Active | ~40 remote-only migrations not in local repo. `db push` fails. Manual SQL application required. |
| Sentry fetch failures | 🚨 Active | POST to ingest endpoint failing — likely rate-limited or CORS. Not user-facing. |
| requestAnimationFrame jank | 🚨 Active | 199ms frame time on lower-end devices. Needs React profiling. |
| Direct messaging page fails to load | FIXED — awaiting iPhone PWA verification | `ConversationPage.jsx` now includes `authIsLoading` in its loading guard (commit `d6823ce`, 2026-05-29). Open follow-up: audit `/broadcast/:id` and `/profile/:userId` for the same latent pattern. |
| Radar "Locate me" locates but doesn't center/zoom | FIXED — verified on iPhone PWA (2026-05-30) | Misplaced cleanup `return` after `map.resize()` in `MapLibreFitToItems` (`LiveMapMapLibre.jsx`) made the `flyTo`/`fitBounds` camera logic unreachable. Fix relocates the RAF cleanup to every exit path so the camera branches run (commit `45b55ef`). Verified on device: all three cases pass — locate w/ no prior fix, locate when already located, and locate after a manual pan (`autoFitDisabled` reset confirmed working). |
| 2026-05-31 "Comprehensive Codebase Audit Report" (508 findings) | TRIAGED — awaiting Codex pass | Claude Code verified all 20 named CRITICALs (C-001…C-020): **8 FALSE, 6 INFLATED, 6 CONFIRMED — none actually critical** (confirmed items all Low/Low-Med). Full verdict table + candidate Low residue (C-005, C-009, C-017, C-019; C-007 is a product call) in the Review Process section above. Do not action the report as a worklist — re-derive from code. |

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
