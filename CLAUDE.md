# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Startup Checklist

Before doing anything else each session:
1. Read this file fully
2. Ask the user what they want to work on
3. Do not assume the current app state — verify before acting

> There is no standing "current task." Recent work lives in `git log`. This file holds only evergreen guidance + still-open obligations (see **Deferred Follow-Ups**).

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
1. **No AI has more leverage than another.** Every recommendation must be justified.
2. **Challenge each other.** Push back with reasoning. Blind agreement wastes the owner's time.
3. **Document disagreements.** If two AIs disagree on the same problem, log both perspectives and let the owner decide.
4. **Kimi executes, never decides.** If Kimi hits an ambiguous situation it stops and flags it rather than guessing.
5. **No AI touches something outside its current task.** Minimum viable changes only. No scope creep.
6. **The owner is always the final decision maker.** All AI input is a recommendation.

### Who Owns What
- **Security decisions** → Claude leads, ChatGPT reviews
- **Feature prioritization** → ChatGPT leads, Claude reviews for technical feasibility
- **Architecture & code patterns** → Claude leads, ChatGPT reviews for product fit
- **UI/UX decisions** → ChatGPT leads, Claude reviews for implementation complexity
- **Database schema changes** → Claude leads (RLS, PostGIS, Supabase behavior)
- **Code execution** → Kimi executes based on plans approved by Claude and/or ChatGPT

### Review Process (before anything goes to Kimi)
1. Owner brings a problem — one AI investigates first and writes findings
2. Owner takes it to the other AI, which runs its own independent investigation WITHOUT reading the first report until done
3. Each AI then reads the other's report and confirms, challenges, or flags a disagreement
4. Owner resolves disagreements
5. Only after both sign off does an **Approved Task for Kimi** get written
6. Kimi executes exactly what is written — no interpretation, no decisions
7. Both reviewers check Kimi's diff before the owner merges/pushes

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

_Approved by owner 2026-05-31. Applies to Claude Code, Codex, and Kimi equally._

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

- **RLS silent failures:** A DELETE blocked by an RLS USING clause returns `{ error: null, data: [] }` — no error, 0 rows affected. Always use `.select()` on deletes and check `data.length` to distinguish a successful delete from a silently blocked one. ⚠️ But adding `.select()` requires the row to be readable under that table's RLS SELECT policy — if the SELECT policy hides the post-mutation state, `.select()` returns 0 rows *on success*, turning a working mutation into a false failure. Verify the table's SELECT policy before adding read-back checks.
- **Upsert read-back:** After `upsert(...)`, adding `.select().single()` may fail (PGRST116) if the RLS SELECT policy doesn't allow reading the row back. Only read back data when the SELECT policy permits it.
- **Active Supabase project ID:** `iygtbcserdmvhhjicyyp`
- **Migration history is diverged from live** (see Known Issues). ALWAYS verify a live DB object via Supabase MCP (`pg_get_functiondef` / `get_advisors`) before applying any DB change — local migration files can describe a *stale* version of a live object. A `CREATE OR REPLACE` against a stale signature creates a divergent overload, not a replacement.

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
ESLint runs on `src/components/**`, `src/features/**`, `src/hooks/**`, `src/providers/**`, `src/utils/**`, `src/App.jsx`, and `src/main.jsx` (excludes `src/lib/` and `src/components/ui/`). Rules: no unused imports (auto-removed via `eslint-plugin-unused-imports`), React hooks rules, no prop-types required (uses JSDoc for types). **`react/jsx-no-undef` and `no-undef` are enabled** (added 2026-06-01) so a missing import — undefined JSX element *or* undefined function call like `cn(...)` — fails `npm run lint` instead of crashing on device. A test-file override (`**/*.test.*`, `**/*.spec.*`) declares Vitest globals (`vi`, `describe`, `it`, `expect`, …) so `no-undef` doesn't false-positive on them. ⚠️ Neither the Vite build nor the prior lint config caught undefined references in plain JS — `no-undef` is the only guard, so keep it on.

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
| requestAnimationFrame jank | 🚨 Active | 199ms frame time on lower-end devices. Needs React profiling. |
| PWA iOS SW update delay | Investigated, no fix | iOS Safari 24hr SW update throttle + static `?v=velocity` string. |

---

## Deferred Follow-Ups (owner-gated, to do later)

None blocking. All need the owner + a real iPhone.

### 1. On-device verification of shipped moderation/safety fixes (free, ~5 min)
The Sweep 2 + admin/cancel RLS-gap fixes (commits `ddd8a14`, `0b6646a`, `9e751aa`, `1ceb29c`) passed build + live-RLS checks but were never tapped through on device. Verify:
- **Admin "remove content"** on *another* user's broadcast AND message → content actually disappears (was a silent no-op before).
- **Cancel a sent connection request** → stays gone after refresh (was a silent no-op before).
- **Bike Down resolve/remove** (Protected Behavior #7) → signal leaves Radar and still shows "Rider found safe"; normal success flow unchanged. Only the *failure* path now shows a toast instead of false success.

### 2. Verify tonight's Profile fixes on device (2026-05-31)
Three profile regressions fixed in `544998b` (after the first attempts `db62c14`/`0ff7979`/`ceb5297` didn't fully land). Confirm on iPhone PWA:
- **Add Shot** (Profile → Shots → "Add Shot") → sheet paints fully, **no black screen**. Root cause was the overlay's `backdrop-blur-xl` + `animate-fade-up` (`fill-mode:both`) failing to composite children on iOS; fix = solid opaque overlay (see Dead Ends). **If still black → next step is a portal to `document.body`** (not yet tried).
- **Open an existing shot** → photo stays at the top; it no longer force-scrolls to the comment composer (removed `autoScroll` in `PostComments.jsx`).
- **Signals/Shots tabs** → labels centered AND fit inside the pill border (added `h-auto` to the tabs list so `py-2.5` triggers aren't clipped by the base `h-11`).

### 3. Slow loading of EXISTING profile images — owner decision needed (not started)
Bike photo + shots images load slowly because they're served as **full-resolution public URLs** (stored up to 1600px, rendered in ~150px tiles) with **no resize**. Confirmed the Supabase org is on the **FREE plan**, so render transforms (`?width=`) are **unavailable**. Tonight's `ceb5297` only lowered *new* post uploads to 1080px + dropped per-tile framer-motion — it does **not** speed up already-uploaded images. To actually fix existing images, owner must choose: **(a)** upgrade to Supabase Pro (enables `getPublicUrl({ transform: { width } })`), or **(b)** generate a thumbnail at upload time (bigger pipeline change; still won't help already-uploaded photos without a backfill). Decision required before any further work.

### 4. Accessibility / touch-target batch — DONE (shipped 2026-05-31), pending device eyeball
The full H-027 / Sweep 9 a11y batch shipped this session and is **code-complete**; just needs an on-device glance for layout. Shipped: AppHeader buttons→44px (`fc1a7d2`, verified); modal close buttons→44px (`724288b`); labels + live-regions (`c566069`); Group C device-gated targets — approx/precise toggle, report trigger, password eye→44px (`17207f5`), alert chips modest bump (`a9e120f`), thumbnail ✕→28px (`3556641`). **Permanently EXCLUDED (Group D — Protected Behavior / Dead End):** BottomSheet drag handle + RadarOverlay drag handle (enlarging risks the iOS swipe/drag behavior). Device-check the password eye most closely.

---

## Dead Ends — Approaches Already Tried That Did NOT Work

**Purpose:** Read this before proposing fixes. Do not re-suggest anything listed here unless you have a specific, concrete reason it would now behave differently — and if so, state that reason explicitly. Append to it whenever something is ruled out.

**Format:** `Problem → what was tried → why it failed → what actually worked (if known)`

- **iOS datetime-local input overflow** → tried `width:100%`, `max-width:100%`, and `overflow-hidden` on the parent → none constrained the input on iOS Safari → WORKED: flex wrapper with `min-width:0` plus `flex:1; min-width:0` on the input (see iOS Safari Quirks).
- **Forcing iOS PWA service worker updates** → tried the static `?v=velocity` query string → iOS Safari throttles SW update checks to ~once/24h and ignores the static string → the version string must change *between builds* to have any effect.
- **iOS PWA drag gestures via Pointer Events alone** → `pointerdown`/`pointermove` → `touchmove` often never fires on iOS because Safari treats it as a scroll gesture inside fixed/absolute containers → WORKED: raw `touchstart`/`touchmove`/`touchend` listeners as a fallback + `touch-action:none` on the drag handle.
- **iOS PWA bottom-sheet scrolling** → `overflow-hidden` on page root and on the open sheet container → a `fixed` + `overflow-hidden` ancestor blocks all descendant scrolling on iOS; parent `overflow-hidden` kills the child's scroll context → WORKED: remove those, give the sheet content an explicit `height` (not just `max-height`), `touch-action:pan-y`.
- **DM page "Conversation not found" — RLS suspected** → checked SELECT policies on `messages`/`conversations`/`conversation_notifications`, verified `public.messages` schema → all correct, RLS is not the cause → actual cause is auth timing race: TQ v5 disabled queries have `isLoading=false`, so the page shows error state while `user=null` during auth validation → WORKED: include `authIsLoading` in the `isLoading` guard (commit `d6823ce`).
- **PostCreateSheet "Add Shot" black screen on iOS** → (1) suspected this session's a11y edits — ruled out (aria-label + h-6→h-7 can't blank a screen); (2) tried **conditional mount** from the parent to match the working `PostDetailSheet` (`db62c14`) — did NOT fix it → real cause: a full-screen overlay using `backdrop-blur-xl` + a translucent `bg-background/95` + `animate-fade-up` (`animation-fill-mode: both`) can fail to composite its CHILDREN on iOS — the opaque backdrop paints but the content stays invisible (the working sibling escaped it only because it immediately renders a `bg-black` eager photo that forces a compositing layer) → WORKED (pending device confirm): solid opaque overlay, drop `backdrop-blur` + `animate-fade-up` (`544998b`). **(Portaling to `document.body` was later applied to this sheet for a separate force-scroll fix — see the transformed-ancestor entry below.)**
- **Profile shot detail force-scrolls to comments on open** → opening a shot jumped the sheet to the bottom (photo + header pushed off-screen) → cause: `PostComments` passed `autoScroll` to the shared `CommentThread`, whose `scrollIntoView` fires on mount → WORKED: remove `autoScroll` for the post-detail use (`544998b`).
- **Profile tabs overflow their pill border vertically** → custom `profileTabsTriggerClass` used `py-2.5` (~52px) but the base `TabsList` hard-codes `h-11` (44px), clipping the triggers → WORKED: add `h-auto` to the tabs list class so it grows to fit the triggers (`544998b`).
- **Other users' profiles show "Something went wrong" error screen (from DM header AND Crew list)** → suspected RLS, then ID mismatch (profile.id vs user_id) → both ruled out: live `user_profiles` SELECT policy is `is_public=true OR user_id=auth.uid()`, all rows public, and every API call returned 200 (data was never the problem); friendships/participant_ids store real `user_id`s → real cause: `RiderProfilePage.jsx` referenced `<LoadingState />` (line 347) but never imported it, so the loading branch threw `ReferenceError: LoadingState is not defined` on every visit, caught by the route `ErrorBoundary`. Own profile was unaffected because `/profile` renders a *different* component (`ProfilePage`) that imports it. It reached production because lint had **no** `no-undef`/`jsx-no-undef` and Vite doesn't catch undefined JSX in plain JS → WORKED: add the missing import; **enabled `react/jsx-no-undef` + `no-undef` in `eslint.config.js`** to guard the whole class. The same lint pass then caught a second latent crash — `NotificationsPage.jsx` calling `cn(...)` (line 221, pull-to-refresh) without importing it — fixed the same way (2026-06-01). **Debugging lesson: for a page-level "Something went wrong" that isn't a data/RLS error, grab the device console first — it was a one-line `ReferenceError`, not anything server-side.**
- **Can't delete own "shots" (no trash button)** → symptom looked like a missing button on own profile; RLS suspected → ruled out: live `user_posts_delete` policy is `(user_id = auth.uid()) OR is_admin()`, so the owner is allowed to delete server-side (UI-only bug) → real cause: `PostDetailSheet`'s delete affordance was gated on a `canDelete` **prop that only `ProfilePage` (`/profile`) passed**; `RiderProfilePage` (`/profile/:userId`, which also renders YOUR OWN profile when reached by tapping your avatar on a broadcast/comment/radar) opened the sheet without it, so own shots viewed there had no trash button → WORKED: gate on **ownership inside the shared component** — `const isOwner = !!userId && userId === post?.user_id;` — instead of a prop only one of two parents remembered to pass; also made the trash icon always `text-destructive` (was muted-gray-until-hover, invisible on touch) (2026-06-01). **Reusable lesson: gate destructive affordances (delete/remove) on actual ownership computed *inside* the shared component, never on a boolean prop passed by some-but-not-all parents — and back it with an RLS policy so the UI gate is defense-in-depth, not the only check.**
- **Profile sheets (`PostDetailSheet`/`PostCreateSheet`) force-scroll / top cut off on open** → NOT the old `autoScroll` cause (that `544998b` fix held) → real cause: the sheets are `position: fixed` but rendered inside the profile root, which has `animate-fade-up` whose `fadeUp` keyframe ends at `transform: translateY(0)` with `fill-mode: both` — a persistent non-`none` `transform` on an ancestor makes `fixed` resolve against that ancestor (not the viewport), so a scrolled page pushes the sheet's top (sticky header + delete button) off-screen → WORKED: `createPortal(sheet, document.body)` to escape the transformed ancestor (matches the existing `BroadcastDetailPage` portal); `z-50` kept (body-level portal paints over the in-`#root` nav) (2026-06-02). **Reusable lesson: a persistent ancestor `transform` (incl. any `animate-*` with `fill-mode: both` ending at `translateY(0)`) breaks `position: fixed` descendants — portal full-screen sheets to `document.body`.**
