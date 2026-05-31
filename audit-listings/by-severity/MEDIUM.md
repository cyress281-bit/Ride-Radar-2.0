# MEDIUM Severity Audit Findings — RideRadar 2.0

> **Audit Date:** 2026-05-30  
> **Total MEDIUM Findings:** 212  
> **Scope:** `src/`, `public/`, `supabase/migrations/`, PWA config, Supabase RLS & indexes  
> **Format:** Category → Top 10 Impactful Findings (ID, File, Issue, Fix, Effort)  

---

## Summary by Category

| Category | Count | Top Risk | Aggregate Effort |
|----------|-------|----------|------------------|
| Security | 22 | Auth bypass via client-side filters | 4 S, 4 M, 2 L |
| Performance | 39 | Wasted renders & duplicate queries | 3 XS, 4 S, 3 M |
| PWA / Mobile | 22 | Offline fragility & cache bloat | 4 S, 5 M, 1 L |
| UI / UX | 25 | Accessibility & scroll regressions | 5 XS, 4 S, 1 M |
| Supabase / Database | 27 | Missing indexes & N+1 queries | 2 XS, 4 S, 3 M, 1 L |
| Error Handling | 41 | Silent failures & race conditions | 3 XS, 4 S, 3 M |
| Code Quality | 36 | Prop spreading & magic numbers | 5 XS, 4 S, 1 M |
| **TOTAL** | **212** | — | **~17 XS, 29 S, 18 M, 4 L** |

---

## Security (22 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-SEC-001** | `src/features/broadcast/hooks/use-nearby-broadcasts.js` | Client-side radius filter applied after fetch; attacker can modify `rangeKm` param to retrieve all broadcasts regardless of location. | Move radius + bounding-box filter into the `get_nearby_broadcasts` RPC; reject unbounded queries server-side. | M |
| **MED-SEC-002** | `src/features/profile/api/profile-api.js` — `updateProfile` | Missing ownership check before upsert; relies solely on RLS without verifying returned row count. | Explicitly `.eq('id', userId)` on update and assert `data.length === 1`; surface auth error if mismatch. | S |
| **MED-SEC-003** | `src/features/chat/components/MessageInput.jsx` | Profanity-only content filter runs client-side; trivial to bypass and does not cover harassment, spam, or PII. | Replace client regex with server-side moderation queue + async scanning; keep lightweight client preview only. | L |
| **MED-SEC-004** | `src/lib/image-utils.js` | Image URL validation regex (`/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i`) is overly permissive and allows open redirects or foreign domains. | Restrict to Supabase Storage hostname + signed URLs; add allow-list for known CDNs. | S |
| **MED-SEC-005** | `src/features/chat/api/chat-api.js` — `deleteConversation` | No auth check before delete; assumes RLS will block silently. RLS silent failure returns `[]` with no error. | Add `.eq('user_id', currentUser.id)` + verify `data.length > 0`; throw explicit 403 if no rows deleted. | S |
| **MED-SEC-006** | `src/features/map/components/LiveMap.jsx` | Frozen coordinates are computed client-side from raw `lat`/`lng`; malicious client could expose exact location. | Ensure server RPC returns only `frozen_lat`/`frozen_lng`; strip raw coords from all select statements. | M |
| **MED-SEC-007** | `src/features/connections/api/connections-api.js` | No rate limit on `sendConnectionRequest`; susceptible to connection-request spam. | Add client-side debounce + Supabase Edge Function rate-limiting (Redis/upstash) per `from_user_id`. | M |
| **MED-SEC-008** | `src/lib/query-client.js` | Auth token fragments occasionally leak into TanStack Query cache keys via inline objects. | Sanitize query keys: hash only stable identifiers; never include JWTs or PII in keys. | S |
| **MED-SEC-009** | `src/features/safety/api/reports-api.js` — `submitReport` | Missing validation on `reported_user_id`; accepts arbitrary UUIDs including self-reports and system IDs. | Validate `reported_user_id !== reporter_id`; check user exists via lightweight HEAD call before insert. | S |
| **MED-SEC-010** | `src/lib/auth-redirect.js` | Redirect URL parsing allows protocol-relative URLs (`//evil.com`) leading to open redirect after login. | Strict allow-list for redirect paths; reject anything with protocol, hostname, or leading `//`. | L |

**Remaining 12:** Client-side block-list filtering (2), missing CSP nonce for inline styles (1), over-permissive storage bucket policies (2), missing input sanitization on bio field (1), unsafe `eval` in logger fallback (1), auth state race on rapid login/logout (2), missing `rel="noopener"` on external links (1), debug flags left in production build (2).

---

## Performance (39 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-PERF-001** | `src/features/broadcast/pages/BroadcastFeedPage.jsx` | `filteredBroadcasts` re-computes on every render without `useMemo`; heavy sort + filter on 200+ items. | Wrap `filteredBroadcasts` in `useMemo` with `[broadcasts, filterType, sortMode]` deps. | XS |
| **MED-PERF-002** | `src/features/chat/components/ConversationHeader.jsx` | Fetches full user profile independently even when parent already loaded the same profile. | Accept `profile` as prop; use `useProfileBatch` shared context to dedupe requests. | S |
| **MED-PERF-003** | `src/features/notifications/hooks/use-notifications.js` | Polling interval (`refetchInterval: 15000`) runs regardless of tab visibility, wasting battery and quota. | Add `document.visibilityState` gate; pause polling when hidden, resume on `visibilitychange`. | S |
| **MED-PERF-004** | `src/features/map/components/LiveMap.jsx` | Unused `mapInstance` ref and `tileLayer` variable left in component after refactor; minor bundle bloat + confusion. | Remove dead variables; run `npm run lint` to auto-detect. | XS |
| **MED-PERF-005** | `src/features/chat/components/MessageList.jsx` | Every helper function wrapped in `useCallback` with volatile deps, causing more overhead than benefit. | Remove `useCallback` for functions passed to non-memoized children; keep only for stable prop-drilling. | S |
| **MED-PERF-006** | `src/features/chat/pages/ConversationsPage.jsx` | Conversation list renders all rows without virtualization; stutters at >50 conversations. | Integrate `VirtualList` (already in `src/components/shared/VirtualList`) with fixed row height. | M |
| **MED-PERF-007** | `src/components/layout/BottomNav.jsx` | Re-renders on every route change because `useLocation` object identity is unstable. | Destructure primitive fields (`pathname`) outside memoized selector; wrap nav items in `React.memo`. | S |
| **MED-PERF-008** | `src/lib/supabase.js` | Multiple feature files call `createClient` or import fresh instances instead of shared singleton. | Enforce single export from `src/lib/supabase.js`; add lint rule banning `createClient` elsewhere. | S |
| **MED-PERF-009** | `src/components/shared/RideCard.jsx` | Component not memoized; re-renders on every parent feed update even when props unchanged. | Wrap with `React.memo` + custom comparator for deep comparison of `broadcast` object. | XS |
| **MED-PERF-010** | `src/components/layout/AppLayout.jsx` | `children` prop causes full layout re-render on any child state change. | Split `AppLayout` into static shell + outlet; move stateful children outside layout boundary. | M |

**Remaining 29:** Duplicate query for unread count (3), unnecessary `JSON.stringify` in dependency arrays (2), missing `React.memo` on avatar components (2), polling without backoff on errors (2), image preload without priority (2), excessive re-renders in `SafetyActions` (2), unmemoized style objects in `BottomSheet` (2), unused import bloat in `broadcast/index.js` (1), over-fetching in `useProfileBatch` (2), missing `key` stability in lists (3), redundant `useEffect` cleanup patterns (2), map marker clustering disabled (1), excessive toast re-renders (2), `registerSW` reloads page aggressively (1), duplicate geolocation requests (1), no lazy load for heavy admin pages (1), unoptimized Lottie import (2).

---

## PWA / Mobile (22 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-PWA-001** | `src/lib/tileCache.js` | Cache fragmentation: map tiles stored with unbounded cache names; multiple versions compete for quota. | Consolidate to single `rr-tiles-v{major}` cache; implement LRU eviction in `activate` event. | M |
| **MED-PWA-002** | `public/manifest.json` | Missing `splash_screens` array; iPad landscape launch shows white screen instead of branded splash. | Add `splash_screens` entries for 2048×2732, 1668×2224, 1536×2048 with `media` queries. | S |
| **MED-PWA-003** | `src/features/broadcast/hooks/use-nearby-broadcasts.js` | No offline guard; throws Supabase network error when offline instead of serving stale cache. | Check `navigator.onLine` before RPC call; return `queryClient.getQueryData()` fallback when offline. | S |
| **MED-PWA-004** | `src/hooks/use-online-status.js` | Excessive polling: `setInterval` pings every 2s even when online for hours. | Use `navigator.connection` change events + exponential backoff; remove active polling when online. | S |
| **MED-PWA-005** | `src/lib/registerSW.js` | Missing `message` event handler for `SKIP_WAITING` or `CACHE_UPDATED`; users stay on old version. | Listen to `navigator.serviceWorker.addEventListener('message', ...)` and prompt for reload. | M |
| **MED-PWA-006** | `src/features/chat/api/chat-api.js` | No background sync registration for queued messages; messages sent offline are lost on page close. | Register `navigator.serviceWorker.ready.then(reg => reg.sync.register('outbox-sync'))` on send failure. | M |
| **MED-PWA-007** | `vite.config.js` (Workbox config) | No periodic background sync for broadcast feed; stale content for returning users. | Add `workbox.backgroundSync` plugin with `periodicSync` for `'broadcast-sync'` every 12h. | M |
| **MED-PWA-008** | `public/offline.html` | Missing offline fallback page; Workbox references it but file does not exist in `dist/`. | Create `public/offline.html` with branded UI and cached in `precacheAndRoute`. | S |
| **MED-PWA-009** | `src/lib/image-utils.js` | Avatar cache keys use raw URLs without hashing; different query params create duplicate entries. | Normalize URL to pathname + hash before cache key; strip `?` params for avatars. | S |
| **MED-PWA-010** | `index.html` | Missing `viewport-fit=cover` on iOS; bottom nav sits under home indicator on iPhone 14+. | Update meta viewport to `viewport-fit=cover, width=device-width, initial-scale=1`. | XS |

**Remaining 12:** Missing `theme-color` meta for dark mode (1), SW does not clean up old precaches (2), excessive `max-age` for Supabase REST in dev (1), no `beforeinstallprompt` analytics (1), Capacitor iOS status bar style mismatch (2), missing `display: standalone` detection hook (1), Android splash screen theme mismatch (1), cache storage quota exceeded not handled (1), offline toast spam (1), missing `share_target` in manifest (1).

---

## UI / UX (25 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-UI-001** | `src/features/profile/pages/ProfilePage.jsx` | Heading hierarchy violation: multiple `h1` tags (name, bike model, section titles) and skipped levels (`h1` → `h3`). | Single `h1` per page; enforce logical order via `<section>` + `<h2>`/`<h3>`; add `eslint-plugin-jsx-a11y`. | S |
| **MED-UI-002** | `src/features/broadcast/components/CreateBroadcastForm.jsx` | Missing `<label>` elements for datetime, location, and type inputs; relies on placeholders alone. | Add explicit `<label htmlFor="...">` or `aria-label` for every form control. | XS |
| **MED-UI-003** | `src/components/layout/BottomSheet.jsx` | Scroll context conflict: `touch-action: none` prevents nested scrollable content from scrolling on mobile. | Use `usePreventBodyScroll` hook with ref check; only lock body scroll, not internal overflow containers. | M |
| **MED-UI-004** | `src/components/layout/AppLayout.jsx` | Safe area handling gaps: no `env(safe-area-inset-*)` padding for notched devices in landscape. | Add `pb-[env(safe-area-inset-bottom)]` to BottomNav and `pt-[env(safe-area-inset-top)]` to header. | S |
| **MED-UI-005** | `src/components/shared/EmptyState.jsx` | Subtitle text uses `text-muted-foreground` at 0.6 opacity; fails WCAG AA contrast on dark charcoal background. | Increase opacity to 0.75 or lighten hex by ~10% to reach 4.5:1 ratio. | XS |
| **MED-UI-006** | `src/features/safety/components/SafetyActions.jsx` | Focus indicators removed by `outline-none` without replacement; keyboard users cannot see focused action. | Add `focus-visible:ring-2 focus-visible:ring-brand-neon` to all interactive elements. | XS |
| **MED-UI-007** | `src/features/chat/components/MessageBubble.jsx` | Inconsistent button sizes: send button is 36px, attachment is 44px, causing misalignment and jitter. | Standardize to 44px minimum touch target per platform guidelines; align with flex baseline. | XS |
| **MED-UI-008** | `src/components/layout/BottomNav.jsx` | Icon buttons lack `aria-label`; screen reader announces "button" without context. | Add descriptive `aria-label` to each nav link (e.g., `aria-label="Home feed"`). | XS |
| **MED-UI-009** | `src/features/settings/components/SettingsToggle.jsx` | Toggle switch hit area is 32×20px, below 44×44 WCAG 2.5.5 recommendation. | Increase invisible hit slop to 44×44 via padding/absolute positioning wrapper. | S |
| **MED-UI-010** | `src/features/broadcast/components/RSVPButton.jsx` | No loading state during RSVP mutation; user can tap multiple times, creating duplicate rows. | Disable button + show spinner while `mutation.isPending`; optimistically update UI. | S |

**Remaining 15:** Missing `aria-live` on toast notifications (2), scroll restoration not handled on back navigation (2), modal focus trap incomplete (1), inconsistent border radius tokens (2), missing skeleton screens on slow 3G (2), datetime-local iOS overflow regression (1, see AGENTS.md), tap highlight color mismatch (1), overscroll bounce color mismatch on iOS (1), inconsistent error toast positioning (1), missing `loading="lazy"` on below-fold images (2).

---

## Supabase / Database (27 findings)

| ID | File / Object | Issue | Fix | Effort |
|----|---------------|-------|-----|--------|
| **MED-DB-001** | `supabase/migrations/` — `broadcasts` table | Missing composite index on `(frozen_lat, frozen_lng)` or PostGIS `GIST` index for nearby queries. | Add `CREATE INDEX idx_broadcasts_frozen_location ON broadcasts USING GIST (frozen_location);` or equivalent. | S |
| **MED-DB-002** | `src/features/chat/hooks/use-conversation-messages.js` | Realtime subscription listens to all `messages` table inserts without filtering by `conversation_id` at channel level. | Use `.eq('conversation_id', id)` filter in `postgres_changes` config to reduce network traffic. | S |
| **MED-DB-003** | `supabase/migrations/` — `get_nearby_broadcasts` RPC | Returns full row `(*)` including internal `lat`/`lng`; client receives more data than needed. | Refactor RPC to return explicit column list; exclude internal coordinates. | M |
| **MED-DB-004** | `supabase/migrations/` — `messages` table | Missing composite index on `(conversation_id, created_at DESC)`; message list queries seq scan. | Add `CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);` | XS |
| **MED-DB-005** | `src/features/chat/hooks/use-conversations.js` | Fetches all conversation fields + nested profiles without pagination; N+1 profile lookups. | Add `limit`/`offset`; use `useProfileBatch` with pre-fetched IDs instead of nested select. | M |
| **MED-DB-006** | `supabase/migrations/` — `notifications` table | Missing composite index on `(user_id, read, created_at)`; unread count query is slow for active users. | Add `CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, read, created_at DESC);` | XS |
| **MED-DB-007** | `supabase/migrations/` — `get_user_stats` RPC | Returns unnecessary columns (`created_at`, `raw_metadata`) never consumed by the dashboard. | Audit all RPCs; return only columns listed in `select()` on client side. | S |
| **MED-DB-008** | `supabase/migrations/` — `live_map_presence` table | No spatial index on `location` column; live map radius queries degrade with >500 riders. | Add `GIST` index on `location` if not already present; verify with `EXPLAIN ANALYZE`. | S |
| **MED-DB-009** | `src/features/notifications/hooks/use-unread-count.js` | Inefficient count query uses `.select('*')` then `data.length` instead of Supabase `count` option. | Use `.select('*', { count: 'exact', head: true })` to avoid row payload. | XS |
| **MED-DB-010** | `supabase/migrations/` — `connection_requests` table | Missing index on `(from_user_id, status)`; outgoing requests page loads slowly for popular users. | Add `CREATE INDEX idx_connreq_from_status ON connection_requests (from_user_id, status);` | S |

**Remaining 17:** Missing index on `event_rsvps(broadcast_id)` (1), realtime channel leak on rapid navigation (2), `friendships` table missing unique composite index (1), `user_blocks` no index on `blocked_user_id` (1), `reports` missing index on `status` (1), RPC `get_nearby_broadcasts` does not use `ST_DWithin` optimally (1), missing `row_level_security` on new migration table (1), `user_settings` upsert without `onConflict` precision (1), storage bucket `uploads` missing size limit (1), over-eager `.select('*')` in `broadcast-api.js` (2), missing `pg_trgm` index for search (1), `official_events` no index on `start_time` (1), `live_map_presence` TTL cleanup not indexed (1), `conversation_participants` missing composite PK index (1).

---

## Error Handling (41 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-ERR-001** | `src/features/broadcast/api/broadcast-api.js` | Inconsistent error patterns: some functions throw raw Supabase errors, others return `{ data, error }`. | Standardize all API modules to `throw` on error; wrap with domain-specific `BroadcastError`. | M |
| **MED-ERR-002** | `src/components/shared/OptimizedImage.jsx` | Image upload failure is silent; `onError` only logs to console, user sees infinite spinner. | Surface upload failure in UI with retry button; invalidate query only on success. | S |
| **MED-ERR-003** | `src/hooks/use-address-autocomplete.js` | No `AbortController` for fetch; rapid typing causes race conditions and out-of-order results. | Create `AbortController` per request; abort previous on input change; handle `AbortError` gracefully. | S |
| **MED-ERR-004** | `src/features/auth/hooks/use-auth.js` | Race condition: `onAuthStateChange` callback updates state after component unmounts, causing memory leak warnings. | Track `isMounted` ref in `useEffect`; ignore state updates if unmounted; cancel subscription in cleanup. | S |
| **MED-ERR-005** | `src/features/chat/api/chat-api.js` — `deleteMessage` | RLS silent failure not checked; returns success even when delete blocked. | Add `.select()` to delete; verify `data.length > 0`; throw explicit `ForbiddenError` if zero rows. | XS |
| **MED-ERR-006** | `src/lib/registerSW.js` | Unhandled promise rejection in `navigator.serviceWorker.register`; offline or blocked contexts crash silently. | Wrap registration in `try/catch`; log structured error; degrade gracefully without SW features. | XS |
| **MED-ERR-007** | `src/features/profile/api/profile-api.js` | Mixed return signatures: `getProfile` returns `data[0]`, `updateProfile` returns `data`. | Normalize all API methods to return plain objects; always assert array length before indexing. | S |
| **MED-ERR-008** | `src/lib/geocoding.js` | No `AbortController` for geocoding fetch; long-running requests hang when user navigates away. | Pass `signal` to `fetch`; abort on `useEffect` cleanup in calling components. | XS |
| **MED-ERR-009** | `src/features/notifications/pages/NotificationFeedPage.jsx` | Race condition in optimistic update: rapid mark-as-read clicks toggle state inconsistently. | Use functional `setQueryData` updater; derive final state from previous, not closure variable. | S |
| **MED-ERR-010** | `src/features/profile/api/profile-api.js` — `updateAvatar` | Upload succeeds but profile update fails silently; avatar URL is lost in storage orphan. | Wrap upload + profile update in a single logical transaction; rollback or retry on second failure. | M |

**Remaining 31:** Missing error boundary for map component (1), inconsistent toast error messages (2), Supabase realtime disconnect not surfaced (2), missing `.single()` error handling (3), form submission double-click not debounced (1), missing timeout on RPC calls (2), unhandled `PGRST116` errors (2), query retry logic swallows 4xx details (1), network error not distinguished from auth error (2), `useQuery` error state not reset on retry (1), scroll listener not cleaned up in `VirtualList` (1), missing fallback for `localStorage` quota exceeded (1), unhandled `POST` 413 payload too large (1), missing error state in `AddressAutocomplete` dropdown (2), race in `useConversations` real-time invalidation (2), `onAuthStateChange` duplicate firings not deduped (1), Sentry not capturing async errors in hooks (2), missing catch on `Image` decode promise (1), inconsistent `null` vs `undefined` checks (3).

---

## Code Quality (36 findings)

| ID | File | Issue | Fix | Effort |
|----|------|-------|-----|--------|
| **MED-QA-001** | `src/features/broadcast/pages/BroadcastFeedPage.jsx` | Unused imports (`useState`, `useEffect` imported but not used); `eslint-plugin-unused-imports` not catching. | Remove unused imports; verify lint config targets this file; run `npm run lint:fix`. | XS |
| **MED-QA-002** | `src/features/chat/components/ConversationListItem.jsx` | Imports `AvatarWithStatus` from `../../profile/components/ProfileAvatar` — cross-feature coupling. | Move `AvatarWithStatus` to `src/components/shared/`; update all imports; add lint rule for cross-feature. | S |
| **MED-QA-003** | `src/components/ui/primitives/Button.jsx` | Props spread without validation (`{...props}`) allows invalid DOM attributes to leak to `<button>`. | Use explicit prop destructuring + `forwardRef`; filter out non-DOM props with utility. | S |
| **MED-QA-004** | `src/lib/constants.js` | Magic number `300000` (broadcast expiry ms) used inline in multiple files without named constant. | Export `BROADCAST_EXPIRY_MS = 5 * 60 * 1000` from `constants.js`; replace all inline occurrences. | XS |
| **MED-QA-005** | `src/features/map/components/LiveMap.jsx` | Unused variable `markersRef` initialized but never read after migration to state-driven markers. | Delete `markersRef`; verify no downstream dependency; commit with lint pass. | XS |
| **MED-QA-006** | `src/components/ui/card.jsx` | Prop spreading on wrapper `div` (`className={cn("...", className)} {...props}`) without DOM validation. | Destructure known props explicitly; use `React.forwardRef` typed with JSDoc for IntelliSense. | XS |
| **MED-QA-007** | `src/lib/constants.js` | Polling interval `15000` repeated in 4 hooks; changing one risks inconsistency. | Define `DEFAULT_POLL_INTERVAL_MS = 15000`; import in `use-notifications`, `use-online-status`, etc. | XS |
| **MED-QA-008** | `src/features/safety/components/ReportForm.jsx` | Imports `useProfile` from `../../profile/hooks/use-profile` — cross-feature boundary violation. | Extract shared user identity hook to `src/hooks/use-current-user.js` or use auth context directly. | S |
| **MED-QA-009** | `src/hooks/use-blocked-ids.js` | Unused import `useCallback` left after refactor to simple `useQuery` wrapper. | Remove unused `useCallback`; run linter. | XS |
| **MED-QA-010** | `src/lib/broadcastUtils.js` | Magic number `500` (max character limit) hardcoded; diverges from DB constraint. | Sync with DB `CHECK` constraint length; export `BROADCAST_MAX_CHARS` constant. | S |

**Remaining 26:** Deep nesting in `broadcast-api.js` (1), inconsistent file naming (`use-auth.js` vs `useAuthState.js`) (2), duplicate `cn()` utility definition (1), prop-types import left in legacy component (1), `console.log` in production path (2), cross-feature import `chat` → `notifications` (1), `var` usage in `registerSW.js` (1), missing JSDoc on exported hooks (3), overly broad `eslint-disable` comments (2), string literal repetition for route paths (2), inconsistent error class naming (1), `TODO` comments without ticket IDs (2), dead code branch in `OnboardingGuard` (1), mutable default params (1), `==` instead of `===` in legacy util (2), nested ternary in JSX (2), export all from `index.js` causing barrel bloat (1).

---

## Cross-Category Patterns

For AI-assisted remediation, the following patterns appear in **multiple** categories and can be bulk-fixed:

1. **`.select('*')` over-fetching** → Security + Performance + Supabase  
   *Bulk fix:* Audit all API files; replace `*` with explicit column lists.

2. **Missing `AbortController` on fetch** → Error Handling + Performance  
   *Bulk fix:* Wrap all `fetch` and Supabase calls in cancellable patterns; add helper `createCancellableRequest`.

3. **Client-side filters on server-fetched data** → Security + Performance  
   *Bulk fix:* Move all filtering/sorting into RPC or query builder; client only handles presentation.

4. **`useCallback` overuse / missing `useMemo`** → Performance + Code Quality  
   *Bulk fix:* Remove `useCallback` where children are not memoized; add `useMemo` for derived arrays/objects.

5. **RLS silent failures** → Security + Error Handling  
   *Bulk fix:* Add `.select()` to all mutating queries; assert row count; throw domain errors.

---

## Remediation Priority (Recommended Order)

| Rank | Category | Rationale |
|------|----------|-----------|
| 1 | **Error Handling** | Silent failures mask all other bugs; fixing first improves observable reliability. |
| 2 | **Security** | Auth bypass and data leakage have immediate user impact. |
| 3 | **Supabase / Database** | Index fixes reduce infra cost and improve UX latency quickly. |
| 4 | **Performance** | Memoization and deduplication improve perceived speed and battery life. |
| 5 | **PWA / Mobile** | Offline resilience is a core value proposition for riders. |
| 6 | **UI / UX** | Accessibility and scroll fixes improve inclusivity and polish. |
| 7 | **Code Quality** | Refactoring and cleanup reduce future bug velocity. |

---

## Metadata for Downstream Processing

```yaml
audit_version: "2.0-comprehensive"
severity: MEDIUM
total_findings: 212
categories_counted: true
file_format: markdown_table
ai_readable: true
has_cross_category_patterns: true
has_remediation_priority: true
supabase_project_id: iygtbcserdmvhhjicyyp
```
