# HIGH Severity Findings — RideRadar 2.0 Audit

> **Total Findings:** 50  
> **Severities in this file:** HIGH only  
> **Audit Date:** 2026-05-30

---

## Summary Table

| ID | Category | File | Issue Summary | Fix Summary | Effort |
|:---|:---------|:-----|:--------------|:------------|:-------|
| H-001 | Security | `src/App.jsx:84-108` | ProtectedRoute only checks `!!user`; no server-side session validation. Stale/expired sessions can briefly grant access. | Add a session validation gate that calls `supabase.auth.getUser()` before rendering protected routes. | Medium |
| H-002 | Security | `src/features/auth/pages/LoginPage.jsx:54-70` | `handleUpdatePassword()` calls `updatePassword()` without verifying the session is a valid recovery session. | Verify `supabase.auth.getSession()` returns a recovery-type session before allowing password update. | Small |
| H-003 | Security | `src/features/auth/api/auth-api.js:146-152` | `linkOAuthProvider` accepts `redirectTo` from callers without URL validation, allowing open redirects after OAuth. | Validate `redirectTo` against an allowlist of trusted paths. | Small |
| H-004 | Security | `src/features/auth/components/LoginForm.jsx:92-148` | Unlimited login attempts, password reset requests, and OAuth initiations; enables brute-force and email-bombing. | Implement client-side rate limiting with exponential backoff; server-side rate limiting required too. | Medium |
| H-005 | Security | `index.html:<head>` | No CSP meta tag or HTTP header. App is unprotected against script injection and data exfiltration. | Add `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ..." />`. | Small |
| H-006 | Security | `index.html:<head>` | No `frame-ancestors` or `X-Frame-Options`. PWA could be iframe-embedded for clickjacking/UI redressing. | Add `frame-ancestors 'none'` to CSP or `<meta http-equiv="X-Frame-Options" content="DENY" />`. | Small |
| H-007 | Security | `src/lib/image-utils.js:247` | User-controlled image URLs rendered directly in `<img src>` without protocol checks. `isRemoteImageUrl()` allows `data:` and `blob:` protocols. | Validate image URLs against an origin allowlist (Supabase + own domain only). | Small |
| H-008 | Security | `src/App.jsx:134-169` | `OnboardingGuard` returns children (full `AppLayout` with header, nav, outlet) while `isLoading` is true, exposing authenticated UI during cold boot. | Return a loading spinner or `null` instead of the full layout during auth state loading. | Small |
| H-009 | Security / Supabase | `supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql` | RPC accepts `exclude_user_ids` from the client; malicious client can pass an empty array to see blocked users' broadcasts. | Look up blocked users server-side using `auth.uid()` inside the RPC. | Medium |
| H-010 | Security / Supabase | Various | `uploads` and `message-images` buckets have no RLS policies. Private message images may be publicly accessible with the URL. | Add storage bucket RLS policies tied to `auth.uid()` and conversation membership. | Medium |
| H-011 | Performance | `src/hooks/use-app-resume-refresh.js:55-60` | Invalidates 19 query groups simultaneously on every foreground resume, creating a burst of parallel network requests. | Stagger invalidations with small delays or use a single root query key. | Small |
| H-012 | Performance | `src/features/chat/hooks/use-messages.js:23` | `['messages', conversationId, user?.id]` causes all conversation messages to be discarded and re-fetched on every auth token refresh. | Remove `user?.id` from the query key; messages are scoped to conversation only. | Small |
| H-013 | Performance | `src/features/map/hooks/use-live-map.js:110-137` | Creates an inline `useQuery` for settings instead of reusing the shared `useSettings` hook. Multiple map instances = multiple identical Supabase requests. | Import and use the shared `useSettings` hook. | Small |
| H-014 | Performance / Supabase | `src/features/broadcast/api/broadcast-api.js:72` | `canViewActiveBikeDownDetail` fetches up to 100 nearby broadcasts via RPC just to check if a single broadcast ID is visible. | Create a dedicated RPC that checks visibility for a single broadcast ID. | Medium |
| H-015 | Performance | `RadarOverlay.jsx:562`, `ConversationPage.jsx:436-439`, `LiveMapMapLibre.jsx:951-955` | Multiple inline callbacks and objects passed as props, causing unnecessary child re-renders. | Wrap callbacks in `useCallback` and objects in `useMemo`. | Small |
| H-016 | Performance | `src/features/map/components/LiveMapMapLibre.jsx:448,875,879` | `userLat`/`userLng` invalidate `onMarkerClick` callback, causing full marker layer rebuild every 1-5 seconds. | Use refs for GPS coordinates inside callbacks to stabilize dependencies. | Medium |
| H-017 | Performance | `src/index.css:1-2` | `@import url()` for Google Fonts blocks CSSOM rendering. | Use `<link rel="preload">` in `index.html` instead. | Small |
| H-018 | Performance | `src/lib/sentry.js:1` | `import * as Sentry` pulls ~40-70KB into the bundle. | Use named imports for only the needed Sentry functions. | Small |
| H-019 | PWA | `vite.config.js:84-176` | No `StaleWhileRevalidate` used anywhere; only `CacheFirst`/`NetworkFirst`. Users see loading states for cached content. | Add `StaleWhileRevalidate` for API responses and HTML navigation. | Small |
| H-020 | PWA | `registerSW.js:22-33`, `vite.config.js:85` | `skipWaiting: true` + auto-reload can lose user form data mid-session. | Show update notification prompt instead of auto-reload; only reload after user confirmation. | Medium |
| H-021 | PWA | `index.html` | Has `mobile-web-app-capable` (standardized) but missing `apple-mobile-web-app-capable`. iOS Safari <15.4 may not enter standalone mode. | Add `<meta name="apple-mobile-web-app-capable" content="yes" />`. | Small |
| H-022 | PWA | `index.html` | No iOS startup images declared. iOS PWAs launched from home screen show a white flash. | Add `<link rel="apple-touch-startup-image">` tags for common iPhone resolutions. | Small |
| H-023 | PWA | `public/manifest.json` | RideRadar cannot receive shared content from other apps; won't appear in Android system share sheet. | Add `"share_target"` with action `/broadcast` and params for `title`, `text`, `url`. | Small |
| H-024 | PWA / Mobile | `src/components/layout/BottomSheet.jsx:154` | `env(keyboard-inset-height, 0px)` is not a real CSS environment variable — always falls back to `0px`. Bottom sheet content hidden behind iOS virtual keyboard. | Use `useViewportContext()` to read actual `keyboardHeight`. | Small |
| H-025 | PWA / Mobile | `src/features/profile/components/PostCreateSheet.jsx` | Full-screen overlay has no integration with app's viewport/keyboard detection. Caption textarea and Share button can be hidden behind iOS keyboard. | Consume `useViewportContext` and apply keyboard height as bottom padding. | Small |
| H-026 | PWA / Mobile | `src/hooks/use-body-scroll-lock.js` | Only sets `overflow: hidden` on `body`. iOS Safari needs it on `html` too to prevent elastic scroll behind modals. | Also set `document.documentElement.style.overflow = 'hidden'`. | Small |
| H-027 | UI/UX | `src/components/layout/AppHeader.jsx:253-318` | Admin, Notifications, and Profile buttons use `min-w-[40px] min-h-[40px]` — 4px below the 44×44px minimum touch target. | Change all three to `min-w-[44px] min-h-[44px]`. | Small |
| H-028 | UI/UX | `src/features/broadcast/components/RadarOverlay.jsx:425-445` | Draggable pad handle is only `h-6` (24px) — far below 44px minimum for a primary drag target. | Increase to `h-11` (44px) or add invisible hit-slop. | Small |
| H-029 | UI/UX / Accessibility | `src/components/shared/LocationDisclosureDialog.jsx:53-116` | Modal lacks `role="dialog"`, `aria-modal="true"`, focus trap, Escape-to-dismiss, and background `aria-hidden`. Keyboard users can tab out of the modal. | Add full modal ARIA pattern with focus trap and Escape handling. | Medium |
| H-030 | UI/UX / Accessibility | `src/features/broadcast/components/LocationPickerMap.jsx:63-105` | Map pin placement is mouse-only (click/drag). No keyboard alternative. Screen reader users cannot complete location selection. | Add keyboard arrow key controls for pin movement and `aria-label` on map container. | Medium |
| H-031 | UI/UX / Accessibility | `src/features/auth/components/LoginForm.jsx:215-256` | Custom tablist missing `aria-controls`, roving `tabIndex`, and `role="tabpanel"` on panels. | Implement complete ARIA tab pattern. | Medium |
| H-032 | Supabase / Performance | `src/features/profile/api/posts-api.js:22-39` | `getUserPosts` has no `.limit()` and fetches nested photos unbounded. Risk of memory exhaustion for users with many posts. | Add `.limit(50)` with pagination. | Small |
| H-033 | Supabase | `src/features/connections/api/connections-api.js:238-244` | Uses `.select('*')` with no `.limit()`. Unbounded results for popular users. | Add `.limit(100)` with pagination/cursor. | Small |
| H-034 | Supabase | `src/features/admin/api/admin-api.js:898-901` | Fetches up to 10,000 user IDs in a single query for broadcast announcements. | Use batch processing or a server-side function for large announcements. | Medium |
| H-035 | Supabase / Security | `supabase/migrations/*` | `deleteMessage()` will fail for all non-admin users due to missing DELETE policy. | Add appropriate DELETE policy for message authors and conversation participants. | Small |
| H-036 | Performance | `src/features/profile/hooks/use-profile.js:50-51` | Only invalidates the profile key, but `display_name`/`avatar_url` are embedded in conversations, live map, and notifications caches. | Invalidate all dependent query keys after profile update. | Medium |
| H-037 | Performance | `src/features/map/hooks/use-live-map.js:159-160,177` | `refetchInterval` polls even when tab is hidden or offline, wasting battery/data. | Check `document.visibilityState` and `navigator.onLine` before polling. | Small |
| H-038 | UI/UX / Accessibility | `src/features/profile/components/ProfileEditForm.jsx:321-336` | Username availability status ("Checking...", "Taken", "Available") not wrapped in `aria-live` — screen readers don't announce it. | Add `aria-live="polite"` to the status element. | Small |
| H-039 | UI/UX / Accessibility | `src/features/auth/components/LoginForm.jsx:302` | Password visibility toggle has `tabIndex={-1}` — keyboard users can't access it. | Remove `tabIndex={-1}` or provide an alternative keyboard-accessible control. | Small |
| H-040 | PWA | `src/hooks/use-pull-to-refresh.js:52-58` | `onRefresh` fires unconditionally offline with no guard, causing confusing loading states. | Check `navigator.onLine` before triggering refresh callback. | Small |
| H-041 | Supabase | `src/features/broadcast/api/broadcast-api.js:223-229` | `getEventRsvps` has no `.limit()`, potentially returning thousands of rows. | Add `.limit(100)` with pagination. | Small |
| H-042 | Performance | `src/features/notifications/hooks/use-notifications.js:218-229` | Cancels and updates ALL notification queries globally instead of targeting the current user's list. | Scope invalidation to `['notifications', userId]`. | Small |
| H-043 | Code Quality | Referenced from 6 files | Component `AvatarWithStatus.jsx` doesn't exist but is imported from `ConversationPage`, `ConversationItem`, `RequestsTab`, `RiderSearch`, `CrewTab`, `SettingsPage`. Will cause build/runtime failures. | Create the file or update all imports to use `Avatar` directly. | Medium |
| H-044 | Code Quality | `use-live-map.js:42` + `use-radar-location.js:15` | Identical haversine implementation in two files. | Extract to `src/lib/geo.js`. | Small |
| H-045 | Code Quality | `use-create-broadcast.js`, `admin-api.js`, `EditEventDialog.jsx`, `BroadcastForm.jsx` | Same `normalizeLocationText()` function copied in 4 files. | Extract to `src/lib/utils.js`. | Small |
| H-046 | Error Handling | `broadcast-api.js`, `chat-api.js`, `profile-api.js` | Same files mix `throw` with `return { data, error }` patterns inconsistently. | Standardize on `return { data, error }` throughout. | Medium |
| H-047 | Error Handling | `geocoding.js`, `image-utils.js` | External API calls (Nominatim geocoding, Supabase Storage) fail permanently on transient errors with no retry. | Add exponential backoff retry for transient failures. | Medium |
| H-048 | UI/UX | `BroadcastForm`, `PostCreateSheet` | Forms silently close on success without confirming to users their action worked. | Add success toast notifications after form submission. | Small |
| H-049 | Code Quality | `src/hooks/use-profile-batch.js:55-75` | `profilesRef.current = map` mutated in render phase. | Use state or `useEffect` for the Map initialization. | Small |
| H-050 | Supabase / Security | `src/features/chat/hooks/use-conversations.js:55-63` | Realtime conversation INSERT handler doesn't verify sender isn't blocked before adding to list. | Check blocked user IDs before processing INSERT events. | Small |

---

## Detailed Findings

---

### H-001: Client-Side Only Route Guards — Stale Session Access

- **Category:** Security
- **File:** `src/App.jsx:84-108`
- **Severity:** HIGH

#### Issue
`ProtectedRoute` only checks `!!user`. There is no server-side session validation before rendering protected content. Stale or expired sessions can briefly grant access because the local auth state (from `useAuthState`) may lag behind the actual server-side session validity.

#### Fix
Add a session validation gate that calls `supabase.auth.getUser()` before rendering protected routes. Render a loading state while validation is in progress, and redirect to `/login` if the server rejects the session.

#### Effort
Medium

---

### H-002: Password Recovery Without Session Verification

- **Category:** Security
- **File:** `src/features/auth/pages/LoginPage.jsx:54-70`
- **Severity:** HIGH

#### Issue
`handleUpdatePassword()` calls `supabase.auth.updatePassword()` without first verifying that the current session is a valid recovery session. If a user lands on the password update flow with a regular session (or no session), the update may fail or apply to the wrong context.

#### Fix
Verify `supabase.auth.getSession()` returns a recovery-type session before allowing the password update. Show an error or redirect if the session type is not `recovery`.

#### Effort
Small

---

### H-003: Open Redirect in linkOAuthProvider

- **Category:** Security
- **File:** `src/features/auth/api/auth-api.js:146-152`
- **Severity:** HIGH

#### Issue
`linkOAuthProvider` accepts `redirectTo` from callers without URL validation. An attacker could pass an attacker-controlled URL, causing the user to be redirected to a malicious site after OAuth identity linking.

#### Fix
Validate `redirectTo` against an allowlist of trusted paths (e.g., exact app paths or same-origin URLs). Reject or default to `/settings` if the URL does not match the allowlist.

#### Effort
Small

---

### H-004: No Rate Limiting on Auth Endpoints

- **Category:** Security
- **File:** `src/features/auth/components/LoginForm.jsx:92-148`
- **Severity:** HIGH

#### Issue
Unlimited login attempts, password reset requests, and OAuth initiations are possible. This enables brute-force attacks against user passwords and email-bombing via the password reset flow.

#### Fix
Implement client-side rate limiting with exponential backoff (e.g., lock the form for 30 seconds after 5 failed attempts). Server-side rate limiting (via Supabase or edge functions) is also required for defense in depth.

#### Effort
Medium

---

### H-005: Missing Content Security Policy (CSP)

- **Category:** Security
- **File:** `index.html:<head>`
- **Severity:** HIGH

#### Issue
There is no CSP meta tag or HTTP header. The app is unprotected against cross-site script injection (XSS), data exfiltration via `connect-src`, and object injection attacks.

#### Fix
Add a strict CSP meta tag to `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob: data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" />
```

#### Effort
Small

---

### H-006: Missing X-Frame-Options / Clickjacking Protection

- **Category:** Security
- **File:** `index.html:<head>`
- **Severity:** HIGH

#### Issue
No `frame-ancestors` directive in CSP and no `X-Frame-Options` meta tag. The PWA could be embedded in an attacker-controlled iframe for UI redressing (clickjacking) attacks.

#### Fix
Add `frame-ancestors 'none'` to the CSP (see H-005), or add:
```html
<meta http-equiv="X-Frame-Options" content="DENY" />
```

#### Effort
Small

---

### H-007: User-Controlled Image URLs Without Origin Validation

- **Category:** Security
- **File:** `src/lib/image-utils.js:247`
- **Severity:** HIGH

#### Issue
`avatar_url`, `event_image_url`, and `image_url` are rendered directly in `<img src>` without protocol or origin checks. The helper `isRemoteImageUrl()` allows `data:` and `blob:` protocols, which can be exploited for XSS or content spoofing.

#### Fix
Validate image URLs against an origin allowlist (e.g., `https://your-project-id.supabase.co`, `https://rideradar.app`, and local blob URLs only). Reject `data:` and untrusted origins before rendering.

#### Effort
Small

---

### H-008: Onboarding Guard Leaks Layout During Loading

- **Category:** Security
- **File:** `src/App.jsx:134-169`
- **Severity:** HIGH

#### Issue
`OnboardingGuard` returns `children` (the full `AppLayout` with header, bottom navigation, and `<Outlet />`) while `isLoading` is `true`. During a cold boot, an unauthenticated or partially authenticated user may briefly see protected UI.

#### Fix
Return a loading spinner, skeleton screen, or `null` instead of the full layout while the auth state is still loading.

#### Effort
Small

---

### H-009: getNearbyBroadcasts Trusts Client for Block List

- **Category:** Security / Supabase
- **File:** `supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql`
- **Severity:** HIGH

#### Issue
The RPC accepts `exclude_user_ids` from the client. A malicious client can pass an empty array to bypass blocking and see broadcasts from users they have blocked (or who have blocked them).

#### Fix
Look up blocked users server-side using `auth.uid()` inside the RPC. Remove the `exclude_user_ids` parameter from the client-facing signature or ignore it in favor of a server-side query against the `user_blocks` table.

#### Effort
Medium

---

### H-010: Storage Buckets Without RLS Policies

- **Category:** Security / Supabase
- **File:** Various
- **Severity:** HIGH

#### Issue
The `uploads` and `message-images` storage buckets have no RLS policies defined in migrations. Private message images may be publicly accessible to anyone who obtains the URL.

#### Fix
Add storage bucket RLS policies tied to `auth.uid()` and conversation membership. For example:
- Allow read on `message-images` only if the requesting user is a participant in the conversation the image belongs to.
- Allow write only for the message author.

#### Effort
Medium

---

### H-011: App Resume Thundering Herd

- **Category:** Performance
- **File:** `src/hooks/use-app-resume-refresh.js:55-60`
- **Severity:** HIGH

#### Issue
On every app foreground resume, the hook invalidates 19 separate query groups simultaneously. This creates a thundering herd of parallel network requests, spiking CPU and data usage.

#### Fix
Stagger invalidations with small delays (e.g., 50–200ms apart) or consolidate related queries under a single root query key so one invalidation triggers a coordinated refetch.

#### Effort
Small

---

### H-012: Message Query Key Includes user.id — Self-Inflicted Cache Invalidation

- **Category:** Performance
- **File:** `src/features/chat/hooks/use-messages.js:23`
- **Severity:** HIGH

#### Issue
The query key is `['messages', conversationId, user?.id]`. Because `user.id` can change or be re-evaluated on every auth token refresh, the entire messages cache is discarded and re-fetched unnecessarily.

#### Fix
Remove `user?.id` from the query key. Messages are already scoped to the conversation ID, which is sufficient for cache identity.

#### Effort
Small

---

### H-013: Duplicate Settings Query in Live Map

- **Category:** Performance
- **File:** `src/features/map/hooks/use-live-map.js:110-137`
- **Severity:** HIGH

#### Issue
The hook creates an inline `useQuery` for settings instead of reusing the shared `useSettings` hook. Every `LiveMap` instance makes an identical Supabase request, causing redundant network traffic.

#### Fix
Import and use the shared `useSettings` hook (or a similar shared query) so that all consumers share the same cached data.

#### Effort
Small

---

### H-014: N+1 Broadcast Query for Bike Down Check

- **Category:** Performance / Supabase
- **File:** `src/features/broadcast/api/broadcast-api.js:72`
- **Severity:** HIGH

#### Issue
`canViewActiveBikeDownDetail` fetches up to 100 nearby broadcasts via the `get_nearby_broadcasts` RPC just to check if a single broadcast ID is visible to the current user.

#### Fix
Create a dedicated lightweight RPC (e.g., `can_view_broadcast(broadcast_id UUID)`) that checks visibility for a single broadcast ID without returning a large result set.

#### Effort
Medium

---

### H-015: Inline Objects/Functions Causing Re-renders

- **Category:** Performance
- **Files:** `RadarOverlay.jsx:562`, `ConversationPage.jsx:436-439`, `LiveMapMapLibre.jsx:951-955`
- **Severity:** HIGH

#### Issue
Multiple inline callbacks and objects are passed as props on every render. This causes unnecessary child re-renders even when no meaningful state has changed.

#### Fix
Wrap callbacks in `useCallback` and inline objects/arrays in `useMemo` before passing them to child components.

#### Effort
Small

---

### H-016: Marker Layer Rebuilt on GPS Updates

- **Category:** Performance
- **File:** `src/features/map/components/LiveMapMapLibre.jsx:448,875,879`
- **Severity:** HIGH

#### Issue
`userLat` and `userLng` are included in the `onMarkerClick` callback dependency array. Because GPS coordinates update every 1–5 seconds, the callback reference changes constantly, triggering a full marker layer rebuild.

#### Fix
Use refs (`useRef`) to store the latest GPS coordinates inside the callback so the callback reference remains stable and does not trigger layer rebuilds.

#### Effort
Medium

---

### H-017: Render-Blocking Google Fonts @import

- **Category:** Performance
- **File:** `src/index.css:1-2`
- **Severity:** HIGH

#### Issue
`@import url()` for Google Fonts is render-blocking. The browser must fetch the CSS file before it can continue constructing the CSSOM, delaying First Contentful Paint.

#### Fix
Remove the `@import` from `index.css` and load Google Fonts via `<link rel="preconnect">` and `<link rel="preload" as="style">` tags in `index.html`, followed by the standard stylesheet link.

#### Effort
Small

---

### H-018: Full Sentry Namespace Import

- **Category:** Performance
- **File:** `src/lib/sentry.js:1`
- **Severity:** HIGH

#### Issue
`import * as Sentry from '@sentry/react'` pulls the entire Sentry namespace into the bundle, adding approximately 40–70KB of JavaScript.

#### Fix
Use named imports for only the needed Sentry functions (e.g., `init`, `captureException`, `withProfiler`).

#### Effort
Small

---

### H-019: No Stale-While-Revalidate Strategy

- **Category:** PWA
- **File:** `vite.config.js:84-176`
- **Severity:** HIGH

#### Issue
The service worker configuration uses only `CacheFirst` and `NetworkFirst` strategies. There is no `StaleWhileRevalidate` anywhere, meaning users see loading states for previously cached content when the network is slow.

#### Fix
Add `StaleWhileRevalidate` for API GET responses and HTML navigation requests so users immediately see cached content while the cache is refreshed in the background.

#### Effort
Small

---

### H-020: SW Update Auto-Reload Can Lose User Data

- **Category:** PWA
- **File:** `registerSW.js:22-33`, `vite.config.js:85`
- **Severity:** HIGH

#### Issue
`skipWaiting: true` combined with auto-reload behavior can force a page reload mid-session. If the user is in the middle of writing a broadcast or filling out a form, all data is lost.

#### Fix
Show an update notification prompt (e.g., a toast or banner) when a new service worker is available. Only reload the page after the user explicitly confirms.

#### Effort
Medium

---

### H-021: Missing apple-mobile-web-app-capable Meta Tag

- **Category:** PWA
- **File:** `index.html`
- **Severity:** HIGH

#### Issue
The app includes the standardized `mobile-web-app-capable` meta tag but is missing the Apple-specific `apple-mobile-web-app-capable` meta tag. iOS Safari versions before 15.4 may not enter standalone mode when launched from the home screen.

#### Fix
Add:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
```

#### Effort
Small

---

### H-022: Missing Apple Touch Startup Image

- **Category:** PWA
- **File:** `index.html`
- **Severity:** HIGH

#### Issue
No iOS startup images are declared. When an iOS PWA is launched from the home screen, the screen remains white until the first paint, creating a poor user experience.

#### Fix
Add `<link rel="apple-touch-startup-image">` tags for common iPhone resolutions (e.g., 1170×2532 for iPhone 12/13/14, 1290×2796 for iPhone 15 Pro Max) with `media="(device-width: ...)"` queries.

#### Effort
Small

---

### H-023: Missing share_target for Social App

- **Category:** PWA
- **File:** `public/manifest.json`
- **Severity:** HIGH

#### Issue
The manifest does not define a `share_target`. RideRadar cannot receive shared content from other apps and will not appear in the Android system share sheet.

#### Fix
Add a `share_target` entry to `manifest.json`:
```json
"share_target": {
  "action": "/broadcast",
  "method": "GET",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url"
  }
}
```

#### Effort
Small

---

### H-024: Non-Standard CSS env(keyboard-inset-height)

- **Category:** PWA / Mobile
- **File:** `src/components/layout/BottomSheet.jsx:154`
- **Severity:** HIGH

#### Issue
`env(keyboard-inset-height, 0px)` is not a real CSS environment variable. It always falls back to `0px`, so the bottom sheet content can be hidden behind the iOS virtual keyboard.

#### Fix
Use `useViewportContext()` to read the actual `keyboardHeight` and apply it as inline style or a CSS variable.

#### Effort
Small

---

### H-025: No Keyboard Avoidance in PostCreateSheet

- **Category:** PWA / Mobile
- **File:** `src/features/profile/components/PostCreateSheet.jsx`
- **Severity:** HIGH

#### Issue
The full-screen overlay has no integration with the app's viewport/keyboard detection. The caption textarea and Share button can be completely hidden behind the iOS virtual keyboard.

#### Fix
Consume `useViewportContext` and apply the detected keyboard height as bottom padding or margin to the sheet content.

#### Effort
Small

---

### H-026: Missing html Overflow Lock for iOS

- **Category:** PWA / Mobile
- **File:** `src/hooks/use-body-scroll-lock.js`
- **Severity:** HIGH

#### Issue
The hook only sets `overflow: hidden` on `document.body`. iOS Safari also requires `overflow: hidden` on the `<html>` element to prevent elastic overscroll behind modals and bottom sheets.

#### Fix
Also set `document.documentElement.style.overflow = 'hidden'` when the lock is active, and restore it on cleanup.

#### Effort
Small

---

### H-027: Touch Targets Below 44×44px Minimum

- **Category:** UI/UX
- **File:** `src/components/layout/AppHeader.jsx:253-318`
- **Severity:** HIGH

#### Issue
The Admin, Notifications, and Profile header buttons use `min-w-[40px] min-h-[40px]`, which is 4px below the WCAG/Apple HIG minimum touch target size of 44×44px.

#### Fix
Change all three buttons to `min-w-[44px] min-h-[44px]`.

#### Effort
Small

---

### H-028: Draggable Pad Handle Only 24px Tall

- **Category:** UI/UX
- **File:** `src/features/broadcast/components/RadarOverlay.jsx:425-445`
- **Severity:** HIGH

#### Issue
The draggable pad handle is only `h-6` (24px tall). This is far below the 44px minimum for a primary touch/drag target, making it difficult for users to grab.

#### Fix
Increase the visible handle height to `h-11` (44px) or add an invisible hit-slop layer around the existing handle.

#### Effort
Small

---

### H-029: Modal Lacks Focus Trap and ARIA

- **Category:** UI/UX / Accessibility
- **File:** `src/components/shared/LocationDisclosureDialog.jsx:53-116`
- **Severity:** HIGH

#### Issue
The modal/dialog lacks `role="dialog"`, `aria-modal="true"`, a focus trap, Escape-to-dismiss behavior, and `aria-hidden` on the background. Keyboard users can tab out of the modal and interact with the page behind it.

#### Fix
Implement a full modal ARIA pattern: trap focus within the dialog, close on `Escape`, set `aria-hidden="true"` on the app root while open, and mark the dialog with `role="dialog"` and `aria-modal="true"`.

#### Effort
Medium

---

### H-030: Map Pin Placement Mouse-Only

- **Category:** UI/UX / Accessibility
- **File:** `src/features/broadcast/components/LocationPickerMap.jsx:63-105`
- **Severity:** HIGH

#### Issue
Map pin placement is controlled only by mouse click/drag. There is no keyboard alternative, so screen reader and keyboard-only users cannot complete location selection.

#### Fix
Add keyboard arrow key controls to nudge the pin position and an `aria-label`/`aria-describedby` on the map container explaining how to use keyboard controls.

#### Effort
Medium

---

### H-031: Custom Tablist Missing ARIA Controls

- **Category:** UI/UX / Accessibility
- **File:** `src/features/auth/components/LoginForm.jsx:215-256`
- **Severity:** HIGH

#### Issue
The custom tablist (e.g., Login / Sign Up tabs) is missing `aria-controls`, roving `tabIndex`, and `role="tabpanel"` on the content panels. Screen readers do not understand the tab relationship.

#### Fix
Implement the complete ARIA tab pattern: each tab has `role="tab"`, `aria-selected`, `aria-controls` pointing to its panel; each panel has `role="tabpanel"` and `aria-labelledby` pointing to its tab; implement roving `tabIndex` for keyboard navigation.

#### Effort
Medium

---

### H-032: getUserPosts No Limit — Memory Risk

- **Category:** Supabase / Performance
- **File:** `src/features/profile/api/posts-api.js:22-39`
- **Severity:** HIGH

#### Issue
`getUserPosts` has no `.limit()` and fetches nested `photos` unbounded. A user with hundreds or thousands of posts could cause the browser to run out of memory or freeze.

#### Fix
Add `.limit(50)` to the query and implement pagination (e.g., cursor-based or offset) for loading more posts.

#### Effort
Small

---

### H-033: getFriendships No Limit

- **Category:** Supabase
- **File:** `src/features/connections/api/connections-api.js:238-244`
- **Severity:** HIGH

#### Issue
`getFriendships` uses `.select('*')` with no `.limit()`. A popular user with many connections could cause an unbounded result set.

#### Fix
Add `.limit(100)` and implement pagination or cursor-based loading for large friend lists.

#### Effort
Small

---

### H-034: sendAnnouncement Fetches Up to 10,000 User IDs

- **Category:** Supabase
- **File:** `src/features/admin/api/admin-api.js:898-901`
- **Severity:** HIGH

#### Issue
The function fetches up to 10,000 user IDs in a single query for broadcast announcements. This creates a massive payload and risks memory exhaustion, query timeouts, and rate limiting.

#### Fix
Use batch processing (e.g., 500 users at a time) or move announcement delivery to a server-side function (edge function or database function) that streams recipients.

#### Effort
Medium

---

### H-035: No DELETE Policy for Messages

- **Category:** Supabase / Security
- **File:** `supabase/migrations/*`
- **Severity:** HIGH

#### Issue
`deleteMessage()` will fail for all non-admin users because there is no DELETE RLS policy on the `messages` table. The delete returns no error but affects 0 rows, making the failure silent and confusing.

#### Fix
Add an appropriate DELETE policy allowing message authors to delete their own messages, and conversation participants to delete messages in conversations they belong to.

#### Effort
Small

---

### H-036: Profile Update Invalidation Too Narrow

- **Category:** Performance
- **File:** `src/features/profile/hooks/use-profile.js:50-51`
- **Severity:** HIGH

#### Issue
After a profile update, only the profile query key is invalidated. However, `display_name` and `avatar_url` are embedded in conversations, live map presence, and notifications caches, leaving stale data visible across the app.

#### Fix
Invalidate all dependent query keys after a profile update (e.g., `['conversations']`, `['live-map-presence']`, `['notifications']`).

#### Effort
Medium

---

### H-037: Presence Polling Without Visibility Check

- **Category:** Performance
- **File:** `src/features/map/hooks/use-live-map.js:159-160,177`
- **Severity:** HIGH

#### Issue
The `refetchInterval` polls the live map presence endpoint even when the tab is hidden or the device is offline, wasting battery and mobile data.

#### Fix
Check `document.visibilityState === 'visible'` and `navigator.onLine` before allowing the polling interval to fire. Pause polling when the tab is hidden or offline.

#### Effort
Small

---

### H-038: Username Availability Not Announced to Screen Readers

- **Category:** UI/UX / Accessibility
- **File:** `src/features/profile/components/ProfileEditForm.jsx:321-336`
- **Severity:** HIGH

#### Issue
The username availability status ("Checking...", "Taken", "Available") is rendered as plain text without `aria-live`. Screen reader users are not notified when the status changes.

#### Fix
Wrap the status element in a container with `aria-live="polite"` and `aria-atomic="true"` so assistive technologies announce status changes.

#### Effort
Small

---

### H-039: Password Visibility Toggle Inaccessible to Keyboard

- **Category:** UI/UX / Accessibility
- **File:** `src/features/auth/components/LoginForm.jsx:302`
- **Severity:** HIGH

#### Issue
The password visibility toggle button has `tabIndex={-1}`, removing it from the keyboard tab order. Keyboard-only users cannot toggle password visibility.

#### Fix
Remove `tabIndex={-1}` from the toggle button, or provide an alternative keyboard-accessible control (e.g., a keyboard shortcut or a focusable icon button).

#### Effort
Small

---

### H-040: Pull-to-Refresh Fires Unconditionally Offline

- **Category:** PWA
- **File:** `src/hooks/use-pull-to-refresh.js:52-58`
- **Severity:** HIGH

#### Issue
`onRefresh` fires unconditionally even when the device is offline. This causes confusing loading states and failed network requests with no user feedback.

#### Fix
Check `navigator.onLine` before triggering the refresh callback. If offline, show an offline message or skip the refresh gesture.

#### Effort
Small

---

### H-041: Missing limit() on Event RSVPs

- **Category:** Supabase
- **File:** `src/features/broadcast/api/broadcast-api.js:223-229`
- **Severity:** HIGH

#### Issue
`getEventRsvps` has no `.limit()`. A popular event could have thousands of RSVPs, causing an unbounded result set and performance degradation.

#### Fix
Add `.limit(100)` and implement pagination for loading additional RSVPs.

#### Effort
Small

---

### H-042: useMarkRead Over-Broad Query Targeting

- **Category:** Performance
- **File:** `src/features/notifications/hooks/use-notifications.js:218-229`
- **Severity:** HIGH

#### Issue
The `useMarkRead` mutation cancels and updates ALL notification queries globally instead of targeting only the current user's notification list. This can interfere with other users' data in multi-account or testing scenarios.

#### Fix
Scope invalidation to the specific user's query key, e.g., `['notifications', userId]`, instead of the broad `['notifications']` key.

#### Effort
Small

---

### H-043: AvatarWithStatus.jsx — Missing File

- **Category:** Code Quality
- **File:** Referenced from 6 files
- **Severity:** HIGH

#### Issue
The `AvatarWithStatus` component does not exist in the repository, but it is imported from `ConversationPage`, `ConversationItem`, `RequestsTab`, `RiderSearch`, `CrewTab`, and `SettingsPage`. This will cause build or runtime failures.

#### Fix
Either create the missing `AvatarWithStatus.jsx` component (wrapping `Avatar` with an online status indicator) or update all six imports to use the existing `Avatar` component directly.

#### Effort
Medium

---

### H-044: Duplicate distanceMeters() Implementation

- **Category:** Code Quality
- **Files:** `use-live-map.js:42` + `use-radar-location.js:15`
- **Severity:** HIGH

#### Issue
An identical haversine distance formula is implemented independently in two separate hooks. This increases maintenance burden and risks divergence if one is updated but not the other.

#### Fix
Extract the `distanceMeters()` function into `src/lib/geo.js` and import it in both hooks.

#### Effort
Small

---

### H-045: Duplicate normalizeLocationText() Function

- **Category:** Code Quality
- **Files:** `use-create-broadcast.js`, `admin-api.js`, `EditEventDialog.jsx`, `BroadcastForm.jsx`
- **Severity:** HIGH

#### Issue
The same `normalizeLocationText()` utility is copied and pasted across four different files. This violates DRY and risks inconsistency.

#### Fix
Extract the function to `src/lib/utils.js` (or a dedicated location utility) and import it in all four locations.

#### Effort
Small

---

### H-046: Inconsistent Error Patterns Across API Files

- **Category:** Error Handling
- **Files:** `broadcast-api.js`, `chat-api.js`, `profile-api.js`
- **Severity:** HIGH

#### Issue
The same API files inconsistently mix `throw error` with `return { data, error }` patterns. This makes error handling unpredictable for consumers and complicates debugging.

#### Fix
Standardize on `return { data, error }` throughout all API modules. Update consumers to check the `error` field instead of catching thrown errors.

#### Effort
Medium

---

### H-047: No Retry Logic for External APIs

- **Category:** Error Handling
- **Files:** `geocoding.js`, `image-utils.js`
- **Severity:** HIGH

#### Issue
External API calls (Nominatim geocoding, Supabase Storage operations) fail permanently on transient network errors with no retry mechanism. A brief network blip breaks the user experience.

#### Fix
Add exponential backoff retry logic for transient failures (e.g., network timeouts, 5xx responses). Use a small library or a simple custom retry wrapper.

#### Effort
Medium

---

### H-048: No Success Toast After Critical Actions

- **Category:** UI/UX
- **Files:** `BroadcastForm`, `PostCreateSheet`
- **Severity:** HIGH

#### Issue
Forms silently close on success without any confirmation. Users may be unsure whether their broadcast or post was actually created.

#### Fix
Add a success toast notification (e.g., "Broadcast created!" or "Post shared!") after successful form submission, before closing the sheet or navigating away.

#### Effort
Small

---

### H-049: useProfileBatch Ref Mutation Anti-Pattern

- **Category:** Code Quality
- **File:** `src/hooks/use-profile-batch.js:55-75`
- **Severity:** HIGH

#### Issue
`profilesRef.current = map` is mutated directly during the render phase. This is a React anti-pattern that can cause stale reads, unexpected re-renders, or concurrent rendering bugs.

#### Fix
Use `useState` or `useEffect` for the Map initialization so the ref is only mutated safely outside of the render phase.

#### Effort
Small

---

### H-050: Conversation INSERT Handler Doesn't Check Blocked Users

- **Category:** Supabase / Security
- **File:** `src/features/chat/hooks/use-conversations.js:55-63`
- **Severity:** HIGH

#### Issue
The realtime conversation INSERT handler adds new conversations to the list without verifying whether the sender is blocked. A blocked user could still appear in the conversation list via realtime events.

#### Fix
Check the blocked user IDs list (from `useBlockedIds` or a similar source) before processing realtime INSERT events. Discard the event if the sender is blocked.

#### Effort
Small

---

*End of HIGH severity findings.*
