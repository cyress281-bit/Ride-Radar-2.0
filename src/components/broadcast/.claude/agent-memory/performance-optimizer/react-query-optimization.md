---
name: React Query Optimization Patterns
description: Optimistic updates, real-time setQueryData instead of invalidation, prefetching on hover, and staleTime strategy for all hooks
type: project
---

Applied comprehensive React Query optimization across the Ride-Radar app (2026-05-06):

**Key Pattern: Optimistic Updates for Messages**
- useSendMessage uses onMutate to append optimistic message instantly
- On success, replaces optimistic ID with server message (no refetch)
- On error, rolls back to previousMessages snapshot
- Real-time subscription in useConversationMessages SKIPS messages from current user (prevents double-refetch)

**Key Pattern: setQueryData over invalidateQueries**
- useConversationMessages: real-time appends new messages from other users directly to cache
- useConversations: INSERT prepends, UPDATE patches in-place with re-sort
- useNearbyBroadcasts: UPDATE patches in-place or removes expired; INSERT uses debounced invalidation (2s)
- Notifications: INSERT prepends, UPDATE patches in-place (replaced 30s polling)

**staleTime Strategy**
- Default: 30s (query-client.js)
- Profiles: 5 min (stable, rarely change)
- Broadcast detail: 60s (prefetched on hover)
- Messages: 60s (real-time handles freshness)
- Conversations: 60s (real-time handles freshness)
- Notifications: 60s (real-time handles freshness)

**Prefetching**
- prefetchBroadcastDetail: called on BroadcastCard hover/focus
- prefetchHomeData: called on login success (conversations + notifications)
- Both exported from src/lib/query-client.js

**Why:** Double-refetch on message send caused UI flicker and wasted bandwidth. 30s polling for notifications was wasteful when Supabase real-time is available.

**How to apply:** When adding new real-time subscriptions, always use setQueryData for incremental updates. Reserve invalidateQueries for cases where server-side computation is needed (e.g., PostGIS distance calc on new broadcasts).
