# AGENTS.md — Ride Radar 2.0

This file provides everything an AI coding agent needs to work effectively in this repository. Read this file fully before touching any code.

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
- TanStack Query v5 (React Query) for data fetching with offline support
- React Router v6 for navigation
- Tailwind CSS 3.4 + Radix UI primitives (shadcn/ui)
- PostGIS for geospatial queries
- PWA (Progressive Web App) with Workbox service worker caching
- Capacitor 8 for iOS/Android native wrappers
- Deployed on Vercel

**Language:** JavaScript (JSX) with JSDoc annotations. `checkJs: false` in `jsconfig.json` — the codebase is plain JS/JSX without TypeScript type checking.

**Active Supabase project ID:** `iygtbcserdmvhhjicyyp`

---

## Build and Test Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code (targets src/components/**, src/features/**, src/hooks/**,
# src/providers/**, src/utils/**, src/App.jsx, src/main.jsx)
# Excludes src/lib/ and src/components/ui/
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type check (uses jsconfig.json; warnings OK)
npm run typecheck

# Run tests (Vitest + jsdom + React Testing Library)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Analyze bundle size
npm run analyze
```

---

## Environment Setup

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required variables:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Optional but recommended for production:
```
VITE_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/123456
VITE_APP_ENV=production
VITE_PLAUSIBLE_DOMAIN=rideradar.app
VITE_ENABLE_ANALYTICS=true
VITE_APP_VERSION=2.0.0
VITE_SUPPORT_EMAIL=support@rideradar.app
VITE_BETA_MODE=true
```

**All client-side env vars must be prefixed with `VITE_`. NEVER commit `.env` files to git.**

---

## Source Code Organization

```
src/
  App.jsx               # Root app: BrowserRouter, ErrorBoundary, route tree, guards
  main.jsx              # Entry point: ReactDOM.createRoot, monitoring init, SW registration
  index.css             # 1200+ line design system: CSS vars, Tailwind directives, Leaflet overrides

  components/           # Shared UI components
    brand/              # OfficialMotorcycleIcon, SignalIcon
    layout/             # AppLayout, AppHeader, BottomNav, BottomSheet
    safety/             # SafetyActions
    shared/             # AddressAutocomplete, AlertPhotoGrid, Avatar, AvatarWithStatus,
                        # Badge, EmptyState, ErrorBoundary, ErrorState, LoadingState,
                        # OptimizedImage, PageLoader, RideCard, VirtualList
    splash/             # logoAsset.js
    ui/                 # shadcn/ui components (NOT linted): avatar, badge, button, card,
                        # dropdown-menu, form, input, label, select, skeleton, switch,
                        # tabs, textarea, toggle-group, toggle
                        # + primitives: AspectRatio, Button, Stack, Text

  features/             # Domain-driven feature folders
    admin/              # 13 admin pages, API, hooks, components (lazy-loaded)
    auth/               # Login, onboarding, AuthProvider, use-auth.js (split contexts)
    broadcast/          # Feed, create, detail, comments, radar, official events
    chat/               # Conversations, messages, real-time
    connections/        # Friend requests, friendships
    legal/              # Community guidelines
    map/                # LiveMap, markers, popups, presence
    notifications/      # Notification feed, unread count
    profile/            # Profile pages, posts, comments, bike photos
    safety/             # Blocks, reports, beta notes
    settings/           # Settings, account, privacy, terms, support

  hooks/                # Cross-cutting custom hooks
    use-address-autocomplete.js
    use-app-resume-refresh.js
    use-blocked-ids.js
    use-online-status.js
    use-profile-batch.js
    use-pwa-install.js
    use-supabase-connection.js

  lib/                  # Core utilities (NOT linted)
    supabase.js         # Supabase client with custom auth storage (remember device)
    query-client.js     # TanStack Query client config + prefetch helpers
    utils.js            # cn(), formatDistance(), timeAgo(), debounce(), isValidUuid()
    constants.js        # Broadcast expiry, map defaults, presence TTL, limits
    analytics.js        # Plausible integration
    sentry.js           # Sentry init + PII scrubbing
    registerSW.js       # Service worker lifecycle + PWA install prompt
    logger.js           # Structured logging
    performanceMonitoring.js  # Web Vitals
    auth-redirect.js    # Safe redirect URL parsing
    broadcastUtils.js   # Broadcast helpers
    conversationUtils.js
    date-grouping.js
    geocoding.js
    image-utils.js
    locationCache.js
    motorcycleCatalog.js
    notificationCategories.js
    notificationNormalizer.js
    realtime-disconnects.js
    realtimeHealthRegistry.js
    routePreload.js     # Preload core routes after auth
    throttle.js
    tileCache.js

  providers/
    AppProviders.jsx    # QueryClientProvider + AuthProvider + Toaster

  test/
    setup.js            # Vitest setup: jest-dom, import.meta.env mock, console suppression
```

---

## Code Style Guidelines

### Linting
ESLint uses flat config (`eslint.config.js`). Targets:
- `src/components/**/*.{js,mjs,cjs,jsx}`
- `src/features/**/*.{js,mjs,cjs,jsx}`
- `src/hooks/**/*.{js,mjs,cjs,jsx}`
- `src/providers/**/*.{js,mjs,cjs,jsx}`
- `src/utils/**/*.{js,mjs,cjs,jsx}`
- `src/App.jsx`, `src/main.jsx`

**Excluded from linting:** `src/lib/` and `src/components/ui/`

Enforced rules:
- No unused imports (auto-removed with `eslint-plugin-unused-imports`)
- React hooks rules (`react-hooks/rules-of-hooks: error`)
- No prop-types required (`react/prop-types: off`)
- React 18 JSX transform (`react/react-in-jsx-scope: off`)

### Path Aliases
`@/` maps to `src/` (configured in `vite.config.js` and `jsconfig.json`):
```javascript
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth';
```

### Naming Conventions
- React components: PascalCase (`BroadcastFeedPage.jsx`)
- Hooks: camelCase prefixed with `use-` (`use-nearby-broadcasts.js`)
- Utilities: camelCase (`utils.js`, `constants.js`)
- API modules: suffixed with `-api` (`broadcast-api.js`, `chat-api.js`)

### JSDoc
The codebase uses JSDoc for type hints but `checkJs: false`. Add JSDoc to exported functions and hooks for readability, but do not expect TS enforcement.

---

## Testing Instructions

**Runner:** Vitest with jsdom environment.
**Config:** `vitest.config.js` — globals enabled, setup file at `src/test/setup.js`.

### Running Tests
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage report
```

### Writing Tests
Wrap components that use TanStack Query in a `QueryClientProvider`:
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

render(<MyComponent />, { wrapper: Wrapper });
```

Mock auth when needed:
```jsx
import { vi } from 'vitest';

vi.mock('@/features/auth/hooks/use-auth.js', () => ({
  useAuthState: () => ({ user: { id: 'test-user' } }),
  useAuthActions: () => ({}),
}));
```

Mock router with `MemoryRouter`:
```jsx
import { MemoryRouter } from 'react-router-dom';
render(<MemoryRouter><MyPage /></MemoryRouter>);
```

### Coverage Goals
- Smoke tests for all critical user flows (auth, broadcast, chat, notifications)
- Regression tests for previously fixed bugs
- Target: 60%+ coverage on `src/lib/` and `src/hooks/`

### Known Test Limitations
- Leaflet map components are not rendered in jsdom (no canvas/WebGL)
- Supabase realtime subscriptions are not tested in unit tests
- Image upload flows require browser APIs not available in jsdom

---

## Architecture Patterns

### Authentication Flow
- **Split contexts for performance:** `useAuthState()` and `useAuthActions()` are separate React contexts. Combining them causes re-render cascades on every token refresh. Components that only need actions should import `useAuthActions()`.
- `useSupabaseAuth()` combines both for legacy compatibility.
- Sessions persist in localStorage/sessionStorage with auto-refresh based on "remember device" preference.
- Protected routes redirect unauthenticated users to `/login` with `?redirect=` preservation.
- OnboardingGuard redirects incomplete profiles to `/onboarding`.

### Data Layer (TanStack Query + Supabase)
Custom hooks in `src/features/*/hooks/` wrap TanStack Query for Supabase operations.

Default query behavior (`src/lib/query-client.js`):
- `staleTime: 30s`
- `gcTime: 5min`
- `refetchOnWindowFocus: false`
- `networkMode: 'offlineFirst'`
- 1 retry for network errors only; no retry for 4xx

### Real-Time Subscriptions
All real-time features use Supabase subscriptions (WebSockets). Pattern:
1. React Query for initial data fetch
2. `supabase.channel().on('postgres_changes', ...)` for live updates
3. `queryClient.invalidateQueries()` to refetch when changes occur
4. Cleanup subscriptions in `useEffect` return

Peak: ~8 active Supabase realtime channels per user.

### Routing
All pages are lazy-loaded via `React.lazy()`. Admin pages are code-split into per-page chunks.

Key routes:
- `/login` — SupabaseLogin page (public)
- `/landing` — Marketing page (public)
- `/onboarding` — First-time profile setup (semi-protected)
- `/home` — Feed with nearby broadcasts
- `/broadcast` — Create new broadcast
- `/broadcast/:id` — Broadcast details with RSVP/connection requests
- `/messages` — Conversation list
- `/messages/:id` — Conversation view (real-time chat)
- `/profile` — Current user profile
- `/profile/:userId` — Other user's profile
- `/notifications` — Connection requests & activity
- `/settings` — Privacy controls
- `/admin/*` — Admin dashboard (role-guarded)

All routes under `/home`, `/messages`, `/broadcast`, `/profile`, `/notifications`, `/settings` use the `AppLayout` component (bottom navigation bar).

### Broadcast Location Privacy
`frozen_lat` / `frozen_lng` are the only public coordinates shown on the map. `lat` / `lng` are internal and never exposed publicly. All broadcast locations are intentionally approximate.

### Image Uploads
Images are uploaded to Supabase Storage bucket `uploads` (public):
- Avatar images: `avatars/{userId}/{filename}`
- Bike photos: `bikes/{userId}/{filename}`
- Event posters: `events/{broadcastId}/{filename}`
- Alert images: `alerts/{broadcastId}/{filename}`

---

## Database Schema (Supabase)

Key tables (all have RLS policies enabled):
- `users` — Auth users (mirror of Supabase Auth)
- `user_profiles` — User profile data (display_name, bio, avatar, bike info)
- `broadcasts` — Posts with geolocation (uses PostGIS GEOGRAPHY type)
- `conversations` — Chat threads
- `messages` — Chat messages
- `connection_requests` — Friend requests
- `friendships` — Accepted connections
- `user_blocks` — Blocked users
- `reports` — Safety reports
- `notifications` — Activity feed
- `user_settings` — Privacy preferences (including `analytics_enabled` for opt-out)
- `event_rsvps` — RSVP records for event broadcasts (`interested`, `going`, `maybe`, `not_going`)
- `live_map_presence` — Live map rider presence
- `official_events` — Curated official events

**Important:** All geospatial queries use the `get_nearby_broadcasts` RPC function (server-side PostGIS) instead of client-side distance calculations.

**Supabase — Key Behaviors:**
- **RLS silent failures:** A DELETE blocked by an RLS USING clause returns `{ error: null, data: [] }` — no error, 0 rows affected. Always use `.select()` on deletes and check `data.length` to distinguish a successful delete from a silently blocked one.
- **Upsert read-back:** After `upsert(...)`, adding `.select().single()` may fail (PGRST116) if the RLS SELECT policy doesn't allow reading the row back. Only read back data when the SELECT policy permits it.

Migrations are in `supabase/migrations/` (65+ migrations). Apply with `supabase db push`.

---

## PWA (Progressive Web App)

Ride Radar is a fully functional PWA with offline support, installability, and background sync.

**Key Files:**
- `vite.config.js` — PWA plugin configuration (Workbox, caching strategies)
- `public/manifest.json` — PWA manifest
- `src/lib/registerSW.js` — Service worker registration and install prompt
- `src/hooks/useOnlineStatus.js` — Online/offline detection
- `src/components/OfflineBanner.jsx` — Offline status UI

**Service Worker:**
- Registered at `/sw.js?v=velocity` (static query string)
- `skipWaiting: true`, `clientsClaim: true`, `autoUpdate`
- Vercel serves `sw.js` with `Cache-Control: public, max-age=0, must-revalidate`

**Caching Strategies:**
- Map tiles (CartoDB dark): CacheFirst (14d)
- Supabase Storage images: CacheFirst (30d)
- Google Fonts: CacheFirst (1yr)
- Supabase REST GET: NetworkFirst (4h)
- Static assets: Precached by Workbox

**iOS Safari known behavior:** Safari checks for SW updates at most once every 24 hours, regardless of HTTP headers. A `?v=velocity` static string cannot force updates — it must change between builds.

**iOS Safari datetime-local input overflow fix:**
`input[type="datetime-local"]` overflows its container on iOS regardless of `width:100%`. The ONLY fix that works is wrapping the input in a flex container with `min-width:0`, and setting `flex:1 min-width:0` on the input itself:
```jsx
<div style={{ display: 'flex', minWidth: 0, width: '100%' }}>
  <Input type="datetime-local" style={{ flex: 1, minWidth: 0 }} />
</div>
```

---

## Design System

Dark-only electric neon aesthetic. CSS custom properties in `index.css` for all tokens.

**Key colors (HSL):**
- `--primary` / `--brand-neon`: Neon green `#39FF14` — brand, active states
- `--brand-emergency`: Emergency red — alerts, destructive actions
- `--brand-radar` / `--cyan`: Radar blue `#00D4FF` — maps, tech, live indicators
- `--brand-amber`: Amber gold `#FFB800` — events, community
- `--background`: Deep charcoal `#0a0a0f`
- `--surface`: `#12121a` — cards, panels
- `--surface-elevated`: `#1a1a24` — hover states

**Broadcast type colors (safelisted in Tailwind config):**
- `bg-alert` — Red for safety alerts
- `bg-solo` — Blue for solo rides
- `bg-iso` — Purple for "in search of" posts
- `bg-event` — Green for events

**Typography:** Inter (sans), JetBrains Mono (monospace for data).

**Effects:** Glow system, glassmorphism (`bg-surface/80 backdrop-blur-xl`), radar-gradient, pulse-gradient.

**Animations:** radar-sweep, ekg-pulse, neon-flicker, glow-pulse.

---

## Analytics & Monitoring

- **Sentry** (`src/lib/sentry.js`) — Error tracking, performance monitoring, session replay. PII is aggressively scrubbed (emails, JWTs, lat/lng, messages redacted).
- **Plausible** (`src/lib/analytics.js`) — Privacy-focused, cookieless analytics. GDPR compliant. User can opt out via Settings.
- **Web Vitals** (`src/lib/performanceMonitoring.js`) — Core Web Vitals tracking (LCP, FID, CLS, TTFB, INP).
- **Admin Dashboard** (`/admin/monitoring`) — Real-time system health.

Analytics only runs in production with proper environment variables configured.

---

## Security Considerations

- **RLS policies** are enforced on all database tables. Never assume a query will fail loudly — RLS can silently return empty arrays.
- **No PII in analytics** — Sentry scrubs emails, names, locations, messages. Plausible is cookieless.
- **Env vars** must be prefixed with `VITE_` to be exposed to the client. Never put secrets in client-side env vars.
- **Supabase client** is NOT exposed on `window` to prevent accidental leakage.
- **HTTPS required** for service workers and PWA functionality.
- Vercel headers include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.

---

## Deployment

**Primary host:** Vercel (`vercel.json` configured)
- Framework: vite, output: `dist/`
- SPA rewrite: all non-asset paths → `/index.html`
- Service worker headers: `Cache-Control: public, max-age=0, must-revalidate`

**Mobile:** Capacitor builds for iOS/Android from `dist/`.

**Pre-deployment checklist:**
1. `npm run test` passes
2. `npm run lint` passes
3. `npm run build` succeeds
4. `npm run analyze` reviewed
5. Environment variables verified on hosting platform
6. Database migrations applied (if any)

---

## Agent Rules — ALWAYS Follow These

1. **Never commit or push without explicit user approval.** The user will say "commit and push" and provide an exact commit message. Do not commit proactively.
2. **Always explain what you plan to change and why before touching any file.** Show the full proposed diff or exact lines before making edits. Wait for approval.
3. **Minimum viable fix only.** Do not refactor, restructure, add abstractions, or clean up unrelated code. Only touch files directly related to the stated issue.
4. **Never change anything outside the specific issue described.** If you need to modify something adjacent, stop and ask first.
5. **Never drop, rename, or alter Supabase columns without explicit approval.** Always prefer additive database changes over destructive ones.
6. **Do not run the app or make database changes unless explicitly instructed.**
7. **When the user provides an exact commit message, use it verbatim — do not reword it.**
8. **After every push, show the output of `git log --oneline -5` and `git status`.**

---

## Common Patterns

### Creating a new data hook
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

### Adding real-time subscriptions
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

## Documentation Index

- `README.md` — Quick start, project overview
- `CLAUDE.md` — Agent context and coding conventions (companion to this file)
- `ARCHITECTURE.md` — System design, data flow, key assumptions
- `DEPLOYMENT_CHECKLIST.md` — Pre-launch and post-launch steps
- `TESTING.md` — How to write and run tests
- `KNOWN_LIMITATIONS.md` — Known constraints and future work
- `DESIGN_SYSTEM.md` — Color palette, typography, effects, animations
- `PWA_README.md` — PWA quick start and testing
- `PWA_IMPLEMENTATION.md` — Full PWA implementation details
- `PWA_TESTING_GUIDE.md` — Comprehensive PWA testing checklist
- `ANALYTICS.md` — Tracked events and analytics setup
- `MONITORING.md` — Monitoring and alerting setup
