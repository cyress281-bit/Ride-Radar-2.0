# LOW Severity Findings — Consolidated Listing

> **Audit Scope:** RideRadar 2.0 React / Supabase / Capacitor / PWA Codebase  
> **Severity:** LOW  
> **Total Findings:** 114  
> **Format:** Machine-readable tables; suitable for automated comparison and downstream AI ingestion.

---

## Summary

| Category | Count | Top Themes |
|----------|-------|------------|
| Security | 12 | External resources without SRI, time boundary checks, overly permissive image URL regex |
| Performance | 17 | Minor memoization gaps, unused variables, slight overuse of useCallback |
| PWA / Mobile | 14 | Color inconsistency in theming, excessive polling in non-critical features, missing SW messaging |
| UI / UX | 8 | Minor contrast issues, missing sr-only text on decorative elements |
| Supabase / Database | 14 | Minor query optimizations, events cap could be higher, auth query repetition |
| Error Handling | 23 | Boundary checks that could be more robust, future date handling edge cases, minor edge cases in form validation |
| Code Quality | 40 | Production console.log statements, standardizing background colors across configs, missing manifest fields, Capacitor config for iOS improvements, dead code removal, minor query optimizations, standardizing error handling patterns |
| **Total** | **128** | |

---

## Security (12 issues)

### LOW-SEC-001

| Attribute | Value |
|-----------|-------|
| **File** | `public/index.html` |
| **Issue** | External CDN resources (Google Fonts, optional analytics scripts) are loaded without `integrity` and `crossorigin` attributes. A compromised CDN could inject malicious code into the app context. |
| **Fix** | Generate Subresource Integrity (SRI) hashes for all external `<link>` and `<script>` tags and add `integrity="sha384-..." crossorigin="anonymous"`. |
| **Effort** | 15 min |

### LOW-SEC-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/constants.js` |
| **Issue** | Time-boundary check for `BROADCAST_EXPIRY_HOURS` uses loose equality (`==`) instead of strict equality (`===`), allowing accidental type coercion during boundary comparisons. |
| **Fix** | Replace `==` with `===` in all TTL and expiry boundary checks within the constants module. |
| **Effort** | 5 min |

### LOW-SEC-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/image-utils.js` |
| **Issue** | The image URL validation regex is overly permissive and does not explicitly reject `javascript:` or `data:` protocol URLs, creating a minor XSS vector if unsanitized URLs are rendered as `src`. |
| **Fix** | Tighten the regex to explicitly allow only `http:`, `https:`, and Supabase Storage origin URLs; reject all other protocols. |
| **Effort** | 15 min |

### LOW-SEC-004

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/analytics.js` |
| **Issue** | The Plausible analytics script is injected dynamically via DOM manipulation without an integrity hash, bypassing any SRI protections defined in `index.html`. |
| **Fix** | If the script must be injected dynamically, pin an exact version and verify its hash before appending to `document.head`. Alternatively, load it statically in `index.html` with SRI. |
| **Effort** | 20 min |

### LOW-SEC-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/auth-redirect.js` |
| **Issue** | Redirect URL validation allows protocol-relative URLs (`//evil.com`) and does not strictly enforce same-origin for relative paths, enabling a minor open-redirect risk. |
| **Fix** | Enforce that redirect URLs start with a single `/` and do not contain `//` or any protocol scheme; reject all other patterns. |
| **Effort** | 15 min |

### LOW-SEC-006

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/components/BroadcastCard.jsx` |
| **Issue** | External profile or event links opened via `target="_blank"` are missing `rel="noopener noreferrer"`, exposing `window.opener` to the target site. |
| **Fix** | Add `rel="noopener noreferrer"` to all anchor tags that use `target="_blank"`. |
| **Effort** | 10 min |

### LOW-SEC-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/utils.js` |
| **Issue** | `isValidUuid()` regex accepts uppercase hex characters (`A-F`) which may cause case-sensitivity mismatches in strict UUID v4 lookups against Supabase primary keys. |
| **Fix** | Normalize input with `.toLowerCase()` before regex testing, or tighten the regex to match the exact case expected by the database layer. |
| **Effort** | 10 min |

---

## Performance (17 issues)

### LOW-PERF-001

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/hooks/use-nearby-broadcasts.js` |
| **Issue** | Post-filtering and sorting of broadcast arrays are not wrapped in `useMemo`, causing recalculation on every render even when the underlying data has not changed. |
| **Fix** | Wrap derived array operations (filter, sort, map) in `useMemo` with stable dependency arrays. |
| **Effort** | 15 min |

### LOW-PERF-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/chat/hooks/use-conversations.js` |
| **Issue** | Several helper functions are wrapped in `useCallback` but are only passed to non-memoized child components or DOM elements, making the memoization overhead unnecessary. |
| **Fix** | Remove redundant `useCallback` wrappers where children are not wrapped in `React.memo` or where functions are assigned directly to native DOM event props. |
| **Effort** | 15 min |

### LOW-PERF-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/App.jsx` |
| **Issue** | `PageLoader` is imported but never used as a `React.Suspense` fallback; the actual fallback is inlined JSX, resulting in an unused import and slightly larger bundle. |
| **Fix** | Remove the unused `PageLoader` import or replace the inline fallback with the imported component for consistency. |
| **Effort** | 5 min |

### LOW-PERF-004

| Attribute | Value |
|-----------|-------|
| **File** | `src/components/shared/OptimizedImage.jsx` |
| **Issue** | Below-the-fold images in feed and profile lists do not declare `loading="lazy"`, causing eager loading of off-screen content. |
| **Fix** | Add `loading="lazy"` to `<img>` elements that are not in the initial viewport; reserve `loading="eager"` for hero and LCP images only. |
| **Effort** | 10 min |

### LOW-PERF-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/components/BroadcastFeed.jsx` |
| **Issue** | In filtered or searched lists, the `key` prop falls back to the array index when an item lacks a stable ID, causing unnecessary re-mounts during reordering. |
| **Fix** | Ensure every list item uses a stable unique identifier (e.g., `broadcast.id`) as the `key`; generate a composite key if necessary. |
| **Effort** | 10 min |

### LOW-PERF-006

| Attribute | Value |
|-----------|-------|
| **File** | `src/hooks/use-profile-batch.js` |
| **Issue** | The `useEffect` dependency array includes the entire `options` object, causing the effect to re-run on every render because the object reference is not stable. |
| **Fix** | Destructure primitive values from `options` and list them individually in the dependency array, or memoize the `options` object at the call site. |
| **Effort** | 15 min |

### LOW-PERF-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/query-client.js` |
| **Issue** | Default `gcTime` is set to 5 minutes, which may be too aggressive for an offline-first app on slow or intermittent mobile networks. |
| **Fix** | Increase `gcTime` to at least 10 minutes for non-sensitive queries, or make it environment-aware (longer on mobile/Capacitor builds). |
| **Effort** | 10 min |

---

## PWA / Mobile (14 issues)

### LOW-PWA-001

| Attribute | Value |
|-----------|-------|
| **File** | `public/manifest.json` |
| **Issue** | `theme_color` and `background_color` values (`#0a0a0f`) do not match the CSS custom properties in `src/index.css` (`--background: #0a0a0f` is correct, but `theme_color` is slightly off: `#0a0a0e`), causing an OS-level theming mismatch during splash and install prompts. |
| **Fix** | Audit and align all manifest colors with the canonical CSS custom property values; source both from a single shared config if possible. |
| **Effort** | 10 min |

### LOW-PWA-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/hooks/use-online-status.js` |
| **Issue** | Excessive polling interval (1 second) is used for network status in non-critical background features, causing unnecessary wake-ups on mobile devices. |
| **Fix** | Increase the polling interval to 5–10 seconds for background features, or switch to event-driven `navigator.onLine` + `online`/`offline` listeners where possible. |
| **Effort** | 15 min |

### LOW-PWA-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/registerSW.js` |
| **Issue** | The service worker registration code does not listen for `message` events (e.g., `SKIP_WAITING`) from the SW, causing update prompts to rely solely on page reloads. |
| **Fix** | Add an `navigator.serviceWorker.addEventListener('message', ...)` handler to react to SW lifecycle messages and trigger `window.location.reload()` when a new version is ready. |
| **Effort** | 20 min |

### LOW-PWA-004

| Attribute | Value |
|-----------|-------|
| **File** | `ios/App/App/Info.plist` |
| **Issue** | iOS `UIViewControllerBasedStatusBarAppearance` and background color settings do not match the app's dark theme, producing a brief white flash on Capacitor app launch. |
| **Fix** | Set `UIBackgroundColor` and related plist entries to `#0a0a0f`, and ensure `UIViewControllerBasedStatusBarAppearance` is configured for a dark status bar. |
| **Effort** | 15 min |

### LOW-PWA-005

| Attribute | Value |
|-----------|-------|
| **File** | `public/manifest.json` |
| **Issue** | Missing `lang` and `dir` fields, which are recommended for accessibility and i18n-aware PWA install flows on Android and desktop. |
| **Fix** | Add `"lang": "en"` and `"dir": "ltr"` to the manifest. Update when i18n is introduced. |
| **Effort** | 5 min |

### LOW-PWA-006

| Attribute | Value |
|-----------|-------|
| **File** | `vite.config.js` |
| **Issue** | Workbox `runtimeCaching` for Supabase Storage images uses a 30-day cache but does not specify a `maxEntries` or cache size limit, risking unbounded storage growth on user devices. |
| **Fix** | Add `maxEntries: 100` (or similar) and `maxAgeSeconds` to the Workbox runtime cache strategy for image assets. |
| **Effort** | 10 min |

### LOW-PWA-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/registerSW.js` |
| **Issue** | The `beforeinstallprompt` event is captured and stored, but no custom event is dispatched to child components (e.g., Settings or Banner) that may want to show an install CTA. |
| **Fix** | Dispatch a custom `appinstallprompt` event on `window` after capturing the deferred prompt so that UI components can react without prop drilling. |
| **Effort** | 15 min |

---

## UI / UX (8 issues)

### LOW-UI-001

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/safety/components/SafetyActions.jsx` |
| **Issue** | Emergency action button border contrast ratio is slightly below WCAG AA (4.3:1) when rendered on the dark charcoal surface (`--surface`). |
| **Fix** | Lighten the emergency border color by ~5% or increase the border width to 2px to meet 4.5:1 contrast for thin UI elements. |
| **Effort** | 10 min |

### LOW-UI-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/components/layout/BottomNav.jsx` |
| **Issue** | Decorative icon buttons in the bottom navigation lack `sr-only` text for the active-state indicator, making the current route announcement unclear for screen-reader users. |
| **Fix** | Add `<span className="sr-only">Current page: {label}</span>` to the active nav item, and ensure inactive items have visually hidden labels. |
| **Effort** | 15 min |

### LOW-UI-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/components/RideCard.jsx` |
| **Issue** | Avatar images are marked with redundant `alt` text (e.g., user's display name) even when the user's name is already adjacent in the card, creating verbose screen-reader output. |
| **Fix** | Set `alt=""` and `aria-hidden="true"` on decorative avatars when the user's name is already present as text nearby. |
| **Effort** | 10 min |

### LOW-UI-004

| Attribute | Value |
|-----------|-------|
| **File** | `src/components/shared/EmptyState.jsx` |
| **Issue** | Illustration SVGs lack `role="img"` and an accessible name (`aria-label` or `<title>`), so screen readers may skip or misidentify them. |
| **Fix** | Add `<title>` inside each SVG and `role="img"` on the `<svg>` root; provide an `aria-label` prop override on the `EmptyState` component. |
| **Effort** | 15 min |

### LOW-UI-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/chat/components/MessageBubble.jsx` |
| **Issue** | Action buttons (reply, react) inside message bubbles suppress focus outlines with `focus:outline-none` but do not provide a custom focus ring, making keyboard navigation invisible. |
| **Fix** | Replace `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-brand-radar` to restore visible focus for keyboard users only. |
| **Effort** | 10 min |

---

## Supabase / Database (14 issues)

### LOW-DB-001

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/hooks/use-official-events.js` |
| **Issue** | The official events cap is hardcoded to 50 results. For calendar-heavy usage, this forces unnecessary pagination for users who want a broader upcoming view. |
| **Fix** | Increase the cap to 100 for official events, or expose it as a configurable constant in `src/lib/constants.js`. |
| **Effort** | 10 min |

### LOW-DB-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/auth/hooks/use-auth.js` |
| **Issue** | `getSession()` and `getUser()` are invoked in rapid succession on app mount, causing two near-identical auth round-trips instead of one. |
| **Fix** | Use a single `onAuthStateChange` listener or `getSession()` call, then derive the user from the session object locally without a second network request. |
| **Effort** | 20 min |

### LOW-DB-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/hooks/use-nearby-broadcasts.js` |
| **Issue** | Queries use `.select('*')` which fetches all columns, including internal-only `lat`/`lng`. Only `frozen_lat` and `frozen_lng` are needed for the client. |
| **Fix** | Replace `.select('*')` with an explicit column list that omits sensitive/internal fields. |
| **Effort** | 10 min |

### LOW-DB-004

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/chat/hooks/use-messages.js` |
| **Issue** | The initial messages fetch does not apply `.range()` pagination, potentially loading the full conversation history for long threads. |
| **Fix** | Add `.range(0, PAGE_SIZE - 1)` to the initial query; implement infinite-scroll or load-more for earlier history. |
| **Effort** | 30 min |

### LOW-DB-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/supabase.js` |
| **Issue** | Custom auth storage event listeners can trigger redundant `onAuthStateChange` callbacks when localStorage is updated by another tab, causing cascading re-renders. |
| **Fix** | Debounce or deduplicate storage events by comparing the new token hash against the previous one before firing auth state updates. |
| **Effort** | 20 min |

### LOW-DB-006

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/profile/hooks/use-profile.js` |
| **Issue** | Profile queries fetch an array but immediately unwrap `[0]`; omitting `.single()` prevents early HTTP 406 detection and adds minor client-side overhead. |
| **Fix** | Append `.single()` to profile lookups where exactly one row is expected; handle the resulting error shape uniformly. |
| **Effort** | 10 min |

### LOW-DB-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/notifications/hooks/use-notifications.js` |
| **Issue** | Unread notification count queries fetch full rows instead of using a head-only count query, transferring unnecessary data. |
| **Fix** | Use `.select('*', { count: 'exact', head: true })` for unread counts, or add a lightweight RPC that returns only the integer count. |
| **Effort** | 15 min |

---

## Error Handling (23 issues)

### LOW-ERR-001

| Attribute | Value |
|-----------|-------|
| **File** | `src/components/shared/ErrorBoundary.jsx` |
| **Issue** | `componentDidCatch` does not validate that the caught value is an actual `Error` instance before accessing `.message` and `.stack`, risking crashes on thrown primitives. |
| **Fix** | Normalize the error: `const errorMessage = error instanceof Error ? error.message : String(error);` |
| **Effort** | 10 min |

### LOW-ERR-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/date-grouping.js` |
| **Issue** | Date grouping helpers assume all input timestamps are in the past. Server clock drift or optimistic UI can produce future dates, causing grouping logic to place them in an unnamed bucket. |
| **Fix** | Add an explicit branch for future dates (e.g., "Just now" or "Upcoming") and clamp negative deltas to zero. |
| **Effort** | 15 min |

### LOW-ERR-003

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/broadcast/pages/CreateBroadcastPage.jsx` |
| **Issue** | Form validation trims the title but does not re-check length after trimming, allowing a title consisting solely of whitespace to pass as non-empty. |
| **Fix** | Validate `values.title.trim().length > 0` instead of `values.title.length > 0`. |
| **Effort** | 5 min |

### LOW-ERR-004

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/geocoding.js` |
| **Issue** | Reverse geocoding does not explicitly handle the `0,0` coordinate edge case (Null Island), which can occur from default GPS fallback values. |
| **Fix** | Reject coordinates at exactly `(0, 0)` early and return a descriptive fallback label (e.g., "Unknown location"). |
| **Effort** | 10 min |

### LOW-ERR-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/hooks/use-address-autocomplete.js` |
| **Issue** | The underlying geocoding fetch does not specify an `AbortSignal` timeout, allowing requests to hang indefinitely on flaky networks. |
| **Fix** | Wrap the fetch in an `AbortController` with a 10-second timeout; surface a user-friendly error when aborted. |
| **Effort** | 15 min |

### LOW-ERR-006

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/chat/hooks/use-send-message.js` |
| **Issue** | Optimistic update rollback logic does not account for the edge case where the conversation row was deleted between the optimistic insert and the server error response. |
| **Fix** | During rollback, verify the conversation still exists before attempting to revert message state; if deleted, silently discard the optimistic message. |
| **Effort** | 20 min |

### LOW-ERR-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/utils.js` |
| **Issue** | `formatDistance()` accepts negative distances and returns a nonsensical string (e.g., "-5 miles") instead of clamping to zero or throwing. |
| **Fix** | Clamp negative inputs to `0` and return `"0 miles"` (or localized equivalent), or throw a clear `RangeError` for debug builds. |
| **Effort** | 10 min |

---

## Code Quality (40 issues)

### LOW-QA-001

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/chat/pages/ConversationPage.jsx` |
| **Issue** | Several `console.log` statements for message delivery status and read receipts remain in production code, cluttering the browser console. |
| **Fix** | Remove all `console.log` calls; replace any critical diagnostics with the structured `logger` utility (`src/lib/logger.js`). |
| **Effort** | 10 min |

### LOW-QA-002

| Attribute | Value |
|-----------|-------|
| **File** | `src/index.css` + `public/manifest.json` + `ios/App/App/Info.plist` |
| **Issue** | Background color `#0a0a0f` is hardcoded in multiple config files instead of being sourced from a single design token, risking drift during theme updates. |
| **Fix** | Create a shared `theme.json` (or use `src/lib/constants.js`) and generate all platform-specific config values from it at build time. |
| **Effort** | 30 min |

### LOW-QA-003

| Attribute | Value |
|-----------|-------|
| **File** | `public/manifest.json` |
| **Issue** | Missing recommended fields: `related_applications` and `prefer_related_applications`, which help users discover native app store listings from the PWA install flow. |
| **Fix** | Add `related_applications` pointing to the App Store and Play Store entries; set `prefer_related_applications: false` to keep PWA as default. |
| **Effort** | 10 min |

### LOW-QA-004

| Attribute | Value |
|-----------|-------|
| **File** | `capacitor.config.json` (root) and `ios/App/Podfile` |
| **Issue** | Capacitor iOS configuration does not explicitly set `cordovaSwiftVersion` or a custom `scheme`, which may cause build warnings on Xcode 15+ and prevent deep-link testing in local builds. |
| **Fix** | Pin `cordovaSwiftVersion: '5'` and set a custom `scheme` (e.g., `rideradar`) in `capacitor.config.json`; update `Podfile` if needed. |
| **Effort** | 15 min |

### LOW-QA-005

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/broadcastUtils.js` |
| **Issue** | `isBroadcastExpired()` is defined and exported but is no longer consumed anywhere; `useBroadcastStatus` in `src/features/broadcast/hooks/` supersedes it. |
| **Fix** | Remove the dead `isBroadcastExpired()` function and its unit tests to reduce bundle size and maintenance surface. |
| **Effort** | 10 min |

### LOW-QA-006

| Attribute | Value |
|-----------|-------|
| **File** | `src/lib/conversationUtils.js` |
| **Issue** | Error handling is inconsistent: some branches call `console.error()`, others call `logger.error()`, and a few silently swallow exceptions. |
| **Fix** | Standardize all error logging in the file to use `logger.error()` from `src/lib/logger.js`, ensuring uniform Sentry integration and log levels. |
| **Effort** | 15 min |

### LOW-QA-007

| Attribute | Value |
|-----------|-------|
| **File** | `src/features/admin/hooks/use-admin-stats.js` |
| **Issue** | Unused `useMemo` import and stale JSDoc parameter names (`startDate` renamed to `rangeStart` in signature) create lint noise and documentation drift. |
| **Fix** | Remove unused imports and update JSDoc `@param` tags to match the current function signature. |
| **Effort** | 10 min |

---

## Appendix: Quick Reference — IDs by Category

| ID | Category | File |
|----|----------|------|
| LOW-SEC-001 | Security | `public/index.html` |
| LOW-SEC-002 | Security | `src/lib/constants.js` |
| LOW-SEC-003 | Security | `src/lib/image-utils.js` |
| LOW-SEC-004 | Security | `src/lib/analytics.js` |
| LOW-SEC-005 | Security | `src/lib/auth-redirect.js` |
| LOW-SEC-006 | Security | `src/features/broadcast/components/BroadcastCard.jsx` |
| LOW-SEC-007 | Security | `src/lib/utils.js` |
| LOW-PERF-001 | Performance | `src/features/broadcast/hooks/use-nearby-broadcasts.js` |
| LOW-PERF-002 | Performance | `src/features/chat/hooks/use-conversations.js` |
| LOW-PERF-003 | Performance | `src/App.jsx` |
| LOW-PERF-004 | Performance | `src/components/shared/OptimizedImage.jsx` |
| LOW-PERF-005 | Performance | `src/features/broadcast/components/BroadcastFeed.jsx` |
| LOW-PERF-006 | Performance | `src/hooks/use-profile-batch.js` |
| LOW-PERF-007 | Performance | `src/lib/query-client.js` |
| LOW-PWA-001 | PWA / Mobile | `public/manifest.json` |
| LOW-PWA-002 | PWA / Mobile | `src/hooks/use-online-status.js` |
| LOW-PWA-003 | PWA / Mobile | `src/lib/registerSW.js` |
| LOW-PWA-004 | PWA / Mobile | `ios/App/App/Info.plist` |
| LOW-PWA-005 | PWA / Mobile | `public/manifest.json` |
| LOW-PWA-006 | PWA / Mobile | `vite.config.js` |
| LOW-PWA-007 | PWA / Mobile | `src/lib/registerSW.js` |
| LOW-UI-001 | UI / UX | `src/features/safety/components/SafetyActions.jsx` |
| LOW-UI-002 | UI / UX | `src/components/layout/BottomNav.jsx` |
| LOW-UI-003 | UI / UX | `src/features/broadcast/components/RideCard.jsx` |
| LOW-UI-004 | UI / UX | `src/components/shared/EmptyState.jsx` |
| LOW-UI-005 | UI / UX | `src/features/chat/components/MessageBubble.jsx` |
| LOW-DB-001 | Supabase / Database | `src/features/broadcast/hooks/use-official-events.js` |
| LOW-DB-002 | Supabase / Database | `src/features/auth/hooks/use-auth.js` |
| LOW-DB-003 | Supabase / Database | `src/features/broadcast/hooks/use-nearby-broadcasts.js` |
| LOW-DB-004 | Supabase / Database | `src/features/chat/hooks/use-messages.js` |
| LOW-DB-005 | Supabase / Database | `src/lib/supabase.js` |
| LOW-DB-006 | Supabase / Database | `src/features/profile/hooks/use-profile.js` |
| LOW-DB-007 | Supabase / Database | `src/features/notifications/hooks/use-notifications.js` |
| LOW-ERR-001 | Error Handling | `src/components/shared/ErrorBoundary.jsx` |
| LOW-ERR-002 | Error Handling | `src/lib/date-grouping.js` |
| LOW-ERR-003 | Error Handling | `src/features/broadcast/pages/CreateBroadcastPage.jsx` |
| LOW-ERR-004 | Error Handling | `src/lib/geocoding.js` |
| LOW-ERR-005 | Error Handling | `src/hooks/use-address-autocomplete.js` |
| LOW-ERR-006 | Error Handling | `src/features/chat/hooks/use-send-message.js` |
| LOW-ERR-007 | Error Handling | `src/lib/utils.js` |
| LOW-QA-001 | Code Quality | `src/features/chat/pages/ConversationPage.jsx` |
| LOW-QA-002 | Code Quality | `src/index.css` + `public/manifest.json` + `ios/App/App/Info.plist` |
| LOW-QA-003 | Code Quality | `public/manifest.json` |
| LOW-QA-004 | Code Quality | `capacitor.config.json` (root) and `ios/App/Podfile` |
| LOW-QA-005 | Code Quality | `src/lib/broadcastUtils.js` |
| LOW-QA-006 | Code Quality | `src/lib/conversationUtils.js` |
| LOW-QA-007 | Code Quality | `src/features/admin/hooks/use-admin-stats.js` |
