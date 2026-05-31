# Ride Radar 2.0 — Remediation Roadmap

> **Audit Summary:** 508 total issues  
> CRITICAL: 48 | HIGH: 134 | MEDIUM: 212 | LOW: 114  
> **Timeline:** 4 weeks (sprint-based)  
> **Target completion:** End of Week 4

---

## Week 1 — Security & Stability (48 CRITICAL issues)

### 1.1 Summary Table

| Category | Count | Key Actions |
|----------|-------|-------------|
| Authentication & JWT | 6 | Move JWT to httpOnly cookies, fix storage leaks |
| Data Layer & RLS | 10 | Create RLS policies, move admin checks server-side |
| API Reliability | 8 | Fix throw/return error anti-pattern, add offline fallback |
| PWA & Service Worker | 9 | Add missing icons, implement Background Sync |
| UI Runtime Stability | 10 | Fix scroll lock trap, missing Link import, viewport cascade |
| Infrastructure Headers | 5 | Add CSP, X-Frame-Options, Referrer-Policy to index.html |

### 1.2 Detailed Task List

| Task ID | Priority | Finding IDs | Files | Description | Acceptance Criteria | Est. Hours |
|---------|----------|-------------|-------|-------------|---------------------|------------|
| **W1-T1** | P0 | SEC-001, SEC-002, SEC-003 | `src/lib/supabase.js`, `src/features/auth/hooks/use-auth.js`, `vite.config.js` | Fix JWT storage — move to httpOnly cookies or secure cookie fallback. Audit all localStorage/sessionStorage JWT access points and replace with secure cookie-based session storage. | 1. No JWT strings in localStorage. 2. `document.cookie` access only via httpOnly flag. 3. Supabase auth storage adapter updated. 4. Regression test: login/logout/refresh flows pass. | 8 |
| **W1-T2** | P0 | MOD-001, MOD-002 | `src/lib/capacitor-storage.js` (new), `src/lib/supabase.js` | Add missing `capacitor-storage.js` module. The Supabase client references a custom auth storage module that does not exist on disk, causing a build-time / runtime failure on native builds. | 1. File created at `src/lib/capacitor-storage.js`. 2. Exports `getItem`, `setItem`, `removeItem` using Capacitor Preferences API. 3. No build errors. 4. iOS/Android login smoke test passes. | 4 |
| **W1-T3** | P0 | RLS-001, RLS-002, RLS-003, RLS-004, RLS-005 | `supabase/migrations/` (new migration), `supabase/migrations/*` | Create RLS policies for all unprotected tables. Tables identified without SELECT/INSERT/UPDATE/DELETE policies: `event_rsvps`, `live_map_presence`, `official_events`, `user_settings` (partial). | 1. Every table has at least one enabled RLS policy. 2. Policies match app roles (anon, authenticated, admin). 3. Migration file created and numbered sequentially. 4. `supabase db push` succeeds in staging. | 10 |
| **W1-T4** | P0 | SEC-004, SEC-005, SEC-006 | `src/features/admin/api/admin-api.js`, `supabase/migrations/` | Move admin checks to server-side RPCs. Current client-side role checks in admin pages can be bypassed. Replace with Postgres RPCs that enforce `is_admin()` server-side. | 1. No `user.role === 'admin'` checks in client code. 2. All admin mutations call RPCs with internal role validation. 3. RLS policy `USING` clauses reference `is_admin()` where appropriate. 4. Admin API file refactored. | 6 |
| **W1-T5** | P0 | SEC-007, SEC-008, SEC-009, SEC-010 | `index.html`, `vercel.json` | Add CSP, X-Frame-Options, Referrer-Policy to index.html and Vercel headers. Current deployment lacks Content-Security-Policy meta tag and relies only on Vercel defaults. | 1. `<meta http-equiv="Content-Security-Policy">` present in `index.html`. 2. `X-Frame-Options: DENY` confirmed in Vercel headers. 3. `Referrer-Policy: strict-origin-when-cross-origin` confirmed. 4. No console CSP violations on dev build. | 3 |
| **W1-T6** | P0 | API-001, API-002, API-003, API-004, API-005, API-006, API-007, API-008 | `src/features/*/api/*-api.js` | Fix throw/return error pattern in all API files. Multiple API modules return `{ data, error }` objects without throwing, causing callers to miss errors. Standardize to `if (error) throw error` everywhere. | 1. Every API file audited; no silent error returns. 2. All callers wrapped in try/catch or React Query `throwOnError`. 3. Unit tests updated. 4. `npm run lint` passes. | 8 |
| **W1-T7** | P0 | PWA-001, PWA-002 | `public/offline.html` (new), `src/lib/registerSW.js`, `vite.config.js` | Add offline fallback page. Workbox precache does not include an offline HTML shell; users see browser default offline page. | 1. `public/offline.html` created with app branding and retry button. 2. Workbox `offlineFallback` configured. 3. Service worker serves `offline.html` on navigation failure. 4. Verified in Chrome DevTools offline simulation. | 4 |
| **W1-T8** | P0 | PWA-003, PWA-004, PWA-005 | `src/lib/registerSW.js`, `src/features/safety/components/SafetyActions.jsx`, `vite.config.js` | Implement Background Sync for Bike Down alerts. Safety alerts submitted while offline are lost. Register a Background Sync tag `bike-down-sync` and queue failed POSTs for retry. | 1. Background Sync registered in SW. 2. Failed safety alert submissions enqueue to IndexedDB queue. 3. SW replays queue on `sync` event. 4. UI shows "queued" state when offline. | 6 |
| **W1-T9** | P0 | UI-001, UI-002 | `src/components/layout/BottomSheet.jsx`, `src/features/broadcast/components/PostDetailSheet.jsx` | Fix scroll lock trap in PostDetailSheet. When BottomSheet opens, body scroll is disabled but focus is not restored on close, and scroll lock leaks to background on iOS Safari. | 1. `useLockBodyScroll` hook cleans up on unmount. 2. Focus restored to trigger element on close. 3. iOS Safari tested: background does not scroll when sheet is open. 4. No `touchmove` console warnings. | 4 |
| **W1-T10** | P0 | PWA-006, PWA-007, PWA-008, PWA-009, PWA-010 | `public/` (new files), `public/manifest.json` | Add all missing PWA icon files. Audit manifest `icons` array against actual files in `public/`. Missing: maskable-icon-192.png, certain apple-touch-icon variants. | 1. All manifest icon entries resolve to existing files. 2. Maskable icons generated for 192px and 512px. 3. Apple touch icons present for all required sizes. 4. Lighthouse PWA audit score ≥ 90. | 3 |
| **W1-T11** | P0 | RUN-001 | `src/features/chat/components/ConversationList.jsx`, `src/features/broadcast/components/FeedCard.jsx` | Fix runtime crash (missing Link import). Two components reference `<Link>` without importing it from `react-router-dom`, causing a white-screen crash on navigation. | 1. All JSX files scanned for `<Link` usage without import. 2. Missing imports added. 3. `npm run build` succeeds with no warnings. 4. Smoke test: navigate to `/messages` and `/home` without crash. | 2 |
| **W1-T12** | P0 | PERF-001, PERF-002 | `src/components/layout/ViewportProvider.jsx`, `src/App.jsx` | Fix viewport provider re-render cascade. `ViewportProvider` creates a new context value object on every render, triggering re-renders in all consumers including expensive map and chat components. | 1. Context value memoized with `useMemo`. 2. Event listeners use `useCallback` or ref pattern. 3. React DevTools Profiler confirms no cascade on window resize. 4. Map and chat consumers do not re-render unless data changes. | 4 |

### 1.3 Risk Mitigation Notes

- **JWT migration risk:** Changing auth storage invalidates all active sessions. Plan a forced re-login on first app load after deploy. Communicate to beta testers in advance.
- **RLS deployment risk:** New restrictive policies can break existing app flows. Stage migration on a preview branch and run full smoke tests before production push.
- **Service Worker risk:** Background Sync is not supported on iOS < 16.4. Provide graceful degradation: if sync unsupported, persist to queue and replay on next online event.
- **CSP risk:** A tight CSP can block legitimate third-party scripts (Plausible, Sentry, Google Fonts). Use `report-only` mode for 48 hours before enforcing.
- **Regression testing:** Allocate 4 hours of dedicated QA at end of Week 1. Do not merge Week 2 branches until all CRITICAL issues are closed and signed off.

### 1.4 Dependencies Between Tasks

```
W1-T2 (capacitor-storage)  ──► W1-T1 (JWT storage)
                               └─► W1-T6 (API error pattern)
W1-T5 (CSP headers)        ──► W1-T7 (offline fallback) ──► W1-T8 (Background Sync)
W1-T12 (viewport memo)     ──► W1-T9 (scroll lock)
W1-T3 (RLS policies)       ──► W1-T4 (admin RPCs)
```

**Critical path:** W1-T2 → W1-T1 → W1-T6 → W1-T3 → W1-T4 → QA sign-off

---

## Week 2 — Performance & Data (134 HIGH issues)

### 2.1 Summary Table

| Category | Count | Key Actions |
|----------|-------|-------------|
| React Performance | 28 | Memoize contexts, callbacks, convert to useQuery |
| Data Fetching | 22 | Fix query keys, add pagination, stale-while-revalidate |
| Database & Indexing | 18 | Add indexes, paginate list queries |
| PWA & Assets | 20 | iOS meta tags, share_target, font loading, Sentry tree-shaking |
| Touch & Input | 16 | 44x44px targets, keyboard avoidance, pull-to-refresh guards |
| State Management | 10 | Fix stale closures, settings hook wiring |

### 2.2 Detailed Task List

| Task ID | Priority | Finding IDs | Files | Description | Acceptance Criteria | Est. Hours |
|---------|----------|-------------|-------|-------------|---------------------|------------|
| **W2-T1** | P1 | PERF-003, PERF-004 | `src/components/layout/ViewportProvider.jsx` | Memoize ViewportProvider context value. The provider recreates its value object on every render, causing all context consumers to re-render unnecessarily. | 1. `useMemo` wraps the full context value. 2. Dependencies array is stable. 3. Profiler shows zero re-renders in consumers during unrelated state changes. | 2 |
| **W2-T2** | P1 | DATA-001, DATA-002 | `src/features/auth/hooks/use-auth.js`, `src/features/profile/hooks/use-profile.js` | Convert auth profile to useQuery. Profile data is currently fetched in a `useEffect` with manual caching. Convert to TanStack Query with proper `queryKey`, staleTime, and background refetch. | 1. `useProfile` uses `useQuery` with key `['profile', userId]`. 2. No `useEffect` fetch logic remains. 3. OnboardingGuard still blocks correctly while loading. 4. Avatar image does not flicker on navigation. | 4 |
| **W2-T3** | P1 | DATA-003, DATA-004 | `src/features/chat/hooks/use-messages.js` | Fix message query key (remove user.id). The message query key includes `user.id`, which changes on token refresh and busts the cache unnecessarily, causing full re-fetch and scroll jump. | 1. Query key changed to `['messages', conversationId]`. 2. RLS still ensures user only sees their messages. 3. Token refresh does not trigger message refetch. 4. Scroll position preserved across re-renders. | 2 |
| **W2-T4** | P1 | DATA-005, DATA-006 | `src/features/map/components/LiveMap.jsx`, `src/features/map/hooks/use-live-map.js` | Add useSettings hook to live map. Live map does not read user settings (e.g., "show me on map" privacy toggle), causing privacy violations and unnecessary GPS polling. | 1. `useSettings` integrated into live map mount effect. 2. Map presence only published if setting allows. 3. If setting disabled, existing presence row is removed. 4. No console errors on settings load. | 3 |
| **W2-T5** | P1 | DATA-007, DATA-008, DATA-009, DATA-010 | `src/features/broadcast/api/broadcast-api.js`, `src/features/chat/api/chat-api.js`, `src/features/connections/api/connections-api.js`, `src/features/notifications/api/notifications-api.js` | Add pagination limits to all list queries. Multiple list API functions select `*` without `.range()` or `.limit()`, risking unbounded result sets and memory pressure. | 1. Every list query has `.limit()` ≤ 50 for initial fetch. 2. Infinite scroll / load-more pattern added where UX requires it. 3. No query returns > 100 rows without explicit pagination. 4. UI still feels responsive. | 6 |
| **W2-T6** | P1 | DB-001, DB-002, DB-003, DB-004, DB-005 | `supabase/migrations/` (new migration) | Add database indexes for common filters. Slow queries identified on: `broadcasts(expires_at, type)`, `messages(conversation_id, created_at)`, `connection_requests(to_user_id, status)`, `notifications(user_id, read)`. | 1. Migration adds `CREATE INDEX` for each identified column set. 2. `EXPLAIN ANALYZE` on representative queries shows Index Scan instead of Seq Scan. 3. Migration is reversible (no `IF NOT EXISTS` ambiguity). | 4 |
| **W2-T7** | P1 | PERF-005, PERF-006, PERF-007, PERF-008 | `src/features/map/components/LiveMap.jsx`, `src/features/chat/components/ConversationView.jsx`, `src/features/broadcast/components/FeedList.jsx` | Memoize inline callbacks in map/chat components. Inline arrow functions passed as props to `Marker`, `MessageBubble`, and `FeedCard` cause re-renders on every parent render. | 1. All inline event handlers wrapped in `useCallback` with stable deps. 2. Child components wrapped in `React.memo` where beneficial. 3. React DevTools confirms reduced render counts. | 5 |
| **W2-T8** | P1 | PWA-011, PWA-012 | `src/lib/query-client.js`, `vite.config.js` | Implement stale-while-revalidate caching. TanStack Query is configured `networkMode: 'offlineFirst'` but lacks explicit SWR behavior for Supabase Storage images and static assets. | 1. Static assets use `stale-while-revalidate` via Workbox. 2. Image queries use `staleTime: Infinity` with background revalidation. 3. Offline users see cached images immediately. | 3 |
| **W2-T9** | P1 | A11Y-001, A11Y-002, A11Y-003 | `src/features/broadcast/components/BroadcastTypeSelector.jsx`, `src/components/layout/BottomNav.jsx`, `src/components/ui/button.jsx` | Fix touch targets to 44x44px minimum. Multiple buttons, nav items, and icon-only actions measure below 44x44px on actual device metrics. | 1. All interactive elements ≥ 44x44px per Chrome DevTools tap target audit. 2. Visual padding increased where needed without breaking layout. 3. No overlap between adjacent targets. | 4 |
| **W2-T10** | P1 | UX-001, UX-002, UX-003 | `src/features/broadcast/components/CreateBroadcastForm.jsx`, `src/features/profile/components/EditProfileForm.jsx`, `src/features/auth/components/OnboardingForm.jsx` | Add success toasts for form submissions. Forms currently submit silently; users receive no confirmation on success, leading to duplicate submissions. | 1. Every major form shows a toast on successful submit. 2. Toast is dismissible and auto-hides. 3. Button returns to idle state before toast appears. 4. Error states still show inline errors. | 3 |
| **W2-T11** | P1 | PERF-009, PERF-010 | `src/features/map/components/LiveMap.jsx`, `src/features/map/hooks/use-map-markers.js` | Fix marker layer rebuild on GPS updates. Current implementation rebuilds all Leaflet markers on every GPS coordinate change instead of updating existing marker positions. | 1. Marker instances reused via ref-based cache. 2. `setLatLng` called on existing markers instead of remove/add. 3. No map flicker on GPS update. 4. Memory profile stable over 5-minute test. | 5 |
| **W2-T12** | P1 | PERF-011, PERF-012 | `index.html`, `src/index.css` | Fix render-blocking Google Fonts. Fonts loaded via `<link>` in `index.html` block first paint by ~400ms on 3G. | 1. Fonts loaded with `display=swap`. 2. Preconnect hints added for `fonts.googleapis.com` and `fonts.gstatic.com`. 3. Fallback font stack defined in CSS. 4. Lighthouse "Eliminate render-blocking resources" no longer flags fonts. | 2 |
| **W2-T13** | P1 | PERF-013, PERF-014 | `src/lib/sentry.js`, `vite.config.js` | Fix Sentry bundle size (named imports). Sentry is imported with `* as Sentry` pattern, preventing tree-shaking and adding ~80KB to the vendor bundle. | 1. Only required Sentry functions imported by name. 2. Bundle analyzer shows Sentry chunk reduced by ≥ 50%. 3. Error capture and replay still function. | 2 |
| **W2-T14** | P1 | PWA-013, PWA-014, PWA-015 | `index.html`, `public/` (new files) | Add iOS PWA meta tags and startup images. Missing `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and startup images for various device sizes. | 1. All Apple meta tags present in `index.html`. 2. Startup images generated for iPhone SE, 8, X, 11, 12, 13, 14, 15, and iPad sizes. 3. iOS "Add to Home Screen" shows full-screen app experience. | 3 |
| **W2-T15** | P1 | PWA-016, PWA-017 | `public/manifest.json` | Add share_target to manifest. Users cannot share URLs/images to Ride Radar from native OS share sheets. | 1. `share_target` declared with `action`, `method`, `enctype`, `params`. 2. Web app receives shared content and routes to create-broadcast with pre-filled URL. 3. Tested on Android Chrome and iOS Safari (fallback documented). | 3 |
| **W2-T16** | P1 | A11Y-004, A11Y-005, A11Y-006 | `src/components/layout/BottomSheet.jsx`, `src/features/broadcast/components/CreateBroadcastForm.jsx` | Fix keyboard avoidance in sheets. BottomSheet and create-broadcast form do not adjust for virtual keyboard, obscuring input fields on mobile. | 1. Sheet content translates upward when keyboard opens. 2. Active input remains visible. 3. No layout breakage on keyboard dismiss. 4. Tested on iOS Safari and Android Chrome. | 4 |
| **W2-T17** | P1 | PWA-018, PWA-019 | `src/hooks/use-app-resume-refresh.js`, `src/components/OfflineBanner.jsx` | Fix pull-to-refresh offline guard. Pull-to-refresh triggers when offline, causing stuck loading spinners and error toasts. | 1. PTR disabled when `navigator.onLine === false`. 2. OfflineBanner state synced with PTR availability. 3. No error toasts on PTR while offline. 4. Online restoration re-enables PTR immediately. | 2 |
| **W2-T18** | P1 | STATE-001, STATE-002 | `src/features/settings/components/NotificationSettings.jsx` | Fix notification settings stale closure. Toggle switches read a stale closure of the settings object, causing them to revert visually or save wrong values. | 1. Settings object accessed via functional updater or ref. 2. Toggle state matches server state after save. 3. Multiple rapid toggles do not cause race conditions. 4. Unit test covers toggle-save sequence. | 3 |

### 2.3 Risk Mitigation Notes

- **Query key changes (W2-T3):** Changing query keys invalidates existing cache. Acceptable trade-off; document in release notes that users may see one-time re-fetch.
- **Pagination limits (W2-T5):** Adding `.limit()` to queries that previously returned all rows may break "scroll to find old item" UX. Pair every limit with an explicit "Load more" button or infinite scroll intersection observer.
- **Database indexes (W2-T6):** Index creation locks tables briefly. Run during low-traffic window or use `CREATE INDEX CONCURRENTLY` if Supabase supports it on the plan.
- **Sentry refactor (W2-T13):** Verify that Sentry Replay and Performance still initialize correctly after switching to named imports. Test error boundary capture.
- **share_target (W2-T15):** iOS Safari does not support `share_target`. Provide a fallback route (`/share-handler`) that works when the app is opened normally with query params.

### 2.4 Dependencies Between Tasks

```
W2-T1 (memoize ViewportProvider)  ──► W2-T7 (memoize callbacks)
W2-T2 (auth profile useQuery)     ──► W2-T4 (useSettings in map)
W2-T3 (message query key)         ──► W2-T7 (memoize chat callbacks)
W2-T5 (pagination limits)         ──► W2-T6 (database indexes)
W2-T12 (font loading)             ──► W2-T14 (iOS meta tags)
W2-T17 (PTR offline guard)        ──► W2-T16 (keyboard avoidance)
```

**Critical path:** W2-T2 → W2-T4 → W2-T5 → W2-T6 → QA sign-off

---

## Week 3 — UX & Polish (212 MEDIUM issues)

### 3.1 Summary Table

| Category | Count | Key Actions |
|----------|-------|-------------|
| Accessibility | 58 | Focus traps, ARIA, keyboard nav, screen reader support |
| Mobile UX | 48 | iOS keyboard, safe areas, pull-to-refresh, motion prefs |
| Code Quality | 42 | Extract duplicates, standardize patterns, retry logic |
| Navigation & Layout | 36 | Scroll-to-top, landscape handling, safe areas |
| Forms & Inputs | 28 | Username aria-live, password toggle a11y, validation feedback |

### 3.2 Detailed Task List

| Task ID | Priority | Finding IDs | Files | Description | Acceptance Criteria | Est. Hours |
|---------|----------|-------------|-------|-------------|---------------------|------------|
| **W3-T1** | P2 | A11Y-007, A11Y-008, A11Y-009 | `src/index.css`, `src/components/ui/`, `src/features/*/components/` | Add prefers-reduced-motion support. Radar sweep, EKG pulse, neon flicker, and glow-pulse animations do not respect `prefers-reduced-motion: reduce`. | 1. `@media (prefers-reduced-motion: reduce)` disables or replaces all non-essential animations with instant state changes. 2. Essential feedback (button press) still visible but instant. 3. No motion-triggered vestibular issues reported. | 4 |
| **W3-T2** | P2 | A11Y-010, A11Y-011, A11Y-012 | `src/components/layout/BottomSheet.jsx`, `src/features/broadcast/components/PostDetailSheet.jsx` | Implement modal focus traps. BottomSheet and PostDetailSheet do not trap focus; tabbing cycles to background elements behind the overlay. | 1. Focus trap active while sheet/modal is open. 2. `Tab` cycles within modal boundaries. 3. `Escape` closes modal and returns focus. 4. Screen reader (VoiceOver/TalkBack) announces modal context. | 5 |
| **W3-T3** | P2 | A11Y-013, A11Y-014 | `src/features/map/components/LocationPickerMap.jsx` | Add keyboard support to LocationPickerMap. Map is not operable without a pointing device; users cannot set location via keyboard. | 1. Arrow keys move selection crosshair by 0.001° increments. 2. Enter/Space confirms location. 3. Focus outline visible on map container. 4. Screen reader announces selected coordinates. | 4 |
| **W3-T4** | P2 | A11Y-015, A11Y-016, A11Y-017 | `src/components/layout/BottomSheet.jsx`, `src/features/*/components/*Sheet*.jsx` | Fix iOS keyboard avoidance in all sheets. Generalize the Week 2 keyboard fix across every sheet component (settings, profile edit, safety report, create broadcast). | 1. All sheet components use shared `useKeyboardAvoidance` hook. 2. Hook extracted to `src/hooks/use-keyboard-avoidance.js`. 3. iOS Safari tested on all sheets. 4. Android behavior unchanged or improved. | 5 |
| **W3-T5** | P2 | A11Y-018, A11Y-019, A11Y-020, A11Y-021 | `src/features/auth/components/LoginForm.jsx`, `src/features/auth/components/OnboardingForm.jsx`, `src/features/auth/components/SignupForm.jsx` | Add ARIA attributes throughout auth flows. Missing `aria-label`, `aria-describedby`, `aria-invalid`, and `role="alert"` on error messages. | 1. Every input has associated label (visible or `aria-label`). 2. Error messages linked via `aria-describedby`. 3. Invalid state announced via `aria-invalid`. 4. Screen reader can complete signup without visual reference. | 4 |
| **W3-T6** | P2 | PWA-020, PWA-021, PWA-022 | `src/features/*/pages/*.jsx`, `src/hooks/use-app-resume-refresh.js` | Fix pull-to-refresh offline guard everywhere. Week 2 fixed the primary hook, but individual pages still implement custom PTR that lacks the guard. | 1. Audit all `usePullToRefresh` or `onRefresh` implementations. 2. Shared `useOfflineAwareRefresh` hook created. 3. All pages migrated to shared hook. 4. Offline PTR smoke test passes on every major page. | 3 |
| **W3-T7** | P2 | API-009, API-010, API-011 | `src/lib/geocoding.js`, `src/lib/locationCache.js`, `src/features/map/api/map-api.js` | Add error retry logic for external APIs. Geocoding and external map APIs fail silently on transient network errors; no retry or fallback. | 1. Exponential backoff retry (3 attempts) for geocoding. 2. Cached result returned on final failure if available. 3. User-visible error only after all retries exhausted. 4. No thundering-herd on retry storms. | 3 |
| **W3-T8** | P2 | CODE-001, CODE-002, CODE-003 | `src/lib/broadcastUtils.js`, `src/lib/conversationUtils.js`, `src/features/broadcast/components/RadarView.jsx` | Extract duplicate utility functions (distanceMeters, normalizeLocationText). Same location math and text normalization copied in 4+ files. | 1. `distanceMeters` extracted to `src/lib/geo.js`. 2. `normalizeLocationText` extracted to `src/lib/text.js`. 3. All call sites updated. 4. Unit tests added for extracted functions. | 3 |
| **W3-T9** | P2 | NAV-001, NAV-002 | `src/App.jsx`, `src/components/layout/AppLayout.jsx` | Add scroll-to-top on navigation. Route changes do not reset scroll position, leaving users in the middle of a new page. | 1. `ScrollToTop` component integrated with `react-router-dom`. 2. Scroll resets on every pathname change. 3. Back/forward navigation restored to previous position (optional enhancement). 4. No jarring scroll jumps on same-page anchor links. | 2 |
| **W3-T10** | P2 | CSS-001, CSS-002, CSS-003 | `src/index.css`, `src/components/layout/AppLayout.jsx`, `src/components/layout/AppHeader.jsx` | Fix safe area handling for landscape. `env(safe-area-inset-*)` is only applied to top/bottom; left/right insets ignored in landscape on notched devices. | 1. CSS padding/margin uses all four safe-area insets where relevant. 2. Header and bottom nav adapt to landscape rotation. 3. Tested on iPhone 14 Pro and Pixel 7 simulators. | 3 |
| **W3-T11** | P2 | A11Y-022, A11Y-023 | `src/features/auth/components/OnboardingForm.jsx` | Add username availability aria-live. Username check is async but screen readers do not announce availability result. | 1. `aria-live="polite"` region for availability status. 2. Loading state announced ("Checking availability"). 3. Success/failure announced clearly. 4. Debounce preserves performance. | 2 |
| **W3-T12** | P2 | A11Y-024, A11Y-025 | `src/features/auth/components/LoginForm.jsx`, `src/features/auth/components/SignupForm.jsx` | Fix password visibility toggle accessibility. Toggle is an icon button without accessible name or state announcement. | 1. Toggle has `aria-label="Show password"` / `"Hide password"`. 2. `aria-pressed` reflects current state. 3. Focus indicator visible. 4. Screen reader announces state change. | 2 |

### 3.3 Risk Mitigation Notes

- **Focus traps (W3-T2):** Improper focus trap implementation can lock keyboard users out entirely. Use a well-tested library pattern (e.g., `focus-trap` npm package) or Radix primitives if available.
- **prefers-reduced-motion (W3-T1):** Disabling animations may break state machines that rely on `onAnimationEnd`. Audit all `animationend` / `transitionend` event handlers.
- **Safe areas (W3-T10):** Landscape safe area changes require actual device or accurate simulator testing. Do not rely solely on Chrome DevTools responsive mode.
- **External API retry (W3-T7):** Geocoding APIs often rate-limit. Exponential backoff must respect rate limit headers (429 with `Retry-After`).

### 3.4 Dependencies Between Tasks

```
W3-T2 (focus traps)        ──► W3-T4 (keyboard avoidance all sheets)
W3-T4 (keyboard avoidance) ──► W3-T3 (LocationPickerMap keyboard)
W3-T5 (auth ARIA)          ──► W3-T11 (username aria-live)
                             └─► W3-T12 (password toggle a11y)
W3-T8 (extract utils)      ──► W3-T7 (external API retry)
W3-T9 (scroll-to-top)      ──► W3-T10 (safe area landscape)
W2-T16 (keyboard fix W2)   ──► W3-T4 (generalized keyboard fix)
```

**Critical path:** W3-T5 → W3-T11 → W3-T12 → QA sign-off

---

## Week 4 — Cleanup (114 LOW issues)

### 4.1 Summary Table

| Category | Count | Key Actions |
|----------|-------|-------------|
| Logging & Dead Code | 32 | Remove console.log, unused imports, dead branches |
| Configuration Consistency | 24 | Standardize colors, manifest fields, Capacitor config |
| Error Handling | 20 | Standardize patterns fully across all features |
| Query Optimization | 18 | Minor query select column pruning, cache size caps |
| Performance Monitoring | 20 | Add cache size monitoring, bundle analysis |

### 4.2 Detailed Task List

| Task ID | Priority | Finding IDs | Files | Description | Acceptance Criteria | Est. Hours |
|---------|----------|-------------|-------|-------------|---------------------|------------|
| **W4-T1** | P3 | LOG-001, LOG-002, LOG-003 | `src/features/*/**/*.js`, `src/features/*/**/*.jsx`, `src/lib/*.js` | Remove production console.log statements. Audit entire `src/` for `console.log`, `console.warn`, and `console.error` that leak to production. Retain only `logger.js` structured logs. | 1. Zero `console.log` in production bundle. 2. ESLint rule added: `no-console` with `allow: ['error']` for true errors. 3. `logger.debug` used for development-only output. 4. Build output inspected via source-map-explorer. | 3 |
| **W4-T2** | P3 | CSS-004, CSS-005, CSS-006 | `tailwind.config.js`, `src/index.css`, `vite.config.js` | Standardize background colors across configs. Background hex values (`#0a0a0f`, `#12121a`, `#1a1a24`) are hardcoded in multiple places and occasionally drift. | 1. All background/surface colors reference CSS custom properties. 2. Tailwind config uses CSS var mapping. 3. No raw hex values for backgrounds outside `index.css`. 4. Dark-mode-only assumption documented. | 2 |
| **W4-T3** | P3 | PWA-023, PWA-024, PWA-025 | `public/manifest.json` | Add missing manifest fields (lang, dir, related_applications). Manifest lacks `lang`, `dir`, and `related_applications` (App Store / Play Store links). | 1. `lang: "en"` added. 2. `dir: "ltr"` added. 3. `related_applications` array with iOS App Store and Android Play Store entries. 4. Manifest validates via https://manifest-validator.appspot.com/. | 1 |
| **W4-T4** | P3 | CAP-001, CAP-002 | `capacitor.config.json`, `ios/App/App/Info.plist` | Fix Capacitor config for iOS. Missing `ios.scheme`, outdated `webDir`, and `Info.plist` does not declare required location usage descriptions for iOS 17+. | 1. `capacitor.config.json` has correct `webDir: "dist"`. 2. `ios.scheme` set to `rideradar`. 3. `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription` present in `Info.plist`. 4. `npx cap sync ios` succeeds. | 2 |
| **W4-T5** | P3 | DEAD-001, DEAD-002, DEAD-003 | `src/features/*/**/*.js`, `src/features/*/**/*.jsx`, `src/hooks/*.js` | Remove dead code and unused imports. ESLint `unused-imports` is enabled but several files are excluded or suppressed. | 1. `npm run lint` reports zero unused imports. 2. No commented-out component code > 5 lines remains. 3. No unreachable branches. 4. Code coverage does not drop (dead code removal improves it). | 4 |
| **W4-T6** | P3 | QUERY-001, QUERY-002, QUERY-003 | `src/features/*/api/*-api.js` | Add minor query optimizations. Prune `.select('*')` to actual needed columns in high-frequency queries; reduces payload and parsing time. | 1. All high-frequency queries select explicit columns. 2. No `.select('*')` in broadcast feed, chat messages, or notifications. 3. Average Supabase response payload reduced (measure via Network tab). | 3 |
| **W4-T7** | P3 | ERR-001, ERR-002, ERR-003 | `src/features/*/api/*-api.js`, `src/lib/supabase.js` | Standardize error handling patterns fully. Some features catch errors and return `null`, others throw, others mutate local state inconsistently. | 1. Every API module follows "throw on error" contract. 2. Every UI surface has an `<ErrorBoundary>` or inline error state. 3. Sentry captures all uncaught errors. 4. Documented pattern added to `AGENTS.md`. | 4 |
| **W4-T8** | P3 | PERF-015, PERF-016 | `src/lib/query-client.js`, `src/lib/tileCache.js`, `src/lib/locationCache.js` | Performance monitoring for cache sizes. TanStack Query cache and custom tile/location caches grow unbounded over long sessions. | 1. `gcTime` capped appropriately on large list queries. 2. Custom caches implement LRU eviction (max 500 entries). 3. Memory snapshot taken before/after 30-minute usage test. 4. No `Out Of Memory` crashes on low-end Android. | 3 |

### 4.3 Risk Mitigation Notes

- **Console removal (W4-T1):** Some `console.error` calls are intentional debugging aids. Review each one; convert genuine errors to Sentry captures, not silent removal.
- **Capacitor config (W4-T4):** Changes to `capacitor.config.json` require `npx cap sync` and Xcode re-build. Do not modify mid-week without coordinating with any native build pipeline.
- **Dead code removal (W4-T5):** Be conservative. If a function looks unused but is exported, search the entire codebase (including tests) before deleting.
- **Query select pruning (W4-T6):** Selecting fewer columns can break components that expect nested relations. Run full typecheck (JSDoc) and smoke tests after column changes.

### 4.4 Dependencies Between Tasks

```
W4-T1 (remove console.log)    ──► W4-T5 (dead code removal)
W4-T2 (standardize colors)    ──► W4-T3 (manifest fields)
W4-T6 (query optimizations)   ──► W4-T8 (cache monitoring)
W4-T7 (standardize errors)    ──► W4-T1 (clean logging)
```

**Critical path:** W4-T5 → W4-T7 → W4-T8 → Final QA & release

---

## Cross-Week Dependencies

```
Week 1 ──────────────────────────────────────────────► Week 2
  W1-T12 (viewport memo)         ──► W2-T1 (ViewportProvider memo)
  W1-T6 (API error pattern)      ──► W2-T5 (pagination limits)
  W1-T8 (Background Sync)        ──► W2-T8 (stale-while-revalidate)
  W1-T3 (RLS policies)           ──► W2-T6 (database indexes)

Week 2 ──────────────────────────────────────────────► Week 3
  W2-T16 (keyboard avoidance)    ──► W3-T4 (all sheets keyboard)
  W2-T1 (ViewportProvider)       ──► W3-T2 (modal focus traps)
  W2-T14 (iOS meta tags)         ──► W3-T10 (safe area landscape)

Week 3 ──────────────────────────────────────────────► Week 4
  W3-T8 (extract utils)          ──► W4-T6 (query optimizations)
  W3-T7 (API retry logic)        ──► W4-T7 (standardize errors)
  W3-T5 (auth ARIA)              ──► W4-T5 (dead code removal, careful)
```

---

## Sprint Burndown Estimate

| Week | Issues | Est. Hours | QA Hours | Total |
|------|--------|------------|----------|-------|
| Week 1 | 48 CRITICAL | 56 | 4 | 60 |
| Week 2 | 134 HIGH | 52 | 4 | 56 |
| Week 3 | 212 MEDIUM | 40 | 4 | 44 |
| Week 4 | 114 LOW | 22 | 4 | 26 |
| **Total** | **508** | **170** | **16** | **186** |

> Assumptions: 1 senior full-stack engineer + 1 QA engineer, 40-hour work weeks. Week 1 has padding for incident response if CRITICAL fixes cause regressions.

---

## Definition of Done (Global)

1. All tasks for the week are implemented and code-reviewed.
2. `npm run lint` passes with zero errors.
3. `npm run typecheck` passes (warnings acceptable per project convention).
4. `npm run test` passes with no new failures.
5. `npm run build` succeeds and bundle size is within 5% of pre-remediation baseline.
6. Smoke tests pass on: Chrome Desktop, Chrome Android, Safari iOS, Safari iOS PWA mode.
7. No new CRITICAL or HIGH issues introduced (verified by spot-audit).
8. `AGENTS.md` updated if architectural patterns changed.
