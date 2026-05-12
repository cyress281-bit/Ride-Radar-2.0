# Ride Radar 2.0 — Comprehensive Code Audit Report
**Date:** 2026-05-12
**Scope:** Architecture, Bugs, Performance, Security, Code Quality
**Audited Agents:** 5 specialized sub-agents across 120+ files

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 3 | 5 | 7 | 5 |
| Bugs / Logic | 3 | 4 | 6 | 3 |
| Performance | 3 | 6 | 5 | 2 |
| Architecture | 2 | 4 | 6 | 3 |
| Maintainability | 1 | 3 | 7 | 4 |
| **Total** | **12** | **22** | **31** | **17** |

> **Recommendation:** Do not ship to production until all **Critical** findings are resolved. The app has functional breakage (virtualization, image uploads, broadcast creation), gaping RLS holes, and a service worker that actively destroys the PWA experience on every load.

---

## Critical Findings (Fix Immediately)

### 1. Missing INSERT RLS Policies — Complete Security Theater
- **File:** `supabase/migrations/20260509_enable_rls_fix_admin.sql`, `20260506_admin_rls_policies.sql`
- **Issue:** RLS is enabled on `broadcasts`, `users`, `user_profiles`, `conversations`, and `account_deletion_requests`, but **no INSERT policies exist** in any migration. Either the app cannot write data, or RLS is disabled in production and the database is wide open.
- **Action:** Add explicit INSERT/UPDATE/DELETE policies for every table, or confirm RLS is disabled and document the security model.

### 2. `get_nearby_broadcasts` RPC Exposed to Anonymous Users
- **File:** `supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql`
- **Issue:** The RPC has no `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC`. Supabase defaults allow `PUBLIC` execution. Unauthenticated callers can retrieve all active broadcasts with precise lat/lng within any radius.
- **Action:** `REVOKE ... FROM PUBLIC; GRANT ... TO authenticated;`

### 3. Missing `conversation_notifications` Table / RLS
- **File:** `src/features/chat/api/chat-api.js` (line 58)
- **Issue:** `markConversationRead` upserts into `conversation_notifications`, but this table **does not exist in any migration**. If created manually in the dashboard, it almost certainly lacks RLS policies.
- **Action:** Add a migration creating the table with proper RLS, or remove the code path.

### 4. `useCreateBroadcast` Crashes on Error (Missing `toast` Import)
- **File:** `src/features/broadcast/hooks/use-create-broadcast.js` (lines 170–176)
- **Issue:** `onError` calls `toast()`, but `toast` is never imported. Any failed broadcast creation throws a `ReferenceError` and crashes the app.
- **Action:** Import `toast` from `sonner` or replace with `console.error` + UI fallback.

### 5. `uploadImageIfNeeded` Always Generates Broken URLs
- **File:** `src/lib/image-utils.js` (lines 220–231)
- **Issue:** `uploadImage()` returns a **string** (public URL), but `uploadImageIfNeeded` destructures it as `{ data, error }`. `data?.path` is always `undefined`, so `getPublicUrl()` receives a broken path.
- **Action:** Change to `const publicUrl = await uploadImage(...)` and return it directly.

### 6. `useNotifications` TypeError on Mark-As-Read
- **File:** `src/features/notifications/hooks/use-notifications.js` (lines 174–188)
- **Issue:** `qc.setQueriesData({ queryKey: notificationKeys.all }, updater)` matches **both** the list queries (arrays) and the unread-count query (a number). The updater calls `old.map(...)` on the number, crashing the mutation.
- **Action:** Use exact query keys or add a type guard in the updater.

### 7. Virtualization Completely Non-Functional
- **Files:** `src/components/shared/VirtualList.jsx`, `src/features/chat/components/ConversationList.jsx`, `src/features/chat/pages/ConversationPage.jsx`
- **Issue:** `VirtualList` expects `itemHeight`, but callers pass `estimateSize`. Unsupported props (`gap`, `height`, `scrollToBottom`) are silently ignored. `itemHeight` becomes `undefined`, so `@tanstack/react-virtual` cannot calculate sizes. In long conversations, **every message is rendered in the DOM**.
- **Action:** Fix prop mapping in `VirtualList` or replace it with direct `useVirtualizer` usage.

### 8. `LiveMap` Re-renders All Markers on Every Profile Batch Tick
- **Files:** `src/features/map/components/LiveMap.jsx`, `src/hooks/use-profile-batch.js`
- **Issue:** `LiveMap` uses a custom `memo` comparator checking `getProfile` by reference. `useProfileBatch` returns `getProfile` via `useCallback` tied to a `profiles` Map that is recreated on every chunk change. This breaks memoization, forcing all 400 potential Leaflet `Marker` + `Popup` components to re-render constantly.
- **Action:** Stabilize the `profiles` Map reference or remove `getProfile` from the memo comparison.

### 9. Service Worker Destroys PWA on Every Page Load
- **File:** `src/lib/registerSW.js` (lines 21–29)
- **Issue:** Unconditionally unregisters all service workers and clears **all** caches on every load. This defeats the entire purpose of the PWA and forces full asset re-download on every visit.
- **Action:** Remove aggressive unregister/cache-clear logic; adopt a versioned cache strategy.

### 10. Root Auth Subscription Causes Full-App Re-render Cascades
- **File:** `src/App.jsx` (line 218)
- **Issue:** `AppContent` calls `useAuthState()`, subscribing the entire route tree to auth changes. Every token refresh or profile load re-renders all routes.
- **Action:** Extract a local `LoginRoute` component so `AppContent` stays auth-agnostic.

### 11. `useNearbyBroadcasts` Tears Down Realtime on Every GPS Jitter
- **File:** `src/features/broadcast/hooks/use-nearby-broadcasts.js`
- **Issue:** The realtime `useEffect` lists raw `lat`/`lng` in dependencies instead of `roundedLat`/`roundedLng`. Every GPS micro-movement destroys and recreates the `'broadcasts-realtime'` channel.
- **Action:** Use rounded coordinates in the dependency array.

---

## High Findings (Fix Next Sprint)

### Security
12. **Admin read APIs lack server-side role assertion** — `admin-api.js` lines 14–112 rely solely on RLS. `assertAdmin()` is not called. Misconfigured RLS = full data leak.
13. **`get_public_profiles` RPC callable by anonymous users** — No `REVOKE` / `GRANT` controls. Unnecessary privacy exposure.
14. **Block enforcement is client-side only** — `getBroadcasts()` and `getNearbyBroadcasts()` do not filter blocked users server-side. A malicious client receives all broadcasts.
15. **`sendAnnouncement` is a DoS vector** — Fetches **all users**, maps them into notification rows, and batch-inserts 500 at a time with no upper bound. Will timeout or exhaust DB connections at scale.
16. **Storage upload allows file overwrite (`upsert: true`)** — `src/lib/image-utils.js` line 158. If an attacker can predict the path, they can overwrite another user’s avatar.

### Bugs / Logic
17. **`useNearbyBroadcasts` static channel name causes cross-component teardown** — Two components mounting the hook share one Supabase channel. When either unmounts, it kills live updates for the other.
18. **`useMessages` drops messages from same user on other devices** — Realtime INSERT handler early-returns for all messages where `from_user_id === user.id`, silently dropping messages sent from another device/tab.
19. **`useLiveMap` get-or-create race condition** — Unguarded `insert` into `user_map_settings`. Two tabs inserting simultaneously hit a Postgres unique violation that is not caught, leaving the query permanently errored.
20. **`useSendMessage` silently loses conversation timestamp updates** — Sends the message, then updates `conversations.last_message_at`. If the conversation update fails, the mutation still resolves successfully but the conversation list ordering becomes stale.

### Performance
21. **`BroadcastFeedPage` full list remount on filter/sort change** — `key={\`${filter}-${sortBy}\`}` destroys every `BroadcastCard` DOM node and rebuilds from scratch, causing severe layout thrashing and loss of scroll position.
22. **`BroadcastFeedPage` bottom sheet has no virtualization** — Renders **all** `filteredBroadcasts` as `BroadcastCard` components. In high-density areas (100+ signals) this creates a massive unvirtualized DOM with images, Framer Motion, and complex CSS.
23. **`MessageBubble` mounts Framer Motion for every message** — In long threads this adds significant animation engine overhead, compounded by broken virtualization.
24. **`OptimizedImage` spawns one IntersectionObserver per instance** — Dozens/hundreds of observers in a feed instead of a single shared one.
25. **`useAdminData` fetches 8 datasets with aggressive polling** — `refetchInterval: 30000` on users, broadcasts, profiles, reports, blocks, notifications, deletion requests, and conversations simultaneously. Hammers Supabase and keeps React busy reconciling large datasets.
26. **Single `Suspense` boundary wraps entire route tree** — Navigating to any lazy-loaded route swaps the entire page for a spinner, causing full-screen layout shift.

### Architecture
27. **Supabase client used directly throughout hooks/pages, breaking API layer** — At least 20 files bypass the established `src/features/*/api/*.js` boundary, leaking database concerns into UI layers.
28. **Singleton `queryClient` imported directly** — `use-auth.js`, `AccountDeletionPage.jsx`, and `SettingsPage.jsx` import the global `queryClient` instead of using `useQueryClient()` from context.
29. **Duplicated "remember device" logic** — `auth-api.js` redefines `REMEMBER_DEVICE_KEY` and `setRememberDevicePreference`, which already exist in `supabase.js`.
30. **Imperative `queryClient.clear()` inside auth action** — `use-auth.js` line 356 couples auth directly to every feature's caching strategy.

### Maintainability
31. **Admin guard logic copy-pasted across 11 pages** — Every admin page repeats `useAdminRole()` → skeleton → access-denied → content. Extract `<AdminRouteShell>`.
32. **`timeAgo` / `formatDistance` duplicated** — Implemented in both `src/lib/utils.js` and `src/lib/broadcastUtils.js` with slightly different logic.

---

## Medium Findings (Plan for Upcoming Sprint)

### Security
33. **Unsanitized user input in PostgREST `.or()` filter** — `profile-api.js` line 163 constructs `.or(\`display_name.ilike.${pattern},username.ilike.${pattern}\`)` with raw user input. Structure injection risk.
34. **`get_or_create_conversation` does not verify friendship** — Any authenticated user can force-create a conversation with any other user.
35. **Realtime subscriptions rely entirely on client-side filtering** — `live_map_presence` channel has no row filter. If Supabase Realtime RLS integration is misconfigured, every subscriber receives every presence update globally.
36. **Auth tokens in `localStorage` (XSS exposure)** — When "remember device" is enabled, JWT and refresh token are extractable via XSS. `sessionStorage` would be safer.
37. **`window.supabase` exposed in dev builds** — `src/lib/supabase.js` line 149. If `import.meta.env.DEV` is ever true in staging, the full Supabase client is globally accessible.
38. **No rate limiting on social features** — No client-side throttling on reports, connection requests, or broadcast creation.
39. **`publishPresence` accepts arbitrary column values** — A malicious client can bypass `buildPresenceLocation` and publish precise coordinates while setting `location_precision: 'approximate'`.
40. **Admin `updateUserRole` does not validate role against allow-list** — Any string can be passed as `role`. The DB has no `CHECK` constraint.

### Bugs / Logic
41. **`getTodaysStats` timezone skew** — Computes "today" in local midnight then calls `.toISOString()` (UTC), shifting the cutoff by the timezone offset.
42. **`useCreateBroadcast` fails to invalidate nearby queries** — A newly created broadcast will not appear on the live map until the nearby query's `staleTime` (60s) expires.
43. **`useMessageQueue` returns `{ sent: true }` before network completes** — `sendMessage(payload)` is fired without `await`.
44. **`useMessages` mutates `seenIdsRef` as side effect** — During background refetches, the deduplication set resets, allowing duplicate messages.
45. **`getOrCreateConversation` uses `.contains()` incorrectly** — Matches any group chat containing both users, not just the 1:1 DM.
46. **`useOfflineQueue` calls `processQueue()` without catch** — Any future regression introducing an uncaught throw would produce an unhandled promise rejection.

### Performance
47. **`FitMapToItems` stale closure from incomplete deps** — `LiveMap.jsx` lines 70–106 uses `items` array directly but only lists `items.length` in dependency array.
48. **Main-thread broadcast ranking on every data change** — `BroadcastFeedPage` sorting runs in `useMemo` on the main thread. Blocks rendering for large result sets.
49. **Admin list pages lack virtualization** — `AdminUsersPage`, `AdminBroadcastsPage`, `AdminReportsPage` map full datasets to DOM.
50. **`useProfileBatch` query-key fragmentation** — Query keys use `chunk.join(',')`. Different ordering = different cache key = unnecessary refetch.
51. **`ConversationList` `renderItem` invalidates `VirtualList` memoization** — `renderItem` depends on `profiles` Map. When profiles update, every visible row re-renders.
52. **Synchronous `localStorage` writes on every offline queue mutation** — `useOfflineQueue.js` blocks the main thread with JSON serialization on rapid queue additions.

### Architecture
53. **Missing `React.StrictMode`** — `src/main.jsx` mounts without `StrictMode`, losing automatic detection of unsafe side effects.
54. **Cross-feature coupling: BroadcastFeedPage imports Map internals** — Reaches into `map/hooks` and `map/components` from the broadcast feature.
55. **`ConnectionButton` knows too much about 3 features** — Orchestrates connection, block, and chat creation in one component.
56. **Admin `assertAdmin()` violates API contract** — Throws instead of returning `{ data, error }`, and performs a redundant server round-trip on every mutating call.
57. **Missing timeout cleanup in AuthProvider** — `use-auth.js` line 231 defers `loadUserProfile` via `setTimeout` but never clears the ref on unmount.
58. **Unnecessary dynamic imports in prefetch helpers** — `src/lib/query-client.js` dynamically imports `./supabase.js` inside every prefetch function.
59. **ErrorBoundary `setState` inside `componentDidCatch` is risky** — If the boundary itself errors during `setState`, React throws upward with no catcher.

### Maintainability
60. **Magic numbers in `broadcastUtils.js`** — `computeExpiresAt` hardcodes `90`, `240`, `720`, `1440` inline even though `EXPIRY_MINUTES` already defines them.
61. **Console logs left in production paths** — Raw `console.error` / `console.warn` in `ErrorBoundary.jsx`, `analytics.js`, `registerSW.js`, `sentry.js`, `main.jsx`.
62. **Deprecated Web Vital `onFID`** — `performanceMonitoring.js` uses `onFID`, deprecated by Google in 2024. Only `onINP` should be used.
63. **Likely unused npm dependencies** — `ai`, `react-hot-toast`, `input-otp`, `react-day-picker`, `embla-carousel-react`, `cmdk`, `vaul`. Verify and remove.
64. **Dead / barely-used shadcn/ui components** — `aspect-ratio`, `context-menu`, `hover-card`, `input-otp`, `navigation-menu`, `radio-group`, `scroll-area`, `alert-dialog` appear to have 0–2 references.
65. **Inconsistent hook file naming** — `src/hooks/` mixes `camelCase.js` and `kebab-case.js`.
66. **Oversized components** — `BroadcastFeedPage` (520 lines), `NotificationsPage` (482), `SettingsPage` (440), `AdminReportsPage` (382).
67. **`PageHeader` shared component ignored** — `ProfilePage`, `SettingsPage`, `NotificationsPage` still inline their own headers instead of using `<PageHeader>`.

---

## Low Findings (Nice to Have)

### Security
68. **Account deletion has no safeguard for active content** — `delete_user_account()` immediately purges with no check for pending reports or active RSVPs.
69. **Username enumeration via `checkUsernameAvailability`** — Returns boolean with no rate limiting.
70. **Broadcast update/expire/delete rely purely on RLS** — No client-side ownership verification before query.
71. **No server-side content moderation** — Broadcasts and messages inserted with no profanity/spam filtering.
72. **`alert_photos` / `event_image_url` accept arbitrary URLs** — No validation that URLs belong to the app’s storage bucket.
73. **`.env` files unreadable** — The agent could not inspect them; ensure no secrets are committed.

### Bugs / Logic
74. **`getLiveMapPresence` uses client local clock** — Filters with `.gt('expires_at', new Date().toISOString())`. Clock skew causes stale/missing markers.
75. **`useNearbyBroadcasts` cache key mismatch** — Uses rounded coordinates for the cache key but passes raw coordinates to the API.
76. **`useIsFriend` fetches entire friendship list** — Uses a `detail`-style query key but calls `getFriendships` (full list).
77. **`useMarkRead` has no invalidation** — Conversation list unread indicators may stay visible until next natural refetch.
78. **`uploadImage` hardcodes `validateFile(file, 'event')`** — Avatars uploaded through this path are validated against the 10 MB event limit instead of the 5 MB avatar limit.

### Performance
79. **`ConversationItem` receives unstable inline `onClick`** — Defeats `memo` on every parent render.
80. **`App.jsx` eagerly imports `SplashScreen`** — Could be lazy-loaded to reduce initial bundle.
81. **`BroadcastCard` custom equality check is fragile** — Relies on stable `author` object reference, which breaks due to Map recreation issues.

### Architecture
82. **Pointless `memo()` on `AppProviders`** — Only receives `children`, has no effect.
83. **App content renders at `opacity-0` during splash** — Still initializes auth, queries, lazy chunks, and real-time subscriptions before the user can interact.
84. **NotFoundPage over-subscribes to auth state** — Calls `useAuthState()` solely to decide between `/home` and `/landing`.
85. **BroadcastDetailPage imports profile API directly** — Reaches into sibling feature API layer.

### Maintainability
86. **Dead / redundant exports** — `query-client.js` exports both `queryClient` and `queryClientInstance`. `src/features/profile/hooks/use-profile-batch.js` is just a re-export.
87. **`utils.js` exports unused `debounce` and `clamp`** — Local debounce logic is inlined elsewhere.
88. **Inconsistent error-handling UX** — Some pages retry with `window.location.reload()`, others with `refetch()`, others have no retry button.
89. **Type safety gap** — Project has `jsconfig.json` and is overwhelmingly `.js/.jsx`. Complex utilities would benefit from `.ts` migration or stricter JSDoc.
90. **Hardcoded `8000` ms splash timeout** — `src/App.jsx` line 313 without a named constant.
91. **`BroadcastCard` custom equality check relies on stable `author` object reference** — Fragile given Map recreation issues.

---

## Recommended Action Plan

### Week 1 — Stop the Bleeding
1. Fix `uploadImageIfNeeded` destructuring bug (`image-utils.js`)
2. Fix missing `toast` import in `use-create-broadcast.js`
3. Fix `useNotifications` `setQueriesData` TypeError
4. Fix or replace broken `VirtualList` implementation
5. Remove aggressive SW unregister logic in `registerSW.js`
6. Add `REVOKE ... FROM PUBLIC` to all custom RPCs
7. Verify RLS policies exist for every table in production

### Week 2 — Security Hardening
8. Add `assertAdmin()` to every admin read function
9. Server-side block filtering in broadcast queries
10. Remove `upsert: true` from `uploadImage` or enforce per-user path uniqueness
11. Add rate limiting/throttling to social features
12. Validate `updateUserRole` against an allow-list

### Week 3 — Performance
13. Stabilize `LiveMap` memoization (fix `useProfileBatch` Map reference)
14. Remove `key={filter-sortBy}` remount hack in `BroadcastFeedPage`
15. Add virtualization to admin lists and broadcast feed
16. Implement shared `IntersectionObserver` in `OptimizedImage`
17. Replace raw `lat/lng` with rounded coordinates in `useNearbyBroadcasts` effect deps

### Week 4 — Architecture & Quality
18. Extract `<AdminRouteShell>` to eliminate 11-page copy-paste
19. Consolidate `timeAgo` / `formatDistance` into `src/lib/utils.js`
20. Replace direct `queryClient` singleton imports with `useQueryClient()`
21. Standardize hook file naming on kebab-case
22. Remove confirmed unused npm dependencies and dead shadcn components
23. Add `React.StrictMode` to `main.jsx`

---

*Report generated by agent swarm audit. Each finding should be ticketed and assigned before production release.*
