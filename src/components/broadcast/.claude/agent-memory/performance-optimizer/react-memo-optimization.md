---
name: React.memo optimization applied across feed components
description: BroadcastCard, AlertPhotoGrid, FeedControls, ConversationItem, NotificationItem, ConnectionRequestCard, SignalStat all wrapped with React.memo. BroadcastCard has custom areEqual comparator. Home.jsx uses useCallback for view mode handlers. Messages/Notifications use useCallback for mutation handlers passed to memoized children.
type: project
---

Applied React.memo memoization to eliminate unnecessary re-renders in feed-heavy views:

- BroadcastCard: custom equality function comparing broadcast.id, title, body, expiresAt, created_date/at, author reference, userLat/Lng, prominentSoloAvatar
- AlertPhotoGrid: standard memo (images prop is stable from parent)
- FeedControls: standard memo (receives setFeedFilter/setFeedSort which are stable useState setters)
- ConversationItem: extracted from Messages inline JSX, receives conversation + otherProfile
- NotificationItem: extracted from Notifications inline JSX, receives notification + onMarkRead callback
- ConnectionRequestCard: extracted from Notifications, receives request + fromProfile + handlers
- SignalStat (Home.jsx): small presentational component, memo'd to skip re-renders when parent counts change

**Why:** Home feed with 30 cards was re-rendering all cards on every filter/sort/viewMode state change. Messages and Notifications had similar issues with list items re-rendering on any mutation.

**How to apply:** When adding new list items or feed components, always extract them into separate memo'd components. Pass stable callbacks (useCallback) for event handlers. useState setters are already stable and safe to pass directly.
