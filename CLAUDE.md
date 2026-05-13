# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ride Radar 2.0 is a React-based social network for motorcyclists built on Supabase. The app enables riders to:
- Create and discover nearby rides (broadcasts)
- Message other riders in real-time
- Build connections and manage friendships
- Report safety alerts with geolocation

**Tech Stack:**
- React 18 + Vite
- Supabase (auth, database, storage, real-time)
- TanStack Query (React Query) for data fetching with offline support
- React Router v6 for navigation
- Tailwind CSS + Radix UI components
- PostGIS for geospatial queries
- PWA (Progressive Web App) with service worker caching

**AI Development Tools:**
- Supabase MCP Server (direct database access for Claude Code)
- See `SUPABASE_MCP_SETUP.md` for MCP configuration and authentication

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
```

## Environment Setup

Create `.env` file with Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

See `.env.example` for template.

## Architecture

### Authentication Flow
- **SupabaseAuthContext** (`src/lib/SupabaseAuthContext.jsx`) wraps the entire app
- Provides: `user`, `profile`, `isAuthenticated`, `isLoading`, `signIn`, `signUp`, `signOut`, `refreshProfile`
- Sessions persist in localStorage with auto-refresh
- Protected routes redirect unauthenticated users to `/login`

### Data Layer (React Query + Supabase)
The app uses custom hooks (in `src/hooks/`) that wrap TanStack Query for Supabase operations:
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
All real-time features use Supabase subscriptions (WebSockets). The pattern is:
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
- `src/components/ui/` - Radix UI primitives (shadcn/ui pattern) - DO NOT LINT
- `src/components/` - Feature-specific components
- `src/pages/` - Page components mapped to routes
- `src/hooks/` - Custom React hooks (data fetching)
- `src/lib/` - Core utilities (Supabase client, auth context, image uploads)

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

**Important:** All geospatial queries use the `get_nearby_broadcasts` RPC function (server-side PostGIS) instead of client-side distance calculations.

### Image Uploads
Images are uploaded to Supabase Storage bucket `uploads`:
- Avatar images: `avatars/{userId}/{filename}`
- Bike photos: `bikes/{userId}/{filename}`
- Event posters: `events/{broadcastId}/{filename}`
- Alert images: `alerts/{broadcastId}/{filename}`

Use `src/lib/localImageUpload.js` for upload logic with validation from `src/lib/uploadValidation.js`.

## Linting Configuration
ESLint runs on `src/components/**`, `src/features/**`, `src/hooks/**`, `src/providers/**`, `src/utils/**`, `src/App.jsx`, and `src/main.jsx` (excludes `src/lib/` and `src/components/ui/`). Rules enforce:
- No unused imports (auto-removed with `eslint-plugin-unused-imports`)
- React hooks rules
- No prop-types required (uses JSDoc for types)

## Path Aliases
`@/` maps to `src/` directory (configured in `vite.config.js` and `jsconfig.json`):
```javascript
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
```

## Migration Status
The app uses Supabase for auth, database, storage, realtime subscriptions, and PostGIS geospatial queries. Legacy backend code and dependencies have been removed from the active repository.

## Analytics & Monitoring

The app includes comprehensive analytics and monitoring:

- **Sentry** (`src/lib/sentry.js`) - Error tracking, performance monitoring, session replay
- **Plausible** (`src/lib/analytics.js`) - Privacy-focused, cookieless analytics
- **Web Vitals** (`src/lib/performanceMonitoring.js`) - Core Web Vitals tracking (LCP, FID, CLS, TTFB, INP)
- **Admin Dashboard** (`/admin/monitoring`) - Real-time system health and metrics

**Privacy:**
- No PII collected (user IDs, emails, names, locations)
- Users can opt-out via Settings (`analytics_enabled` in `user_settings`)
- GDPR compliant (Plausible is cookieless)
- All tracked events documented in `ANALYTICS.md`

**Setup:**
See `ANALYTICS_SETUP.md` for configuration instructions.

## Important Notes
- **Test suite** - Vitest + jsdom + RTL: `npm run test` (5 tests across 2 test files)
- **Geospatial queries** - Always use `get_nearby_broadcasts` RPC function, never calculate distance client-side
- **Real-time** - All feeds (home, messages, notifications) use Supabase subscriptions
- **Row-Level Security** - All Supabase queries respect RLS policies, ensure user is authenticated
- **Image validation** - Max file size 5MB, only JPEG/PNG/WebP allowed (see `uploadValidation.js`)
- **ESLint quiet mode** - `npm run lint` uses `--quiet` flag, only shows errors (not warnings)
- **Analytics** - Only runs in production with proper environment variables configured

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
    enabled: !!params, // Only run if params exist
    staleTime: 30000, // Cache for 30 seconds
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

### Protected page component:
All pages under the `Layout` route are automatically protected. For standalone protected pages, use the `ProtectedRoute` wrapper in `App.jsx`.

## PWA (Progressive Web App)

Ride Radar is a fully functional PWA with offline support, installability, and background sync.

**Key Features:**
- **Service Worker**: Caches static assets, API responses, and images (Workbox via vite-plugin-pwa)
- **Offline Mode**: Previously visited pages work offline with cached data
- **Install Prompt**: Users can install the app to home screen (iOS/Android/Desktop)
- **Offline Queue**: Messages and mutations queue when offline, sync when back online
- **Network Detection**: Shows offline banner when disconnected

**Files:**
- `vite.config.js` - PWA plugin configuration with caching strategies
- `public/manifest.json` - PWA manifest (name, icons, theme)
- `src/lib/registerSW.js` - Service worker registration and install prompt
- `src/hooks/useOnlineStatus.js` - Online/offline detection
- `src/components/OfflineBanner.jsx` - Offline status UI

**Documentation:**
- See `PWA_IMPLEMENTATION.md` for full implementation details
- See `PWA_TESTING_GUIDE.md` for testing instructions

**Caching Strategy:**
- Supabase REST API: NetworkFirst (10s timeout, 24h cache)
- Supabase Storage (images): CacheFirst (30 day cache)
- Static assets: Precached with Workbox
- Admin routes: Not cached (always fresh)

**Installation:**
1. Build: `npm run build` (generates service worker)
2. Test: `npm run preview` and open in browser
3. Install: Click install prompt or "Install App" in Settings

## Tailwind Theme
Custom broadcast type colors are defined in `tailwind.config.js`:
- `bg-alert` - Red for safety alerts
- `bg-solo` - Blue for solo rides
- `bg-iso` - Purple for "in search of" posts
- `bg-event` - Green for events

These are safelisted to ensure they're included in the build.
