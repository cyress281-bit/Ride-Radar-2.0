# RideRadar 2.0 — Top 25 Priority Queue

> Derived from the 2026-05-31 comprehensive audit.  
> **Ranking logic:** All CRITICAL first (by security → stability → performance), then HIGH (by user impact → data integrity → performance). Dependencies considered: foundational fixes (auth, RLS, CSP) precede dependent fixes (offline, sync, UI polish).

---

## Priority Queue (Ranked 1–25)

| Rank | ID | Category | File | Finding | Severity | Effort | Dependencies |
|------|----|----------|------|---------|----------|--------|--------------|
| 1 | C-001 | Security | src/lib/supabase.js:29-53 | JWT tokens in localStorage — XSS theft | CRITICAL | Large | None |
| 2 | C-003 | Security / Supabase | supabase/migrations/* | Tables without RLS — data exposure | CRITICAL | Large | None |
| 3 | C-004 | Security / Supabase | src/features/admin/api/admin-api.js:183-189 | Admin API client-side only — privilege escalation | CRITICAL | Large | C-003 |
| 4 | C-002 | Security | src/lib/supabase.js:2 | Missing capacitor-storage.js module — auth crash | CRITICAL | Small | None |
| 5 | C-007 | PWA / Security | use-create-broadcast.js, use-messages.js | No Background Sync — Bike Down alerts lost offline | CRITICAL | Large | None |
| 6 | C-005 | Security / Supabase | supabase/migrations/20260512_live_map_presence_server_time.sql:44 | SECURITY DEFINER without search_path | CRITICAL | Small | None |
| 7 | C-008 | Performance | src/features/auth/hooks/use-auth.js:65-236 | Auth provider bypasses TanStack Query | CRITICAL | Medium | None |
| 8 | C-013 | Error Handling | src/features/auth/hooks/use-auth.js:372-386 | Sign-out clears state before API call — no rollback | CRITICAL | Medium | None |
| 9 | C-018 | PWA | public/ directory | All PWA icon files missing from public/ | CRITICAL | Small | None |
| 10 | C-006 | PWA | vite.config.js:174 | No offline fallback page — deep links fail offline | CRITICAL | Small | None |
| 11 | C-009 | Performance | src/providers/ViewportProvider.jsx:58-64 | Context value inline — cascading re-renders | CRITICAL | Small | None |
| 12 | C-019 | Performance / Code Quality | src/features/map/components/LiveMapMapLibre.jsx:238 | Link component used but never imported — runtime crash | CRITICAL | Small | None |
| 13 | C-014 | Error Handling | src/features/broadcast/hooks/use-create-broadcast.js:179 | Promise.all photo uploads have no error handling | CRITICAL | Medium | None |
| 14 | C-011 | Performance | src/features/broadcast/pages/BroadcastDetailPage.jsx:915,1024,454 | Raw `<img>` tags bypass OptimizedImage | CRITICAL | Small | None |
| 15 | C-020 | State Management / Supabase | src/features/notifications/hooks/use-notifications.js:63 | Stale notification settings in shared realtime channel | CRITICAL | Medium | None |
| 16 | C-012 | Error Handling | src/features/broadcast/api/broadcast-api.js:131 | hardDeleteBroadcast throws instead of returning error | CRITICAL | Small | None |
| 17 | C-015 | Feature / Error Handling | src/features/auth/pages/OnboardingPage.jsx | File upload no type/size pre-validation | CRITICAL | Small | None |
| 18 | C-017 | Supabase / Performance | src/features/admin/api/admin-api.js:164-180 | getEventRsvpCounts client-side count | CRITICAL | Small | None |
| 19 | C-010 | PWA / Mobile | src/features/profile/components/PostDetailSheet.jsx:25 | Scroll lock trap in PostDetailSheet | CRITICAL | Small | None |
| 20 | C-016 | UI/UX / Accessibility | src/index.css | Missing prefers-reduced-motion support | CRITICAL | Medium | None |
| 21 | H-001 | Security | src/App.jsx:84-108 | Client-side only route guards — stale session access | HIGH | Medium | C-001 |
| 22 | H-005 | Security | index.html | Missing Content Security Policy (CSP) | HIGH | Small | None |
| 23 | H-006 | Security | index.html | Missing X-Frame-Options / clickjacking protection | HIGH | Small | H-005 |
| 24 | H-009 | Security / Supabase | supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql | getNearbyBroadcasts trusts client for block list | HIGH | Medium | C-003 |
| 25 | H-010 | Security / Supabase | Various | Storage buckets without RLS policies | HIGH | Medium | C-003 |

---

## Honorable Mentions (Positions 26–35)

These are the next HIGH-severity items to pull into the sprint after the top 25:

| Rank | ID | Category | File | Finding | Effort |
|------|----|----------|------|---------|--------|
| 26 | H-004 | Security | src/features/auth/components/LoginForm.jsx:92-148 | No rate limiting on auth endpoints | Medium |
| 27 | H-003 | Security | src/features/auth/api/auth-api.js:146-152 | Open redirect in linkOAuthProvider | Small |
| 28 | H-002 | Security | src/features/auth/pages/LoginPage.jsx:54-70 | Password recovery without session verification | Small |
| 29 | H-007 | Security | src/lib/image-utils.js:247 | User-controlled image URLs without origin validation | Small |
| 30 | H-008 | Security | src/App.jsx:134-169 | Onboarding guard leaks layout during loading | Small |
| 31 | H-035 | Supabase / Security | supabase/migrations/* | No DELETE policy for messages | Small |
| 32 | H-050 | Supabase / Security | src/features/chat/hooks/use-conversations.js:55-63 | Conversation INSERT doesn't check blocked users | Small |
| 33 | H-011 | Performance | src/hooks/use-app-resume-refresh.js:55-60 | App resume thundering herd (19 queries) | Small |
| 34 | H-012 | Performance | src/features/chat/hooks/use-messages.js:23 | Message query key includes user.id | Small |
| 35 | H-014 | Performance / Supabase | src/features/broadcast/api/broadcast-api.js:72 | N+1 broadcast query for Bike Down check | Medium |

---

## Queue Rules

1. **Blockers first:** Security foundations (JWT, RLS, CSP) must land before performance/UI fixes that depend on them.
2. **No skipping CRITICALs:** All 48 CRITICAL items must be addressed or explicitly downgraded with owner sign-off before HIGH work begins.
3. **Verified only:** This queue reflects the *audit report's* severity claims. Cross-reference with `CLAUDE.md` Current Active Task — Claude Code and Codex triage found many of these to be FALSE or INFLATED. Do not start work on an item until it has been verified independently.
4. **One sprint at a time:** The top 25 map to roughly 2–3 weeks of work assuming a single developer.

---

## How This Queue Was Built

- CRITICAL items are ranked by: (1) security/data exposure, (2) crash potential, (3) user-facing breakage, (4) fix effort (smaller first when tied).
- HIGH items start at rank 21 because all CRITICALs take precedence per the audit's own severity scale.
- Dependencies are noted so that parallel work doesn't create merge conflicts or logical ordering issues.
