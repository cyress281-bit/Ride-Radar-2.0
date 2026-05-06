---
name: Virtual Scrolling Implementation
description: TanStack Virtual (@tanstack/react-virtual) integrated into 4 list components with adaptive thresholds - only virtualizes when item count exceeds threshold to avoid overhead on small lists
type: project
---

Virtual scrolling added on 2026-05-06 using @tanstack/react-virtual v3.

**Why:** All list views rendered every item with .map(), causing slow initial render, scroll jank, and high memory with 100+ items.

**How to apply:** When adding new list views or modifying existing ones, follow the established pattern:
- Use threshold-based activation (don't virtualize small lists)
- Use `virtualizer.measureElement` for dynamic heights
- Use `contain: strict` on scroll containers for paint optimization
- Preserve existing memo() on item components (they still help within virtualized view)

**Implementation details:**
- Messages (src/pages/Messages.jsx): threshold=20, estimateSize=80px
- ConversationView (src/pages/ConversationView.jsx): threshold=30, estimateSize=52px, overscan=10, scrollToBottom on new messages
- Home feed (src/pages/Home.jsx): threshold=20, estimateSize=180px
- Notifications (src/pages/Notifications.jsx): threshold=25, estimateSize=72px, overscan=8
- Generic VirtualList component at src/components/VirtualList.jsx (reusable wrapper + hook)

**Key decisions:**
- Each page uses useVirtualizer directly (not the wrapper) for maximum control
- Falls back to standard .map() rendering below threshold to avoid virtualizer overhead
- ConversationView uses higher overscan (10) since chat scrolling is fast and direction changes are common
- All virtualizers use measureElement for accurate dynamic heights
