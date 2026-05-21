# Architecture — Ride Radar 2.0

## High-Level Data Flow

```
React UI
   ↕
TanStack Query (cache, stale-while-revalidate, optimistic updates)
   ↕
Supabase Client (REST + Realtime WebSocket)
   ↕
Supabase Backend (Postgres + Row Level Security + Edge Functions)
```

## Feature Map

| Feature | Key Files | Data Layer |
|---------|-----------|------------|
| **Auth** | `features/auth/hooks/use-auth.js` | `auth.users`, `public.users`, `public.user_profiles` |
| **Radar / Feed** | `features/broadcast/pages/BroadcastFeedPage.jsx` | `get_nearby_broadcasts` RPC, `broadcasts` table |
| **Broadcast Create** | `features/broadcast/components/BroadcastForm.jsx` | `broadcasts`, `uploads` bucket |
| **Ride Now** | `features/broadcast/hooks/use-create-broadcast.js` | `broadcasts` (type=`solo_ride`) |
| **Live Map** | `features/map/hooks/use-live-map.js` | `live_map_presence` table |
| **Events** | `features/broadcast/pages/BroadcastDetailPage.jsx` | `broadcasts` (type=`event`), `event_rsvps` |
| **Crew / ISO** | `features/broadcast/components/BroadcastForm.jsx` | `broadcasts` (type=`iso`, `iso_subtype`) |
| **Chat** | `features/chat/pages/ConversationPage.jsx` | `conversations`, `messages` |
| **Connections** | `features/connections/hooks/use-connection-requests.js` | `connection_requests`, `friendships` |
| **Notifications** | `features/notifications/hooks/use-notifications.js` | `notifications` |
| **Blocks** | `features/safety/hooks/use-blocks.js` | `blocks` |

## Key Architectural Assumptions

### 1. Auth Split Contexts
`useAuthState()` and `useAuthActions()` are **separate React contexts**. Combining them causes re-render cascades on every token refresh. Components that only need actions (e.g., buttons) should import `useAuthActions()`.

### 2. Profile Load Sequence
`profileLoadSeq` is a ref-based counter that guards against race conditions during fast sign-in/sign-out. `canCommit(seq)` ensures only the most recent load attempt updates React state.

### 3. Broadcast Location Privacy
`frozen_lat` / `frozen_lng` are the **only** coordinates shown on the map. `lat` / `lng` are internal and never exposed publicly. All broadcast locations are intentionally approximate.

### 4. Block Cascade Invalidation
Creating or removing a block MUST invalidate:
- `conversations` queries
- `broadcasts` / `nearbyBroadcasts` queries
- `messages` queries
This ensures blocked users disappear immediately from all UI surfaces.

### 5. Conversation Atomicity
`getOrCreateConversation` MUST try the RPC first, then fallback. Duplicate conversations break the messaging UX.

### 6. Map Marker Icon Caching
`markerIconCache` and `riderMarkerIconCache` are module-level `Map` instances. Recreating them per-render leaks memory and causes Leaflet errors.

### 7. Service Worker Strategy
`injectRegister: false` in Vite PWA config. Manual registration in `main.jsx` and `registerSW.js` allows custom update prompts and reload rate-limiting.

## Realtime Architecture

There are **~8 active Supabase realtime channels** at peak:

1. `notifications-${userId}` — INSERT/UPDATE/DELETE on `notifications`
2. `connection-requests-incoming-${userId}` — `connection_requests` (to_user_id)
3. `connection-requests-sent-${userId}` — `connection_requests` (from_user_id)
4. `friendships-${userId}` — `friendships` (user_a_id + user_b_id)
5. `broadcasts-nearby-${userId}` — `broadcasts` realtime for radar feed
6. `live-map-presence-${userId}` — `live_map_presence`
7. `messages-${conversationId}` — `messages` per open conversation
8. `conversations-${userId}` — `conversations` participant changes

**Health monitoring:** `useSupabaseConnection()` creates a dedicated health channel and exposes `{ status, isConnected }` for UI indicators.

## State Management

- **Server state:** TanStack Query with `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus: false`
- **Auth state:** Split contexts in `use-auth.js` (see above)
- **Local UI state:** React `useState` / `useReducer`
- **Offline queue:** the current app persists failed mutations to `localStorage` with 24h expiry

## Bundle Strategy

Vite manual chunks:
- `vendor-react`, `vendor-supabase`, `vendor-query`, `vendor-leaflet`, `vendor-framer`, `vendor-radix`, `pages-admin`

All routes are lazy-loaded via `React.lazy()`. Admin pages are code-split into a separate chunk.
