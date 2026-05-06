---
name: Admin Pages Supabase Migration
description: All 9 admin pages migrated from Base44 to Supabase with proper role checking and RLS policies
type: project
---

Completed 2026-05-06. All admin pages rewritten to use Supabase directly instead of deleted Base44 client.

**Why:** Base44 client was deleted during backend migration; admin pages were completely broken.

**How to apply:**
- `useAdminRole` hook checks `users.role === 'admin'` via Supabase query (5min stale)
- `useAdminData` hook provides all shared admin queries (users, broadcasts, profiles, reports, blocks, deletions, conversations, notifications)
- Admin mutations use direct `supabase.from().update/delete()` calls in each page component
- AdminNotifications uses Edge Function `send-announcement` with fallback to direct insert
- Layout.jsx uses `useAdminRole()` for the admin shield icon visibility
- AdminDashboard has Navigate guard for non-admins; other pages inherit protection from Layout visibility
- RLS migration: `supabase/migrations/20260506_admin_rls_policies.sql` with `is_admin()` helper function
- Data fields use Supabase snake_case conventions (created_at, target_type, blocker_profile_id, etc.)
