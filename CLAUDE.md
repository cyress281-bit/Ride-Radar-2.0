# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Startup Checklist

Before doing anything else each session:
1. Read this file fully
2. Ask the user what they want to work on
3. Do not assume the current app state — verify before acting

> There is no standing "current task." Recent work lives in `git log`. This file holds only evergreen guidance + still-open obligations (see **Deferred Follow-Ups**).

### Current state (updated 2026-06-10)
Recent sessions delivered a **UI-simplification pass** (plain-black profile background, notification/comms box fills stripped but borders kept, headers decluttered — app logo + profile avatar removed, settings gear moved into the profile header, DM page app-header removed) and a **chat feature push**: profile likes + "who liked you"/crew sheets, rider search (header icon), unread-glow fix, "You:" preview prefix, **read receipts** (reciprocal toggle), and **typing indicator** (realtime broadcast). Detailed history is in `git log`.

**Open items (verify on device + owner decisions):**
- Verify read-receipt toggle works both directions, and DM-page keyboard behavior, on the iPhone PWA.
- **Profile image resize** — waiting on Supabase Pro (Deferred Follow-Ups #1).
- **Message reactions** — net-new, not started.
- Two owner decisions pending: Comms page still has a faint bottom glow + grid (only the top fade was removed); emergency-notification red tint was kept for safety urgency.
- **Signal history tab** was considered and rejected by owner — do not re-propose.

---

## Working Model

Claude works directly with the owner. The owner is the final decision maker; all AI input is a recommendation. Challenge wrong or risky ideas with reasoning rather than agreeing to be agreeable. Minimum viable changes only — no scope creep. Claude commits and pushes only when the owner explicitly approves (see Development Rules).

---

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

_Approved by owner 2026-05-31._

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
- MapLibre GL JS + react-map-gl v8 (maps) — fully migrated, Leaflet completely removed
- PWA with service worker caching
- Capacitor 8 (iOS/Android native shells)
- Deployed on Vercel

**AI Development Tools:**
- Supabase MCP Server (direct database access for Claude Code) — see `SUPABASE_MCP_SETUP.md`

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
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run lint         # Lint (targets src/, excludes src/lib/ and src/components/ui/)
npm run lint:fix     # Auto-fix lint issues
npm run typecheck    # Type check (JSDoc types from jsconfig.json)
npm preview          # Preview production build
npm run test         # Run tests
```

---

## Environment Setup

Create `.env` file with Supabase credentials (see `.env.example`):
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

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
    admin/ auth/ broadcast/ chat/ connections/ legal/
    map/ notifications/ profile/ safety/ settings/
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
- `user_settings` - Privacy preferences (`analytics_enabled`, `read_receipts_enabled`, notification category toggles)
- `event_rsvps` - RSVP records for event broadcasts (`interested`, `going`, `maybe`, `not_going`)
- `profile_likes` - Profile likes (`liker_id`, `liked_user_id`) — unique constraint, no self-likes, RLS: anyone can read, only liker can insert/delete. INSERT trigger creates a `profile_like` notification.
- `conversation_notifications` - Per-user `read_at` per conversation (drives unread + read receipts)

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

- **RLS silent failures:** A DELETE blocked by an RLS USING clause returns `{ error: null, data: [] }` — no error, 0 rows affected. Always use `.select()` on deletes and check `data.length` to distinguish a successful delete from a silently blocked one. ⚠️ But adding `.select()` requires the row to be readable under that table's RLS SELECT policy — if the SELECT policy hides the post-mutation state, `.select()` returns 0 rows *on success*, turning a working mutation into a false failure. Verify the table's SELECT policy before adding read-back checks.
- **Upsert read-back:** After `upsert(...)`, adding `.select().single()` may fail (PGRST116) if the RLS SELECT policy doesn't allow reading the row back. Only read back data when the SELECT policy permits it.
- **Active Supabase project ID:** `iygtbcserdmvhhjicyyp`
- **Migration history is diverged from live** (see Known Issues). ALWAYS verify a live DB object via Supabase MCP (`pg_get_functiondef` / `get_advisors`) before applying any DB change — local migration files can describe a *stale* version of a live object. A `CREATE OR REPLACE` against a stale signature creates a divergent overload, not a replacement.

### Realtime, Chat & Cache — Key Behaviors (hard-won)
- **`postgres_changes` channel names MUST be per-instance.** A static channel name (`friendships-${userId}`) collides when the same hook mounts twice (e.g. `useFriendships` is in the always-mounted header *and* CrewTab) → `cannot add postgres_changes callbacks ... after subscribe()`. Add a `useId()` suffix: `` `friendships-${userId}-${instanceId}` ``. Hooks already fixed: `useFriendships`, `useProfileLike`, `usePostComments`, `useBroadcastComments` (others already had it). **Exception — broadcast channels are the opposite:** typing indicator uses a *shared* name `` `typing:${conversationId}` `` (no instance suffix) so both riders are on the same channel. Broadcast = ephemeral pub/sub, no DB writes, no RLS (payload carries no message content; conversation id is an unguessable UUID).
- **Read receipts are reciprocal & RLS-gated.** `conversation_notifications` SELECT: own row always; another participant's `read_at` only when BOTH riders have `read_receipts_enabled = true`. The client hook (`useConversationReadState`) gets `null` when receipts are off either side → no "Read" shown. Realtime respects the same RLS, so disabled receipts simply never deliver the event.
- **Shared query keys MUST share the same fetcher/shape.** `useUnreadMessageCount` (bottom-nav badge) and `useConversations` (chats page) both use `['conversations', userId]`. A reduced-column query in one *clobbered* the cache the other read → `participant_ids` dropped → chat avatars vanished. Always reuse the same API fn (`getConversations`) when sharing a cache key.
- **Unread = `last_message_at > read_at` is wrong for your own sends.** Sending bumps `last_message_at` past your own `read_at` → false unread glow. Gate on the latest message's sender: skip unread when `last_message.from_user_id === currentUserId` (in both `ConversationsPage.unreadMap` and `useUnreadMessageCount`).
- **Eager-loaded modules must NOT import hook modules.** `query-client.js` and `use-app-resume-refresh.js` are loaded at boot; importing a lazy hook module's key-factory pulls it into the boot chunk and causes a TDZ when the lazy page chunk re-evaluates it. Inline the key shapes (e.g. `['notifications']`) instead of importing `notificationKeys`.

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
- Map tiles: CacheFirst (14d) · Supabase Storage images: CacheFirst (30d) · Fonts: CacheFirst (1yr) · Supabase REST GET: NetworkFirst (4h) · Static assets: Precached by Workbox

**iOS Safari known behavior:** Safari checks for SW updates at most once every 24 hours, regardless of HTTP headers. A `?v=velocity` static string cannot force updates — it must change between builds.

### Cold-start loading continuity (one shared brand visual)

The cold-start chain must look like **one continuous screen** — the logo never disappears between paints. Sequence: iOS launch → `#rr-prepaint` (`index.html`) → `PageLoader` splash → route/map chunk loads → real screen. To avoid the splash fading out into a *different*-looking loader (the original "glitch"):

- **All boot-path full-screen Suspense fallbacks render `<PageLoader />`** (its non-intro resting state): the top-level boot Suspense (`App.jsx`, wraps `<Routes>`), the `AdminLayout` heavy-route-group wrapper, and the map's inner Suspense in `BroadcastFeedPage.jsx` (`LiveMapMapLibre` is `lazy()`). The splash overlay (`AppBootLoader` → `PageLoader`) then fades to reveal an *identical* frame underneath = zero visual change. `LoginPage` already uses `PageLoader` internally.
- **DO NOT** change `AppLayout.jsx`'s `<Outlet>` Suspense (the `RouteTransitionFallback` pill) — that is the **mid-session tab-switch** loader and must stay lightweight. Swapping the full-screen logo in there flashes the giant logo on every tab change. `RouteTransitionFallback` is still defined/used there; only its *boot* usages were replaced.
- **One background color across the whole chain:** `manifest.json` `background_color`, `index.html` (`#rr-prepaint` + html), `PageLoader`, and `--background` (`hsl(240 20% 2%)`) all resolve to **`#040406`**. Keep them equal or the first paint flashes. (Fixed 2026-06-01; manifest was `#050508`.)

### iOS Safari Known Quirks

**Input auto-zoom (font-size must be ≥16px):** iOS Safari zooms the page when focusing a form control whose *computed* `font-size < 16px` (the viewport meta allows scaling), which shifts the layout and can push adjacent fixed-width controls off-screen. `index.css` sets `input,textarea,select { font-size: 16px }` — but that's an **element** selector, so any Tailwind `text-sm`/`text-xs` **class** on an input wins (higher specificity) and re-triggers the zoom. Keep inputs at `text-base` (16px+); the shadcn `Input`/`Textarea` already are. (Bit the comment + chat search inputs, `90a60b2`.)

**datetime-local input overflow fix:** `input[type="datetime-local"]` overflows its container on iOS regardless of `width:100%`, `max-width:100%`, or `overflow-hidden` on the parent. The ONLY fix that works is wrapping the input in a flex container with `min-width:0`, and setting `flex:1 min-width:0` on the input itself:
```jsx
<div style={{ display: 'flex', minWidth: 0, width: '100%' }}>
  <Input type="datetime-local" style={{ flex: 1, minWidth: 0 }} />
</div>
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

## Linting Configuration
ESLint runs on `src/components/**`, `src/features/**`, `src/hooks/**`, `src/providers/**`, `src/utils/**`, `src/App.jsx`, and `src/main.jsx` (excludes `src/lib/` and `src/components/ui/`). Rules: no unused imports (auto-removed via `eslint-plugin-unused-imports`), React hooks rules, no prop-types required (uses JSDoc for types). **`react/jsx-no-undef` and `no-undef` are enabled** (added 2026-06-01) so a missing import — undefined JSX element *or* undefined function call like `cn(...)` — fails `npm run lint` instead of crashing on device. A test-file override (`**/*.test.*`, `**/*.spec.*`) declares Vitest globals (`vi`, `describe`, `it`, `expect`, …) so `no-undef` doesn't false-positive on them. ⚠️ Neither the Vite build nor the prior lint config caught undefined references in plain JS — `no-undef` is the only guard, so keep it on. **`no-use-before-define` (`variables: true`, `functions: false`) is also enabled** (2026-06-09) — catches the TDZ class where a `const`/`useMemo`/`useEffect` references a `const` declared later in the same scope (this crashed the notifications + rider-search pages on device but passed build/lint before the rule). Function hoisting and module-level components used by earlier components are intentionally allowed.

## Path Aliases
`@/` maps to `src/` (configured in `vite.config.js` and `jsconfig.json`):
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

**Privacy:** No PII collected, users can opt out via Settings, GDPR compliant. Analytics only runs in production with proper environment variables configured.

---

## Tailwind Theme
Custom broadcast type colors defined in `tailwind.config.js` (safelisted to ensure they're included in the build):
- `bg-alert` - Red for safety alerts
- `bg-solo` - Blue for solo rides
- `bg-iso` - Purple for "in search of" posts
- `bg-event` - Green for events

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
        .from('my_table').select('*').eq('some_field', params);
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
      (payload) => { queryClient.invalidateQueries({ queryKey: ['my-data'] }); }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

---

## Current Known Issues

| Issue | Status | Notes |
|---|---|---|
| Supabase migration history diverged | 🚨 Active | ~40 remote-only migrations not in local repo. `db push` fails. Manual SQL application required. Local migration files can describe a *stale* version of a live object (e.g. `get_live_map_presence` is 4-arg + hardened on live but 0-arg in local migrations). ALWAYS verify the live object via Supabase MCP before applying any DB change. |
| Sentry fetch failures | 🚨 Active | POST to ingest endpoint failing — likely rate-limited or CORS. Not user-facing. |
| requestAnimationFrame jank | ⚠️ Partial fix | Map marker listener churn fixed (commit `039c39b` — unstable callback deps removed from `MapLibreBroadcastMarkerLayer` and `MapLibrePresenceMarkerLayer`). Remaining 199ms frame time needs device profiling to confirm improvement and find other sources. |
| PWA iOS SW update delay | Investigated, no fix | iOS Safari 24hr SW update throttle + static `?v=velocity` string. |

---

## Deferred Follow-Ups (owner-gated, to do later)

None blocking.

### 1. Slow loading of EXISTING profile images — DO VIA SUPABASE PRO after upgrade
Bike photo + shots images are served as **full-resolution public URLs** (stored ≤1600px, rendered in ~150px tiles) with **no resize**. Org is on the **FREE plan**, so render transforms (`?width=`) are unavailable. **Decision made:** owner is upgrading to **Supabase Pro** (~$25/mo), then the fix is a one-helper change to use `getPublicUrl(path, { transform: { width } })` sized per render context (avatar/tile ~150–300px, detail ~1080px) — works on **all** existing + new images, no backfill, no third-party. **Trigger: do this once Pro is active.** (Note: the *upload* "file too large" issue was separate and already fixed — `25f679a` raised caps so phone photos aren't rejected pre-downscale.)

### 2. Native-build-only polish (Capacitor iOS/Android — not possible in the PWA)
Items that **cannot** be done from the web/PWA and are deferred to the native Capacitor shell:
- **Remove the iOS keyboard accessory bar** (the up/down-arrow + "Done" form-assistant toolbar above the keyboard). It's OS chrome (WKWebView/UIKit), not in the DOM — no web API hides it. Native fix: override the web view's `inputAccessoryView` to `nil` (or a Capacitor keyboard plugin/config). Requested 2026-06-02 for the comment composer; PWA can't do it.
- **"Open Settings" button** for the location gate's denied state (and any future "go enable a permission" flow). iOS PWA can't deep-link to Settings; native can via `UIApplication.openSettingsURLString`. (See Radar location-gate work.)
- General permission-state APIs (proper geolocation permission query) are more reliable in native than the PWA's visualViewport/error-based inference.

### 3. New features queued (net-new scope, not yet started)
- **Message reactions** — react to messages with emoji
(Rider search shipped via the header search overlay; signal history tab was rejected by owner.)

## Dead Ends — Approaches Already Tried That Did NOT Work

**Purpose:** Read this before proposing fixes. Do not re-suggest anything listed here unless you have a specific, concrete reason it would now behave differently — and if so, state that reason explicitly. Append to it whenever something is ruled out.

**Format:** `Problem → what was tried → why it failed → what actually worked (if known)`

- **iOS datetime-local input overflow** → tried `width:100%`, `max-width:100%`, and `overflow-hidden` on the parent → none constrained the input on iOS Safari → WORKED: flex wrapper with `min-width:0` plus `flex:1; min-width:0` on the input (see iOS Safari Quirks).
- **Forcing iOS PWA service worker updates** → tried the static `?v=velocity` query string → iOS Safari throttles SW update checks to ~once/24h and ignores the static string → the version string must change *between builds* to have any effect.
- **iOS PWA drag gestures via Pointer Events alone** → `pointerdown`/`pointermove` → `touchmove` often never fires on iOS because Safari treats it as a scroll gesture inside fixed/absolute containers → WORKED: raw `touchstart`/`touchmove`/`touchend` listeners as a fallback + `touch-action:none` on the drag handle.
- **iOS PWA bottom-sheet scrolling** → `overflow-hidden` on page root and on the open sheet container → a `fixed` + `overflow-hidden` ancestor blocks all descendant scrolling on iOS; parent `overflow-hidden` kills the child's scroll context → WORKED: remove those, give the sheet content an explicit `height` (not just `max-height`), `touch-action:pan-y`.
- **DM page "Conversation not found" — RLS suspected** → checked SELECT policies on `messages`/`conversations`/`conversation_notifications`, verified `public.messages` schema → all correct, RLS is not the cause → actual cause is auth timing race: TQ v5 disabled queries have `isLoading=false`, so the page shows error state while `user=null` during auth validation → WORKED: include `authIsLoading` in the `isLoading` guard (commit `d6823ce`).
- **PostCreateSheet "Add Shot" black screen on iOS** → a full-screen overlay with `backdrop-blur-xl` + translucent `bg-background/95` + `animate-fade-up` (`fill-mode: both`) can fail to composite its CHILDREN on iOS (opaque backdrop paints, content stays invisible); conditional mount did NOT fix it → WORKED: solid opaque overlay, drop `backdrop-blur` + `animate-fade-up` (`544998b`). (This sheet was later portaled to `document.body` — see the transformed-ancestor entry below.)
- **Profile shot detail force-scrolls to comments on open** → opening a shot jumped the sheet to the bottom (photo + header pushed off-screen) → cause: `PostComments` passed `autoScroll` to the shared `CommentThread`, whose `scrollIntoView` fires on mount → WORKED: remove `autoScroll` for the post-detail use (`544998b`).
- **Profile tabs overflow their pill border vertically** → custom `profileTabsTriggerClass` used `py-2.5` (~52px) but the base `TabsList` hard-codes `h-11` (44px), clipping the triggers → WORKED: add `h-auto` to the tabs list class so it grows to fit the triggers (`544998b`).
- **Other users' profiles / page-level "Something went wrong"** → RLS and ID-mismatch ruled out (profiles public, all API calls 200, IDs are real `user_id`s) → real cause: `RiderProfilePage` used `<LoadingState/>` without importing it → `ReferenceError` in the loading branch, caught by the route `ErrorBoundary` (own profile uses a *different* component that imports it); reached prod because lint lacked `no-undef`/`jsx-no-undef` and Vite ignores undefined JSX in plain JS → WORKED: add the import; **enabled `react/jsx-no-undef` + `no-undef` in `eslint.config.js`** (also caught a missing `cn` import in `NotificationsPage`) (2026-06-01). **Lesson: a page-level "Something went wrong" that isn't a data/RLS error is often a one-line `ReferenceError` — grab the device console first.**
- **Can't delete own "shots" (no trash button)** → not RLS (live `user_posts_delete` = `(user_id = auth.uid()) OR is_admin()` allows it) → real cause: delete was gated on a `canDelete` prop only `ProfilePage` passed; `RiderProfilePage` (renders your own profile via `/profile/:id`) omitted it → WORKED: gate on ownership *inside* the shared component (`isOwner = userId === post?.user_id`); also made the trash icon always `text-destructive` (was invisible muted-gray-until-hover on touch) (2026-06-01). **Lesson: gate destructive affordances on actual ownership computed inside the shared component, not a prop passed by some-but-not-all parents — backed by RLS as defense-in-depth.**
- **Profile sheets force-scroll / top cut off on open** → NOT the old `autoScroll` cause → real cause: the `position: fixed` sheets sit inside the profile root whose `animate-fade-up` (`fill-mode: both`, ends at `translateY(0)`) leaves a persistent `transform`, so `fixed` resolves against that ancestor, not the viewport → WORKED: `createPortal(sheet, document.body)` to escape it (`dec2879`). Portaling then exposed a missing top inset (header under the iOS status bar in `black-translucent` mode) → added `calc(0.75rem + env(safe-area-inset-top, 0px))` to the sheet headers (`4874b81`). **Lesson: a persistent ancestor `transform` (incl. `animate-*` with `fill-mode: both` ending at `translateY(0)`) breaks `position: fixed` descendants — portal full-screen sheets to `document.body`.**
