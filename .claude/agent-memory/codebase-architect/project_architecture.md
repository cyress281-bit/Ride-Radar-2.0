---
name: Ride Radar 2.0 Architecture Overview
description: Core architecture of the Ride Radar motorcycle social network app after Supabase migration (May 2026)
type: project
---

React + Supabase motorcycle social network app (v2.0.0). Recently migrated from Base44 to Supabase.

**Why:** Completed migration May 5, 2026 to remove credit limits and gain real-time/PostGIS capabilities.

**How to apply:**
- All new code must use Supabase snake_case field names (not Base44 camelCase)
- Admin pages (src/pages/admin/*) still reference Base44 client - completely broken
- BroadcastCard.jsx and broadcastUtils.js still use camelCase field names - critical bug
- useProfileBatch maps by `p.id` instead of `p.user_id` - profile lookups fail

Key tech stack: React 18, Vite, TanStack Query, Supabase (Auth + DB + Storage + Realtime), react-leaflet, Radix UI, Tailwind CSS
