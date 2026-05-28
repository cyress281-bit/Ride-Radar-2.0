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

## Current Active Task

**Purpose:** This is the handoff log between AI tools (Claude Code, Kimi, Claude browser). Update it at the end of every session so the next AI picks up exactly where you left off — no re-explaining, no wasted tokens.

**Last Updated By:** Kimi
**Date:** 2026-05-27

### What We're Working On
- System Collapse refactor: removing all custom runtime OS layers and restoring deterministic Supabase + React Query data flow
- Target: zero custom runtime systems controlling data flow

### Last Action Taken
- **System Collapse executed and pushed to main**
- Deleted 15 runtime system files (~5,200+ lines):
  - `rr-runtime.js` (global runtime ledger)
  - `validate-auth-transport.js` (JWT probe validator)
  - `transport-health-monitor.js` (continuous health monitor)
  - `memory-governor.js` (memory governance)
  - `conversation-coherence.js` (coherence engine)
  - `realtimeHealthRegistry.js` (health registry)
  - `scroll-authority.js` + `scrollPredictionSmoother.js` + `scrollAdaptiveIntelligence.js` + `useUnifiedScrollRuntime.js` (scroll stack)
  - `gesture-coordinator.js` (gesture arbitration)
  - `layout-telemetry.js` (telemetry)
  - `layout-guardrails.js`, `provider-guard.js` (policy docs/shims)
- Simplified 24+ source files to remove all runtime integration:
  - `use-auth.js` — removed transport/health/monitor wiring, kept split-context auth + profile
  - `use-messages.js`, `use-conversations.js`, `use-send-message.js` — removed coherence/health gates
  - `ConversationPage.jsx` — replaced scroll authority stack with simple `scrollToBottom` + `wasNearBottom` ref
  - `AppProviders.jsx` — removed `AppBootstrapGate`, app renders immediately
  - `ViewportProvider.jsx` — removed runtime ledger sync, root detection
  - All feature hooks — removed `markRealtimeSurface*` health registry calls
- All validations pass: build ✅, lint ✅, typecheck ✅, tests ✅

### Next Step
- Test DM page (`/messages/:id`) on iPhone PWA to verify messages load correctly after collapse
- Monitor for any regressions in scroll behavior, realtime subscriptions, or auth flow
- Update Known Issues table if DM page issue is resolved or if new issues surface

### AI Handoff Log
| Session | AI Used | What Was Done |
|---|---|---|
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
| Direct messaging page fails to load | 🚨 Active | Conversation view (`/messages/:id`) not loading. Investigating — suspect RLS policy on `messages`/`conversations` or a realtime subscription error. Tracing it surfaced additional backend/security issues; document specifics here as confirmed. |

---

## Dead Ends — Approaches Already Tried That Did NOT Work

**Purpose:** Read this before proposing fixes. Do not re-suggest anything listed here unless you have a specific, concrete reason it would now behave differently — and if so, state that reason explicitly. This section is the single biggest time/token saver in this file. Append to it whenever something is ruled out.

**Format:** `Problem → what was tried → why it failed → what actually worked (if known)`

- **iOS datetime-local input overflow** → tried `width:100%`, `max-width:100%`, and `overflow-hidden` on the parent → none constrained the input on iOS Safari → WORKED: flex wrapper with `min-width:0` plus `flex:1; min-width:0` on the input (see iOS Safari Quirks section).
- **Forcing iOS PWA service worker updates** → tried the static `?v=velocity` query string → iOS Safari throttles SW update checks to ~once/24h and ignores the static string → the version string must change *between builds* to have any effect.
- **iOS PWA drag gestures via Pointer Events alone** → `pointerdown`/`pointermove` → `touchmove` often never fires on iOS because Safari treats it as a scroll gesture inside fixed/absolute containers → WORKED: raw `touchstart`/`touchmove`/`touchend` listeners as a fallback + `touch-action:none` on the drag handle.
- **iOS PWA bottom-sheet scrolling** → `overflow-hidden` on page root and on the open sheet container → a `fixed` + `overflow-hidden` ancestor blocks all descendant scrolling on iOS; parent `overflow-hidden` kills the child's scroll context → WORKED: remove those, give the sheet content an explicit `height` (not just `max-height`), `touch-action:pan-y`.

<!-- TEMPLATE — copy for new entries:
- **<problem>** → tried <approach> → failed because <reason> → WORKED: <fix, or "still open">.
-->