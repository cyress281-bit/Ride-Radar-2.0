---
name: Ride Radar 2.0 Architecture
description: Core architecture decisions - Supabase backend, React Query for data, snake_case normalization layer, role-based admin
type: project
---

Ride Radar 2.0 is a React (Vite) mobile-first app for motorcycle riders.

**Why:** Migrated from Base44 to Supabase for real database, auth, and RLS. Migration completed 2026-05-06.

**How to apply:**
- All data fetching uses `@tanstack/react-query` with `supabase` client from `@/lib/supabase`
- Supabase returns snake_case; normalizer at `@/lib/supabaseNormalizer.js` provides camelCase aliases
- Auth via `@/lib/SupabaseAuthContext.jsx` (useSupabaseAuth hook)
- Admin role check via `@/hooks/useAdminRole.js` (queries users.role column)
- Shared admin data via `@/hooks/useAdminData.js` (one hook, many react-query instances)
- RLS policies live in `supabase/migrations/` directory
- UI components from shadcn/ui in `@/components/ui/`
- Admin sub-pages under `@/pages/admin/`, shared components in `@/components/admin/`
