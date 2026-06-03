# Full End-to-End App Integrity Audit — Master Spec & Phase Plan

> **Status:** Pending — scheduled to start **2026-06-04**.
> **Mode:** INSPECTION ONLY — NO EDITS, NO FIXES, NO COMMITS.
> **Owner of the prompt:** finalized by Claude (rigorous reviewer) with owner approval.
> **How we run it:** one **Stage** = one Kimi run + one Claude reconciliation. Phases group stages. Never run more than one stage per Kimi response.

---

## PART I — THE AUDIT PROMPT (hand the relevant Stage section to Kimi, one at a time)

### Mission
Ride Radar 2.0 · Active Supabase project: `iygtbcserdmvhhjicyyp`.

Prove that every backend-dependent frontend capability functions end to end —
trigger → data path → live DB contract (table/columns/RLS/RPC/storage/edge fn) →
correct success AND failure handling → intended end result — **and** that the app
delivers the user experience it was designed for. A motorcyclist using this app
on the road — gloves on, bright sun, spotty signal — must be able to find nearby
rides, create signals, chat, connect, get help via Bike Down, and manage privacy
without confusion or dead ends.

Find everything that is broken, silently fails, deceives the user, over-shares
data, leaks resources, dead-ends, behaves differently offline vs online, violates
cross-feature consistency, drifts in time, or fails to deliver its intended
outcome. Produce evidence-backed findings + a device-test script. Fixes come later
as separate owner-approved tasks.

### INTEGRITY RULES — violating these makes the audit worthless
1. **No claim without evidence.** Every "works/OK" cites either (a) a code trace
   with file:line for EVERY hop + the live DB object it depends on (by name from
   the Pass 0 catalog), or (b) "DEVICE-CONFIRM REQUIRED". No third option.
   "Should/appears/likely/presumably" are BANNED. Unverified = "NOT VERIFIED" —
   an acceptable honest answer. A fabricated green is a failure of the audit.
2. **Evidence is mechanical, not a promise.** In Pass 0, PASTE the actual MCP call
   + a snippet of its real result for EVERY object (no paste = not citable later).
   In every feature stage, FREEZE and NUMBER the inventory FIRST, THEN trace, and
   report a COVERAGE COUNTER "traced X of Y; not-verified Z (listed)". A gap is a
   number you state, never silence.
3. **Intent & user outcome is mandatory.** For every traced element state:
   INTENDED OUTCOME ("the rider should be able to ___") · ACTUAL VERIFIED BEHAVIOR
   ("the code path delivers ___") · GAP. If the implementation exists but the rider
   experience is confusing, incomplete, or differs from intent, that is a DEFECT
   even if technically "functional" (e.g., a Bike Down that writes a row but fails
   to surface urgency to nearby riders is BROKEN).
4. **You cannot tap the device.** Code proves WIRING exists; only the owner's
   device pass proves it FIRES and LOOKS right. Keep strictly separate.
5. **Verify the LIVE database, not local migrations** (history diverged; locals can
   be STALE). Confirm via MCP: list_tables, execute_sql vs catalog,
   pg_get_functiondef, list_edge_functions, get_advisors. Migration file ≠ evidence.
6. **No assumptions about numbers you haven't counted** (channels, rows, policies).
   Measure it or mark it unknown.
7. **No RLS assumptions.** Per mutation, name the policy and confirm USING/WITH
   CHECK permits the op for the role. Trap: RLS-blocked DELETE returns
   {error:null, data:[]} — a SILENT no-op. Flag silent-no-op mutations and
   .select() read-backs that can PGRST116 because the SELECT policy hides the row.
8. **Cross-feature consistency is non-negotiable.** If a user is blocked they must
   be invisible in EVERY feature: broadcasts, comments, messages, notifications,
   search, connection requests, profile views, nearby results, admin lists. One
   leak = a PRIVACY DEFECT regardless of other features being correct. Same for
   account-deletion cascades, privacy settings, soft-deleted content.
9. **When unsure, FLAG — do not guess.** Ambiguity is a finding.
10. **Stay in lane.** Inspection only. Find a Blocker → LOG IT AND CONTINUE. Never
    fix, edit, refactor, or commit anything, ever.

### SEVERITY RUBRIC (grade every defect by this — do not freelance grades)
- **BLOCKER** = data loss · privacy/cross-feature leak · a safety flow (Bike
  Down/report) that fails its goal · irreversible action with no confirm or that
  silently fails · valid user locked out by an auth false-negative · any Tier-1
  write that shows success while silently no-opping (deception) · white-screen on
  a core route.
- **HIGH** = silent failure/deception on Tier-2 · dead-end with no back · action
  that needs a retry to work · error not surfaced · optimistic state not rolled
  back · stale cross-surface view after a mutation · a resource leak that degrades
  a session.
- **MEDIUM** = confusing-but-recoverable UX · missing loading/empty/error state ·
  weak fallback · wrong header/title · minor a11y gap.
- **COSMETIC** = pure visual/copy/spacing.
- **TIE-BREAK:** unsure between two tiers → pick the HIGHER and flag for owner.

### AUDIT-THE-AUDIT (anti-fabrication — mandatory each stage)
- **Self-verification (Kimi, every stage):** after the trace table, RE-RUN the
  cited MCP query for a random 15% sample (min 3) of your OWN "VERIFIED-E2E" rows
  and paste the fresh result. Any row whose fresh result no longer supports the
  verdict → downgrade to NOT VERIFIED and flag it. Report the sample set + outcomes.
- **Reconciliation (Claude, per Charter):** a stage is "accepted" only after Claude
  independently re-checks ALL Blocker/High claims and a sample of VERIFIED-E2E
  against live DB/code. A claim is trusted because it was spot-checked, not because
  Kimi asserted it.

### RISK TIERS — drive ordering AND depth
- **Tier 1** (first, deepest): irreversible/safety/privacy writes — Bike Down +
  safety reports, block/unblock, account deletion, message send, connection request
  send/accept, RSVP, shot/broadcast delete, privacy toggles, admin remove-content.
- **Tier 2:** standard create/update — create signal (all types), comments, edit
  profile/broadcast, mark-read, image uploads, notifications realtime.
- **Tier 3** (lightest): pure navigation/display/reads — page loads, tab switches,
  tooltips, static non-sensitive reads.
- **Depth:** Tier 1 & 2 → FULL trace T1–T13. Tier 3 → LIGHT check (routes to a real
  target / renders / leaks nothing / matches intent). Do NOT force a full trace onto
  a nav link — it buries real defects in noise.

### FEATURE-STAGE TEMPLATE (every Phase-1/2/3 stage runs this)
**STEP A — Freeze inventory (from CODE).** Every onClick/onSubmit/onChange/
onKeyDown-Up/onFocus-Blur/onScroll, gesture (touchstart/move/end, pointer, drag,
long-press), `<NavLink>`/`<Link>`/`<button>`, form, file input, clipboard, image
load/error, window/document listener (resize, online/offline, visibilitychange,
beforeunload, popstate), IntersectionObserver, setInterval/Timeout, realtime
handler. NUMBER each. Record file:line · component · interaction type(s) · intended
end goal · risk tier. State **Y = total inventoried** for this area.

**STEP B — Intent statement.** "A rider using this feature should be able to ___."
This is the north star; an existing-but-incomplete/confusing/dead-end outcome is a
defect.

**STEP C — Trace (depth per tier), per numbered element:**
- **T1 Trigger** — gated while !canSubmit/isPending/unauthenticated? double-fire on
  rapid double-tap?
- **T2 Validation** — client checks before the call; invalid input → clear message
  or silent? Is client validation SYMMETRIC with DB constraints (client allows what
  the DB rejects → late confusing error; or blocks what the DB accepts)?
- **T3 Data layer** — hook + exact supabase call
  (from/select/insert/update/delete/upsert/rpc/storage/invoke). Quote it.
- **T4 Backend contract** (CITE Pass 0; re-query only if absent) — table+columns
  exist/typed? RLS policy named + permits this op/role? RPC/edge-fn signature
  matches args? storage bucket+path policy? constraints payload must meet?
  triggers/CASCADE accounted for?
- **T5 Success** — cache invalidation/optimistic update correct? UI/nav/toast
  matches the end goal? optimistic rollback on error?
- **T6 Failure** — every error surfaced TRUTHFULLY (no swallowed catch faking
  success)? blocked/empty misread as success? 429 back-off? 503 retry? Does a
  "sent/saved" state ever show when the write failed or was RLS-blocked (deception)?
- **T7 Authorization & over-sharing** (READS esp.) — returns ONLY what the acting
  user may see? could it leak a blocked user's content, private profile fields,
  soft-deleted rows, others' data? Name the enforcing policy/filter.
- **T8 Idempotency** — repeat/double submit → duplicates (double RSVP/request/send)?
  UNIQUE constraint or guard present (cite Pass 0.5)?
- **T9 Race/lifecycle/stale closure** — mid-flight nav referencing stale
  queryClient/state/vars? setState after unmount? split-auth-context stale user id
  (useAuthState vs useAuthActions)? realtime cleanup on unmount (no accumulation)?
- **T10 Offline & resilience** — action triggered offline: queued (TanStack
  offlineFirst)? pending state shown? on reconnect retry / fail gracefully / silently
  drop? cache showing stale data that contradicts the pending mutation?
- **T11 Cross-feature consistency** — if this involves a block, privacy setting,
  deletion, or account-state change, does it propagate to ALL other features?
- **T12 Time/timezone/expiry** — any timestamp shown/compared honors the stored
  convention (Pass 0.8)? datetime-local (local) stored correctly? could
  expiry/"time ago" fire early/late or show the wrong event time?
- **T13 Destructive-action safety** (Tier 1) — clear confirmation before
  irreversible/serious actions (delete/block/report/account-deletion)? Is
  irreversibility stated honestly ("cannot be undone")?

**VERDICT per element:** VERIFIED-E2E · BROKEN(cite hop) · SILENT-FAIL-RISK ·
OVER-SHARE-RISK · CROSS-FEATURE-LEAK · TIME-DRIFT-RISK · DEVICE-CONFIRM-REQUIRED ·
NOT VERIFIED. (Tier 3: confirm route/target exists, renders, leaks nothing, matches
intent — skip T4–T13.)

**STEP D — Specialized lenses (apply the relevant ones):**
- *Inputs/forms:* typable? maxLength enforced+shown? font ≥16px (element selector
  loses to text-sm/xs class)? disabled-while-pending? input PRESERVED on failure?
  Enter vs Shift+Enter? optimistic msgs reconciled not ghosted? datetime-local iOS
  overflow fix present? unsaved-changes risk on abandon?
- *Async-state completeness:* every async surface has LOADING, EMPTY, and ERROR
  states (no infinite spinner, no blank-on-empty, no silent error)?
- *Gestures/focus:* listeners correctly attached (iOS raw touch + touch-action per
  dead-ends) → DEVICE-CONFIRM. Focus traps (sheet/modal): Escape + Android hardware
  back dismiss? tab order sane? ARIA labels present + meaningful?
- *Capacitor (where relevant):* Android hardware back, iOS swipe-back, deep link →
  route parse, geolocation/camera/push permission flow, status-bar/safe-area,
  keyboard accessory bar, app resume from background.
- *Media/images:* loading state (skeleton/blur-up)? error fallback? lazy loading?
  compression/format validation before upload? mid-upload cancel/navigation?
  iPhone HEIC/large-photo path? cache strategy (30d) correct?
- *Realtime:* channel name unique? event filter correct? cleanup on unmount?
  invalidation targets the right key? initial-fetch-vs-subscription race?

**STEP E — Area deliverable:** (1) intent statement; (2) frozen numbered inventory;
(3) trace table w/ verdicts; (4) COVERAGE COUNTER "traced X of Y; not-verified Z";
(5) area defect list (use Defect Format); (6) area device-confirm items (feed the
final device script); (7) the self-verification sample + outcomes.

### DEFECT FORMAT (every finding)
SEVERITY · LOCATION (file:line or DB object) · INTENDED OUTCOME · WHAT'S BROKEN ·
EVIDENCE (pasted MCP result / code trace / "NOT VERIFIED") · REPRODUCTION ·
EXPECTED · ACTUAL · CROSS-FEATURE IMPACT · PROPOSED-FIX-DIRECTION (do NOT implement).

---

## PART II — PHASE & STAGE EXECUTION MAP

> One Stage per Kimi run. After each, Claude reconciles (self-verification sample +
> independent re-check of all Blocker/High + a VERIFIED-E2E sample) before the next
> stage starts. Owner runs the device-confirm items at the end (Phase 5).

### PHASE 0 — Foundation (must be first)
- **Stage 0.1 — Pass 0: Schema, Backend & External-Service Catalog.**
  - 0.1 Tables (columns+types, RLS on?) — paste catalog query.
  - 0.2 RLS policies per table (cmd/role/USING/WITH CHECK) — paste pg_policies;
    flag app-written tables with no permitting policy.
  - 0.3 RPCs the frontend calls — paste pg_get_functiondef; flag divergent overloads.
  - 0.4 Edge Functions invoked — name/signature/verify_jwt — paste listing.
  - 0.5 Constraints & triggers (FK/NOT NULL/CHECK/UNIQUE incl. idempotency
    constraints; CASCADE triggers the frontend must invalidate for).
  - 0.6 Advisors (get_advisors security+performance) — RLS-off tables, missing
    policies, hits on written tables.
  - 0.7 Realtime channels — MEASURED count + per-channel table/event (grep, no
    assumptions).
  - 0.8 Time convention — how timestamps are stored (timestamptz/UTC?) and what
    drives expiry; record the canonical rule.
  - 0.9 External services — telemetry endpoints (Sentry DSN target, Plausible
    domain) + opt-out flag (user_settings.analytics_enabled).
  - 0.10 Env/build config — VITE_ vars referenced in source exist in .env;
    vite.config PWA settings vs manifest.json consistency; flag client-consumed
    vars not prefixed VITE_.

### PHASE 1 — Tier-1 feature areas (deepest; irreversible/safety/privacy)
- **Stage 1.1 — Safety & Bike Down** (create/resolve, urgency surfacing, report).
- **Stage 1.2 — Connections & Blocks** (send/cancel/accept/decline, block/unblock).
- **Stage 1.3 — Messages** (send + optimistic, realtime receive, keyboard dock).
- **Stage 1.4 — Broadcast detail actions** (RSVP, share, edit, delete, report, resolve).
- **Stage 1.5 — Account deletion & privacy/settings toggles** (incl. analytics opt-out).
- **Stage 1.6 — Admin actions** (remove-content vs mark-resolved, blocks, deletions,
  compliance).

### PHASE 2 — Tier-2 feature areas
- **Stage 2.1 — Create Signal** (solo_ride/iso/event/alert/bike_down; location
  picker, image, datetime-local).
- **Stage 2.2 — Profile** (own + /:userId): edit, shots create/delete, shot comments,
  avatar/bike uploads, tabs.
- **Stage 2.3 — Notifications** (feed, unread badge, mark-read, realtime, tap-through).
- **Stage 2.4 — Image uploads** (avatars/bikes/events/alerts → `uploads` bucket).
- **Stage 2.5 — Auth & onboarding** (login/signup/onboarding/session/signout).
- **Stage 2.6 — Radar/map /home** (Locate me, markers, bottom sheet, location gate,
  live vs cached).

### PHASE 3 — Tier-3 feature areas
- **Stage 3.1 — Search / filter / sort / pagination** (dedupe, missed rows, cursor
  stability).
- **Stage 3.2 — Pure navigation / display** (nav links, tabs, static reads).

### PHASE 4 — Global lenses (cross-cutting)
- **Stage 4.1 — Lifecycle & Memory Integrity** (useEffect cleanup; channel/listener/
  timer/observer leaks; cite Pass 0.7).
- **Stage 4.2 — Offline-First & Resilience** (queued mutations + retry limit; cache
  persistence; reconnect refetch order; non-idempotent retry hazards; SW caching;
  background-mid-mutation; multi-device consistency).
- **Stage 4.3 — Routing, Guards, Loading & Error Boundaries** (warm/cold/deep-link;
  guards; UUID param validation; auth-race false "not found" — ref d6823ce; Suspense
  fallbacks; lint no-undef green; error-boundary coverage; Capacitor deep-link +
  hardware back).
- **Stage 4.4 — User Journeys End-to-End** (J1 distressed rider: Bike Down → seen →
  message → RSVP going → resolve; J2 new rider onboarding → first signal → share →
  connect → chat; J3 block→propagate-everywhere→unblock→delete-account-cascade;
  J4 event organizer approve→RSVP→notify; J5 offline ride: cached read → queued
  signal+message → reconnect → no ghosts/dupes). Name the query keys that must
  invalidate between steps; verify the outcome start-to-finish.
- **Stage 4.5 — Performance & Resource Integrity** (N+1/waterfalls — is
  useProfileBatch used? over-fetch select('*'); full-res images in small tiles
  [known free-plan issue]; render storms / per-row framer-motion [known rAF ~199ms
  jank]; map marker rendering/clustering; realtime fan-out refetching large queries).
  Code-measurable → finding; frame timing → DEVICE-CONFIRM.
- **Stage 4.6 — Build Integrity & Deployment Artifact** (`npm run build` clean;
  manifest fields; SW register/precache + caching strategies; VITE_ vars resolved;
  bundle size; dist/ assets present; capacitor.config web dir; Sentry/Plausible
  production-only; version string consistency).
- **Stage 4.7 — Privacy/Telemetry Runtime + Accessibility.**
  - *Privacy runtime:* trace analytics.js/sentry.js — events gate on
    analytics_enabled BEFORE sending? Sentry beforeSend scrubs PII (email, name,
    precise location, message body)? prod-only? Flag any event ignoring opt-out or
    carrying PII.
  - *Accessibility:* icon-only buttons have accessible names? logical tab order +
    visible focus? focus moved into/restored out of sheets/modals? live regions for
    async results/toasts/errors? touch targets ≥44px? contrast adequate?
    prefers-reduced-motion honored for heavy animations? Code-verifiable → finding;
    SR behavior → DEVICE-CONFIRM.

### PHASE 5 — Consolidation & sign-off
- **Stage 5.1 — Known-Trap Regression** (CLAUDE.md hard-won list): RLS silent-delete
  (.select()+length), upsert read-back PGRST116, transformed-ancestor breaking
  position:fixed sheets (portal to body), iOS datetime-local overflow fix, 16px input
  font, bottom-sheet scroll (explicit height + touch-action), cold-start loader
  continuity, Protected Behaviors #1–#9, Capacitor back-button trap,
  split-auth-context stale closure. Confirm none reintroduced, with file:line.
- **Stage 5.2 — Consolidation + Device Script + Coverage.**
  - Consolidated PRIORITIZED DEFECT LIST across all stages (Defect Format).
  - DEVICE-CONFIRM SCRIPT for the owner: ordered by RISK (Tier 1 first), each item
    cross-linked to any SILENT-FAIL / OVER-SHARE / CROSS-FEATURE-LEAK / TIME-DRIFT
    risk found in code, with exact expected result. Include iOS specifics: keyboard
    dock, datetime-local overflow, safe-area, SW update flow, PWA install prompt.
  - HONEST COVERAGE STATEMENT: sum per-stage counters — total inventoried, % traced
    E2E, what was NOT verified and why, any area you ran out of room on. Do NOT claim
    "complete"; claim exactly what you verified, with evidence.

---

## PART III — GLOBAL DELIVERABLE RULES
No edits. No commits. No assumptions (numeric included). No fabricated greens.
Evidence (pasted MCP results / file:line) or "NOT VERIFIED." Freeze inventory before
tracing; report coverage as X of Y. Self-verify a 15% sample each stage. Log
Blockers and CONTINUE. Stop and flag on any ambiguity.

**Stage count:** Phase 0 (1) + Phase 1 (6) + Phase 2 (6) + Phase 3 (2) + Phase 4 (7)
+ Phase 5 (2) = **24 stages.** Minimum trustworthy run if time-constrained:
Stage 0.1 + all of Phase 1 + Stage 4.4 (journeys) + Phase 5.
