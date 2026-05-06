---
name: React.memo and Prefetching Optimizations
description: Components memoized to prevent unnecessary re-renders, prefetch utilities for instant navigation between pages
type: project
---

## React.memo Applied To

**Brand/Icon components (render frequently across feed):**
- `NavGlyph` - renders 4x in Layout tab bar, only active state changes on navigation
- `SignalIcon` - renders once per BroadcastCard, props are stable primitives
- `OfficialMotorcycleIcon` - rendered multiple times per BroadcastCard (icon + badge)
- `RRLogo` - static props in Layout header and Home hero

**Status widgets in Home.jsx header:**
- `UserLiveStatus` - custom comparator: only re-renders when live/offline toggles
- `AlertPriorityStatus` - only re-renders when alert count changes

**Conversation/Detail sub-components:**
- `MessageBubble` (ConversationView) - prevents all bubbles re-rendering when new message arrives
- `EventRSVP` (BroadcastDetail) - prevents re-render when unrelated parent queries settle
- `ConnectionAction` (BroadcastDetail) - same isolation benefit
- `RiderMetric` (Profile) - 3 instances that don't change on editing state toggle

## Prefetching Infrastructure

**New utilities in `src/lib/query-client.js`:**
- `prefetchConversationMessages(conversationId)` - messages are heaviest query in ConversationView
- `prefetchRiderProfile(userId)` - warms cache for RiderProfile page

**Applied at these interaction points:**
- Messages page: ConversationItem hover/focus prefetches messages
- BroadcastDetail: author profile link hover/focus prefetches rider profile
- ConversationView: profile link header hover/focus prefetches rider profile
- Notifications: NotificationItem links prefetch the linked entity (broadcast/conversation/profile)

## Why

- Home feed with 20+ BroadcastCards was causing cascading re-renders through SignalIcon/OfficialMotorcycleIcon tree on every filter/sort change
- Navigating Messages -> ConversationView showed loading spinner while messages fetched (~200-500ms)
- Profile links across the app caused visible load time on navigation

**How to apply:** When adding new list item components or navigation links, follow the same pattern: memo for items in lists, prefetch on hover/focus for common navigation targets.
