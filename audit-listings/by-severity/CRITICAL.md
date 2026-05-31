# CRITICAL Severity Findings — RideRadar 2.0 Audit

> **Total:** 20 findings | **Categories:** Security (5), PWA (4), Performance (4), Error Handling (4), Supabase (4), State Management (2), UI/UX/Accessibility (1), Feature (1), Code Quality (1)

---

## Summary Table

| ID | Category | File | Issue Summary | Fix Summary | Effort |
|---|---|---|---|---|---|
| C-001 | Security | `src/lib/supabase.js:29-53` | JWT tokens stored in localStorage — vulnerable to XSS token theft | Implement httpOnly cookie-based session storage or Secure/SameSite=Strict cookie fallback | Medium |
| C-002 | Security | `src/lib/supabase.js:2` | Missing `capacitor-storage.js` module causes runtime auth crash on native builds | Create the missing module or provide a fallback to standard storage | Small |
| C-003 | Security / Supabase | `supabase/migrations/*` | Multiple tables referenced in code have no CREATE TABLE or RLS policies | Add CREATE TABLE + ENABLE RLS + CRUD policies for all unprotected tables | Medium |
| C-004 | Security / Supabase | `src/features/admin/api/admin-api.js:183-189` | All admin functions rely on client-side `assertAdmin()` only — trivially bypassed | Move all admin operations to SECURITY DEFINER RPCs with server-side `is_admin()` check | Large |
| C-005 | Security / Supabase | `supabase/migrations/20260512_live_map_presence_server_time.sql:44` | SECURITY DEFINER function lacks `SET search_path` and STABLE marking | Add `SET search_path = public, pg_temp` and mark as STABLE | Small |
| C-006 | PWA | `vite.config.js:174` | `navigateFallback: null` — no offline page for deep links | Create `public/offline.html` and set `navigateFallback: '/offline.html'` | Small |
| C-007 | PWA / Security | `use-create-broadcast.js`, `use-messages.js` | Zero Background Sync — critical safety alerts lost permanently when offline | Implement Background Sync API + IndexedDB mutation queue for all critical mutations | Large |
| C-008 | Performance | `src/features/auth/hooks/use-auth.js:65-236` | Auth profile managed via raw `useState` instead of `useQuery` — no caching/deduplication | Convert profile management to `useQuery` with proper query keys | Medium |
| C-009 | Performance | `src/providers/ViewportProvider.jsx:58-64` | Context value object created inline without `useMemo` — cascades re-renders | Wrap the context value in `useMemo` | Small |
| C-010 | PWA / Mobile | `src/features/profile/components/PostDetailSheet.jsx:25` | `useBodyScrollLock(true)` runs before null guard — trap when post is loading | Change to `useBodyScrollLock(!!post)` | Small |
| C-011 | Performance | `src/features/broadcast/pages/BroadcastDetailPage.jsx:915,1024,454` | Raw `<img>` tags bypass `OptimizedImage` causing CLS and unoptimized loading | Replace all `<img>` tags with `OptimizedImage`/`OptimizedAvatar` components | Small |
| C-012 | Error Handling | `src/features/broadcast/api/broadcast-api.js:131` | `hardDeleteBroadcast` throws instead of returning error — breaks contract | Return `{ data: null, error }` instead of `throw error` | Small |
| C-013 | Error Handling / State Management | `src/features/auth/hooks/use-auth.js:372-386` | Sign-out clears local state before API succeeds — no rollback on failure | Only clear state after `signOut()` resolves; implement rollback on failure | Small |
| C-014 | Error Handling | `src/features/broadcast/hooks/use-create-broadcast.js:179` | `Promise.all` for photo uploads has no error handling — leaves orphaned files | Add try/catch + cleanup for individual upload failures | Small |
| C-015 | Feature / Error Handling | `src/features/auth/pages/OnboardingPage.jsx` | Avatar/bike photo uploads have no file type or size pre-validation | Add file type whitelist and size limit validation before processing | Small |
| C-016 | UI/UX / Accessibility | `src/index.css` | All animations ignore `prefers-reduced-motion` — no protection for motion-sensitive users | Wrap all animations in `@media (prefers-reduced-motion: no-preference)` | Small |
| C-017 | Supabase / Performance | `src/features/admin/api/admin-api.js:164-180` | `getEventRsvpCounts` fetches all rows client-side instead of DB aggregation | Use `.select('id', { count: 'exact', head: true })` or a count RPC | Small |
| C-018 | PWA | `public/` directory | Manifest references icon files but `public/` contains zero image files | Generate and add all required PWA icon files | Small |
| C-019 | Performance / Code Quality | `src/features/map/components/LiveMapMapLibre.jsx:238` | `<Link>` used but never imported — runtime crash when executed | Import `Link` from `react-router-dom` or use `useNavigate` | Small |
| C-020 | State Management / Supabase | `src/features/notifications/hooks/use-notifications.js:63` | Shared realtime channel closes over stale settings — filters bypassed | Recreate channel when settings change, or read settings from a ref inside handler | Small |

---

## Detailed Findings

### C-001: JWT Tokens Stored in localStorage — XSS Token Theft

**Category:** Security  
**File:** `src/lib/supabase.js:29-53`  
**Effort:** Medium

#### Issue
The custom `authStorage` adapter persists Supabase access and refresh tokens in `localStorage`. Any XSS vulnerability (e.g., via a compromised dependency, unsanitized user content, or injected script) can exfiltrate tokens via `localStorage.getItem()` and impersonate the user indefinitely. There is no httpOnly cookie fallback, meaning tokens are fully exposed to JavaScript execution context.

#### Impact
- Complete session hijacking via any XSS vector
- Refresh token can be used to maintain indefinite access even after the user changes their password
- Violates OWASP recommendations for token storage

#### Fix
- **Preferred:** Implement httpOnly cookie-based session storage with a backend proxy (e.g., Next.js API routes, Supabase Auth Helpers, or a thin Edge Function) so tokens are never exposed to JavaScript.
- **Short-term:** If staying with client-side storage, at minimum store the refresh token in a `Secure`, `SameSite=Strict` cookie and use PKCE flow for new sessions. Consider migrating to the `@supabase/ssr` package if adding server-side rendering.

---

### C-002: Missing capacitor-storage.js Module — Auth Crash

**Category:** Security  
**File:** `src/lib/supabase.js:2`  
**Effort:** Small

#### Issue
`capacitor-storage.js` is imported at the top of `src/lib/supabase.js` and passed as the `storage` option to the Supabase client constructor. The file does not exist in the repository. On native builds (iOS/Android via Capacitor), this will cause a runtime module resolution failure, breaking all session persistence and likely crashing the app on launch.

#### Impact
- Native builds crash or fail to initialize authentication
- Users cannot sign in or maintain sessions on mobile apps

#### Fix
Create the missing `src/lib/capacitor-storage.js` module using Capacitor's Preferences API, or provide a runtime fallback to standard `localStorage` when Capacitor is unavailable:

```javascript
// src/lib/capacitor-storage.js
import { Preferences } from '@capacitor/preferences';

export const capacitorStorage = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};
```

Alternatively, detect Capacitor availability and fall back to a standard in-memory or localStorage adapter to avoid hard crashes.

---

### C-003: Tables Without RLS — Data Exposure

**Category:** Security / Supabase  
**Files:** `supabase/migrations/*`, code references  
**Effort:** Medium

#### Issue
The following tables are referenced in application code, triggers, or other migrations but have no `CREATE TABLE` statement or `ENABLE ROW LEVEL SECURITY` in any migration:
- `user_posts`
- `user_post_photos`
- `post_comments`
- `broadcast_comments`
- `official_event_requests`

These tables are completely unprotected. Any client with the anon key can read, insert, update, or delete all rows.

#### Impact
- Full data exposure of user-generated content
- Unauthorized deletion or modification of posts, comments, and event requests
- Potential for data poisoning and abuse

#### Fix
For each missing table:
1. Add a migration with `CREATE TABLE ...`
2. Immediately follow with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
3. Define `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies that enforce ownership or appropriate access rules (e.g., `auth.uid() = user_id`, public read for approved content, etc.)
4. Audit all existing triggers and foreign key references to ensure they still function correctly after the tables are formally created.

---

### C-004: Admin API Client-Side Only — Privilege Escalation

**Category:** Security / Supabase  
**File:** `src/features/admin/api/admin-api.js:183-189`  
**Effort:** Large

#### Issue
All 15+ admin functions in `admin-api.js` call `assertAdmin()` client-side in JavaScript only. A malicious actor can obtain the Supabase anon key (it is embedded in the client bundle) and call Supabase REST endpoints directly, completely bypassing `assertAdmin()`. A single RLS policy misconfiguration on any admin-relevant table would fully expose admin data.

#### Impact
- Complete privilege escalation: any user can perform admin operations
- Data exfiltration, user impersonation, and unauthorized deletions possible
- Client-side checks provide zero security guarantees

#### Fix
Move **all** admin operations to `SECURITY DEFINER` RPC functions in Supabase that internally check `is_admin()` on the server side. The client should only call these RPCs. Example:

```sql
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY SELECT * FROM users;
END;
$$;
```

Then in the client:
```javascript
const { data, error } = await supabase.rpc('admin_get_users');
```

This ensures the privilege check runs server-side where it cannot be bypassed.

---

### C-005: get_live_map_presence() Security Definer Without search_path

**Category:** Security / Supabase  
**File:** `supabase/migrations/20260512_live_map_presence_server_time.sql:44`  
**Effort:** Small

#### Issue
The `get_live_map_presence()` function is defined as `SECURITY DEFINER` but lacks `SET search_path`. This makes it vulnerable to **search_path hijacking** — a user can create a malicious table in their own schema and trick the function into using it. Additionally, the function lacks the `STABLE` volatility marking, which prevents the query planner from optimizing repeated calls.

#### Impact
- Potential for privilege escalation via search_path hijacking
- Suboptimal query planning due to missing volatility hint

#### Fix
Update the function definition:

```sql
CREATE OR REPLACE FUNCTION get_live_map_presence()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  -- existing logic
END;
$$;
```

Always include `SET search_path = public, pg_temp` on `SECURITY DEFINER` functions to prevent schema injection attacks.

---

### C-006: No Offline Fallback Page — Deep Links Fail Offline

**Category:** PWA  
**File:** `vite.config.js:174`  
**Effort:** Small

#### Issue
The Workbox PWA configuration sets `navigateFallback: null`, meaning there is no offline HTML page. When users hit a deep link (e.g., `/broadcast/123`) while offline, the service worker has no content to serve and the browser displays a generic "No internet" error page instead of the app shell.

#### Impact
- Deep links are completely broken offline
- Poor user experience; users cannot view previously loaded content or see a branded offline state
- Violates PWA best practices for installable apps

#### Fix
1. Create `public/offline.html` with a branded offline message, cached content hints, and a retry button
2. Update `vite.config.js`:

```javascript
workbox: {
  navigateFallback: '/offline.html',
  // ... existing config
}
```

3. Ensure `offline.html` is added to the precache manifest so it is always available.

---

### C-007: No Background Sync — Bike Down Alerts Lost Offline

**Category:** PWA / Security  
**Files:** `use-create-broadcast.js`, `use-messages.js`  
**Effort:** Large

#### Issue
There is zero implementation of the Background Sync API or an IndexedDB mutation queue. If a rider sends a "Bike Down" emergency alert while offline, the mutation is discarded and the critical safety alert is permanently lost. This is a safety-critical gap for a motorcycle safety application.

#### Impact
- Emergency safety alerts lost with no recovery
- Messages and broadcasts silently fail when offline
- Users may assume help is on the way when the request was never sent

#### Fix
Implement a robust offline mutation queue:

1. **IndexedDB Queue:** Use a library like `idb` or `localForage` to queue mutations (broadcasts, messages, reports) while offline
2. **Background Sync API:** Register sync tags in the service worker:
   ```javascript
   // In SW
   self.addEventListener('sync', (event) => {
     if (event.tag === 'send-critical-alerts') {
       event.waitUntil(flushMutationQueue());
     }
   });
   ```
3. **UI Feedback:** Show pending state indicators and retry controls in the UI
4. **Priority Handling:** Mark `alert` type broadcasts as high priority and attempt immediate sync when connectivity returns

---

### C-008: Auth Provider Bypasses TanStack Query

**Category:** Performance  
**File:** `src/features/auth/hooks/use-auth.js:65-236`  
**Effort:** Medium

#### Issue
The auth provider manages the user profile via raw `useState` + manual Supabase calls instead of `useQuery`. This means:
- No caching: every subscriber fetches independently
- No deduplication: concurrent requests for the same profile are not coalesced
- No stale-time management: profiles are re-fetched on every mount
- `useProfile` hooks elsewhere must independently fetch the same data

#### Impact
- Excessive Supabase API calls for profile data
- Race conditions between independent fetches
- Inconsistent profile state across components

#### Fix
Refactor profile management to use TanStack Query:

```javascript
export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

Update the auth provider to use this hook and remove manual state management for profiles.

---

### C-009: ViewportProvider Context Value Inline — Cascading Re-renders

**Category:** Performance  
**File:** `src/providers/ViewportProvider.jsx:58-64`  
**Effort:** Small

#### Issue
The context value object is created inline on every render without `useMemo`:

```javascript
return (
  <ViewportContext.Provider value={{ width, height, isMobile, isKeyboardOpen }}>
    {children}
  </ViewportContext.Provider>
);
```

Every viewport change (resize, keyboard open/close, orientation change) creates a new object reference, causing **all subscribers** across the entire app to re-render — even if they only read a stable subset of values.

#### Impact
- Widespread, unnecessary re-renders on common mobile interactions
- Degraded performance, especially on lower-end devices
- Battery drain from excessive React reconciliation

#### Fix
Wrap the context value in `useMemo` with the correct dependency array:

```javascript
const value = useMemo(
  () => ({ width, height, isMobile, isKeyboardOpen }),
  [width, height, isMobile, isKeyboardOpen]
);

return (
  <ViewportContext.Provider value={value}>
    {children}
  </ViewportContext.Provider>
);
```

---

### C-010: Scroll Lock Trap in PostDetailSheet

**Category:** PWA / Mobile  
**File:** `src/features/profile/components/PostDetailSheet.jsx:25`  
**Effort:** Small

#### Issue
`useBodyScrollLock(true)` is called unconditionally at the top of the component, before the `if (!post) return null;` guard. If the component mounts before `post` data loads, body scroll is locked. When `post` is null, the component returns `null` without ever running the cleanup effect, leaving the body scroll permanently locked.

#### Impact
- Users are trapped with scroll locked on the underlying page
- No recovery mechanism; requires a full page refresh
- Common on slow networks or when navigating directly to a post detail URL

#### Fix
Change the hook call to only enable when `post` is truthy:

```javascript
useBodyScrollLock(!!post);
```

This ensures the scroll lock only activates when the sheet has actual content to display, and the effect cleanup fires correctly when `post` becomes null or the component unmounts.

---

### C-011: Broadcast Detail Page Uses Raw `<img>` Tags

**Category:** Performance  
**File:** `src/features/broadcast/pages/BroadcastDetailPage.jsx:915,1024,454`  
**Effort:** Small

#### Issue
The broadcast detail page uses raw `<img>` tags for the hero image and user avatars. These bypass the `OptimizedImage` component, which provides lazy loading, placeholder blur, size constraints, and CLS-prevention sizing. This causes Cumulative Layout Shift (CLS) and unoptimized image loading, especially on mobile networks.

#### Impact
- Poor Core Web Vitals (CLS) scores
- Images load without lazy-loading, wasting bandwidth
- No error boundaries or fallback handling for broken image URLs

#### Fix
Replace all raw `<img>` tags with the existing `OptimizedImage` or `OptimizedAvatar` components:

```jsx
// Before
<img src={broadcast.hero_image_url} alt="Broadcast" className="w-full h-64 object-cover" />

// After
<OptimizedImage
  src={broadcast.hero_image_url}
  alt="Broadcast"
  className="w-full h-64 object-cover"
  placeholder="blur"
/>
```

Audit the entire file for raw `<img>` usage and replace consistently.

---

### C-012: hardDeleteBroadcast Throws Instead of Returning Error

**Category:** Error Handling  
**File:** `src/features/broadcast/api/broadcast-api.js:131`  
**Effort:** Small

#### Issue
`hardDeleteBroadcast` throws the error object directly instead of returning it as part of the module's `{ data, error }` contract:

```javascript
if (error) throw error; // Breaks the contract
```

Callers expect an object return and may not wrap the call in try/catch, leading to uncaught promise rejections.

#### Impact
- Uncaught promise rejections in production
- Inconsistent API surface across broadcast module functions
- Error boundaries may catch the thrown error, but callers lose the ability to handle it gracefully

#### Fix
Return the error as part of the contract:

```javascript
if (error) {
  return { data: null, error };
}
```

Ensure all functions in the module follow the same `{ data, error }` return pattern.

---

### C-013: Sign-Out Clears State Before API Call — No Rollback

**Category:** Error Handling / State Management  
**File:** `src/features/auth/hooks/use-auth.js:372-386`  
**Effort:** Small

#### Issue
The sign-out logic clears all local state (user, profile, tokens) **before** the `supabase.auth.signOut()` API call resolves. If the network request fails (e.g., flaky connection, Supabase outage), the user sees a signed-out UI but is still authenticated server-side. There is no rollback mechanism to restore the previous state.

#### Impact
- Inconsistent auth state between client and server
- User confusion: signed-out UI but still authenticated on refresh
- Potential for data loss if the user attempts to re-authenticate

#### Fix
Only clear state after `signOut()` resolves successfully. Implement a rollback on failure:

```javascript
const signOut = async () => {
  const previousUser = user;
  const previousProfile = profile;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Clear state ONLY after success
    setUser(null);
    setProfile(null);
    queryClient.clear();
  } catch (error) {
    // Rollback
    setUser(previousUser);
    setProfile(previousProfile);
    throw error;
  }
};
```

---

### C-014: Promise.all Photo Uploads Have No Error Handling

**Category:** Error Handling  
**File:** `src/features/broadcast/hooks/use-create-broadcast.js:179`  
**Effort:** Small

#### Issue
Alert photo uploads use `Promise.all` without individual error handling. If one upload fails, the other uploads may have already succeeded, leaving orphaned files in Supabase Storage. The failed upload's error may also be swallowed by the `Promise.all` rejection.

#### Impact
- Orphaned files in Supabase Storage (wasted space, cleanup debt)
- Partial data consistency: broadcast record created but not all photos attached
- Users may not know which photos failed to upload

#### Fix
Use `Promise.allSettled` with per-upload cleanup:

```javascript
const results = await Promise.allSettled(
  photos.map(async (photo, index) => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(`alerts/${broadcastId}/${index}`, photo.file);
      if (error) throw error;
      return data.path;
    } catch (error) {
      // Log and continue; cleanup handled after loop
      console.error(`Upload failed for photo ${index}:`, error);
      throw error;
    }
  })
);

// Clean up any successful uploads if the overall operation fails
const successful = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
const failed = results.filter(r => r.status === 'rejected');

if (failed.length > 0) {
  // Optionally delete successful uploads to maintain atomicity
  await Promise.all(successful.map(path =>
    supabase.storage.from('uploads').remove([path])
  ));
  throw new Error(`${failed.length} photo upload(s) failed`);
}
```

---

### C-015: File Upload No Type/Size Pre-validation (Onboarding)

**Category:** Feature / Error Handling  
**File:** `src/features/auth/pages/OnboardingPage.jsx`  
**Effort:** Small

#### Issue
Avatar and bike photo file input handlers call `prepareLocalImage()` without any pre-validation of file type or size. Users can attempt to upload executables, massive video files, or other unsupported formats, only failing deep in the processing pipeline with poor error messages.

#### Impact
- Poor user experience with late-stage, cryptic error messages
- Wasted bandwidth and processing on invalid files
- Potential security risk if malicious files are processed by image libraries

#### Fix
Add validation before calling `prepareLocalImage()`:

```javascript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File too large. Max size: ${MAX_SIZE_MB}MB` };
  }
  return { valid: true };
};

const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const validation = validateFile(file);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }
  prepareLocalImage(file);
};
```

Apply the same validation to bike photo handlers.

---

### C-016: Missing prefers-reduced-motion Support

**Category:** UI/UX / Accessibility  
**File:** `src/index.css`  
**Effort:** Small

#### Issue
All animations in the design system (neon focus pulse, radar sweep, EKG pulse, glow pulse, etc.) run unconditionally regardless of user preference. Users with vestibular disorders, motion sensitivity, or those who have enabled reduced motion in their OS settings receive no protection.

#### Impact
- Accessibility violation (WCAG 2.1 Success Criterion 2.2.2 and 2.3.3)
- Physical discomfort or nausea for motion-sensitive users
- Potential legal/reputational risk for accessibility non-compliance

#### Fix
Wrap all `@keyframes` and animation applications in `@media (prefers-reduced-motion: no-preference)`:

```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes radar-sweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .radar-animation {
    animation: radar-sweep 2s linear infinite;
  }

  /* ... all other animations ... */
}

/* Always provide static fallbacks */
.radar-animation {
  /* Static state when reduced motion is preferred */
}
```

Audit `index.css` for all `animation`, `transition`, and `@keyframes` declarations and wrap them appropriately.

---

### C-017: getEventRsvpCounts Client-Side Count — Data Transfer

**Category:** Supabase / Performance  
**File:** `src/features/admin/api/admin-api.js:164-180`  
**Effort:** Small

#### Issue
`getEventRsvpCounts` fetches **all** RSVP rows for an event and counts them client-side. For large events, this transfers thousands of rows over the wire just to compute a simple count.

#### Impact
- Massive unnecessary data transfer
- Slower page loads for admin dashboards
- Higher Supabase egress costs

#### Fix
Use Supabase's built-in count functionality or a dedicated RPC:

```javascript
// Option 1: Head-only count
const { count, error } = await supabase
  .from('event_rsvps')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .eq('status', status);

// Option 2: Aggregating RPC
const { data, error } = await supabase.rpc('get_event_rsvp_counts', {
  p_event_id: eventId,
});
```

For the RPC approach, create a SQL function that returns counts grouped by status:

```sql
CREATE OR REPLACE FUNCTION get_event_rsvp_counts(p_event_id uuid)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT status, COUNT(*)
  FROM event_rsvps
  WHERE event_id = p_event_id
  GROUP BY status;
$$;
```

---

### C-018: All Icon Files Missing from public/ Directory

**Category:** PWA  
**File:** `public/` directory  
**Effort:** Small

#### Issue
The `manifest.json` references `/icon-192.png`, `/icon-512.png`, `/maskable-icon-512.png`, and other icon files. The `public/` directory contains `manifest.json` but **zero** image files. On Android Chrome, PWA installation is completely blocked because the browser cannot find the required icon assets.

#### Impact
- PWA install prompt never appears on Android
- Broken branding on installed app icons (defaults to screenshot or fails)
- iOS Safari add-to-home-screen uses low-quality fallback

#### Fix
Generate all required icon files from the existing `logo.png` or SVG source:

Required sizes (based on `manifest.json` and PWA standards):
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `maskable-icon-512.png` — 512×512 with safe zone padding
- `apple-touch-icon.png` — 180×180 (already referenced)
- `favicon-32.png` — 32×32

Use a tool like `pwa-asset-generator`, Figma, or ImageMagick to generate these from the existing brand assets. Ensure `maskable-icon-512.png` follows the [maskable icon spec](https://w3c.github.io/manifest/#icon-masks) with sufficient safe zone.

---

### C-019: Link Component Used But Never Imported — Runtime Crash

**Category:** Performance / Code Quality  
**File:** `src/features/map/components/LiveMapMapLibre.jsx:238`  
**Effort:** Small

#### Issue
The JSX at line 238 uses `<Link>` from `react-router-dom`, but `Link` is never imported in the file. When the code path containing `<Link>` executes (e.g., clicking a marker popup), the app crashes with `ReferenceError: Link is not defined`.

#### Impact
- Runtime crash when users interact with map markers
- Broken user flow for discovering broadcasts from the live map
- Sentry noise from unhandled errors

#### Fix
Import `Link` from `react-router-dom`:

```javascript
import { Link } from 'react-router-dom';
```

Or, if navigation is more appropriate, use `useNavigate`:

```javascript
import { useNavigate } from 'react-router-dom';

// Inside component
const navigate = useNavigate();

// In JSX
<button onClick={() => navigate(`/broadcast/${broadcastId}`)}>
  View Broadcast
</button>
```

Verify the fix by running `npm run lint` to catch similar unimported component usage.

---

### C-020: Stale Notification Settings in Shared Realtime Channel

**Category:** State Management / Supabase  
**File:** `src/features/notifications/hooks/use-notifications.js:63`  
**Effort:** Small

#### Issue
The shared realtime channel's INSERT handler closes over the `settings` value from the hook's closure. When `useUnreadCount` mounts first, it may create the channel with `settings = undefined` (before settings have loaded). Because the handler closes over this stale value, all subsequent notifications bypass filters regardless of the user's actual notification preferences.

#### Impact
- Users receive notifications they have explicitly disabled
- Notification filtering is unreliable and race-condition prone
- Duplicate or unwanted notifications degrade user trust

#### Fix
**Option A:** Recreate the channel when settings change:

```javascript
useEffect(() => {
  // cleanup old channel and create new one with fresh settings
}, [settings, userId]);
```

**Option B:** Read settings from a ref inside the handler to always get the latest value without re-subscribing:

```javascript
const settingsRef = useRef(settings);
settingsRef.current = settings;

useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const currentSettings = settingsRef.current;
        if (!currentSettings || currentSettings[payload.new.type]) {
          // handle notification
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [userId]); // settings NOT in dependency array
```

Option B is preferred to avoid churn from frequent channel recreation.
