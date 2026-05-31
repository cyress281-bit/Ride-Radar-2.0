# RideRadar 2.0 — Audit Findings by Category

> Generated from comprehensive codebase audit (208 files, 508 findings)
> Date: 2026-05-31

---

## Executive Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Security | 10 | 18 | 22 | 12 | 62 |
| Performance | 6 | 22 | 39 | 17 | 84 |
| PWA / Mobile | 6 | 11 | 22 | 14 | 53 |
| UI / UX | 5 | 20 | 25 | 8 | 58 |
| Supabase / Database | 10 | 21 | 27 | 14 | 72 |
| Error Handling / Edge Cases | 11 | 32 | 41 | 23 | 107 |
| Code Quality | 0 | 10 | 36 | 40 | 86 |
| **TOTAL** | **48** | **134** | **212** | **114** | **508** |

---

## 1. Security (62 total)

**Top Files:** `src/lib/supabase.js`, `src/features/admin/api/admin-api.js`, `src/App.jsx`, `index.html`, `supabase/migrations/*`

### CRITICAL (10)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-001 | src/lib/supabase.js:29-53 | JWT tokens in localStorage — XSS theft | httpOnly cookies or Secure SameSite cookie fallback |
| C-002 | src/lib/supabase.js:2 | Missing capacitor-storage.js module | Create module or fallback to standard storage |
| C-003 | supabase/migrations/* | Tables without RLS (user_posts, post_comments, etc.) | Add CREATE TABLE + ENABLE RLS + policies |
| C-004 | src/features/admin/api/admin-api.js:183-189 | Admin checks client-side only | Move to SECURITY DEFINER RPCs |
| C-005 | supabase/migrations/20260512_live_map_presence_server_time.sql:44 | SECURITY DEFINER without search_path | Add SET search_path = public, pg_temp; mark STABLE |
| C-007 | use-create-broadcast.js, use-messages.js | No Background Sync — Bike Down alerts lost | Implement Background Sync API + IndexedDB queue |
| C-015 | src/features/auth/pages/OnboardingPage.jsx | File upload no type/size validation | Add whitelist + size limit before processing |

### HIGH (18)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-001 | src/App.jsx:84-108 | Client-side only route guards | Add server-side session validation gate |
| H-002 | src/features/auth/pages/LoginPage.jsx:54-70 | Password recovery without session verification | Verify recovery-type session before update |
| H-003 | src/features/auth/api/auth-api.js:146-152 | Open redirect in linkOAuthProvider | Validate redirectTo against allowlist |
| H-004 | src/features/auth/components/LoginForm.jsx:92-148 | No rate limiting on auth endpoints | Client-side + server-side rate limiting |
| H-005 | index.html | Missing CSP | Add CSP meta tag |
| H-006 | index.html | Missing X-Frame-Options | Add frame-ancestors 'none' or meta tag |
| H-007 | src/lib/image-utils.js:247 | User-controlled image URLs without origin validation | Validate against origin allowlist |
| H-008 | src/App.jsx:134-169 | Onboarding guard leaks layout during loading | Return spinner/null instead of full layout |
| H-009 | supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql | RPC trusts client for block list | Look up blocked users server-side with auth.uid() |
| H-010 | Various | Storage buckets without RLS | Add storage RLS policies tied to auth.uid() |
| H-035 | supabase/migrations/* | No DELETE policy for messages | Add DELETE policy for authors/participants |
| H-043 | 6 files | AvatarWithStatus.jsx missing | Create file or update imports |
| H-050 | src/features/chat/hooks/use-conversations.js:55-63 | Conversation INSERT doesn't check blocked users | Check blocked IDs before processing INSERT |

---

## 2. Performance (84 total)

**Top Files:** `src/providers/ViewportProvider.jsx`, `src/features/auth/hooks/use-auth.js`, `src/features/map/components/LiveMapMapLibre.jsx`, `src/features/chat/pages/ConversationPage.jsx`, `src/hooks/use-app-resume-refresh.js`

### CRITICAL (6)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-008 | src/features/auth/hooks/use-auth.js:65-236 | Auth bypasses TanStack Query | Convert profile to useQuery |
| C-009 | src/providers/ViewportProvider.jsx:58-64 | Context value inline — cascading re-renders | Wrap in useMemo |
| C-011 | src/features/broadcast/pages/BroadcastDetailPage.jsx:915,1024,454 | Raw `<img>` tags | Use OptimizedImage/OptimizedAvatar |
| C-017 | src/features/admin/api/admin-api.js:164-180 | Client-side RSVP count | Use DB aggregation or count RPC |
| C-019 | src/features/map/components/LiveMapMapLibre.jsx:238 | Link never imported — runtime crash | Import Link or use useNavigate |

### HIGH (22)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-011 | src/hooks/use-app-resume-refresh.js:55-60 | Thundering herd (19 queries) | Stagger invalidations |
| H-012 | src/features/chat/hooks/use-messages.js:23 | Message query key includes user.id | Remove user?.id from key |
| H-013 | src/features/map/hooks/use-live-map.js:110-137 | Duplicate settings query | Reuse shared useSettings hook |
| H-014 | src/features/broadcast/api/broadcast-api.js:72 | N+1 for Bike Down check | Create single-broadcast visibility RPC |
| H-015 | RadarOverlay.jsx:562, ConversationPage.jsx:436-439, LiveMapMapLibre.jsx:951-955 | Inline callbacks/objects | useCallback + useMemo |
| H-016 | LiveMapMapLibre.jsx:448,875,879 | Marker layer rebuilt on GPS | Use refs for GPS in callbacks |
| H-017 | src/index.css:1-2 | Render-blocking Google Fonts @import | Use `<link rel="preload">` |
| H-018 | src/lib/sentry.js:1 | Full Sentry namespace import | Named imports only |
| H-032 | src/features/profile/api/posts-api.js:22-39 | getUserPosts no limit | Add .limit(50) + pagination |
| H-033 | src/features/connections/api/connections-api.js:238-244 | getFriendships no limit | Add .limit(100) + cursor |
| H-036 | src/features/profile/hooks/use-profile.js:50-51 | Profile invalidation too narrow | Invalidate all dependent keys |
| H-037 | src/features/map/hooks/use-live-map.js:159-160,177 | Presence polling without visibility check | Check visibilityState + onLine |
| H-042 | src/features/notifications/hooks/use-notifications.js:218-229 | useMarkRead over-broad targeting | Scope to ['notifications', userId] |

---

## 3. PWA / Mobile (53 total)

**Top Files:** `vite.config.js`, `src/hooks/use-pull-to-refresh.js`, `src/features/broadcast/hooks/use-create-broadcast.js`, `public/manifest.json`, `src/hooks/use-body-scroll-lock.js`

### CRITICAL (6)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-006 | vite.config.js:174 | No offline fallback page | Create public/offline.html |
| C-007 | use-create-broadcast.js, use-messages.js | No Background Sync | Implement Background Sync + IndexedDB queue |
| C-010 | src/features/profile/components/PostDetailSheet.jsx:25 | Scroll lock trap | useBodyScrollLock(!!post) |
| C-018 | public/ directory | All icon files missing | Generate and add all required icons |

### HIGH (11)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-019 | vite.config.js:84-176 | No Stale-While-Revalidate | Add StaleWhileRevalidate strategy |
| H-020 | registerSW.js:22-33, vite.config.js:85 | SW auto-reload loses data | Show update prompt, confirm before reload |
| H-021 | index.html | Missing apple-mobile-web-app-capable | Add meta tag |
| H-022 | index.html | Missing Apple touch startup images | Add startup-image links |
| H-023 | public/manifest.json | Missing share_target | Add share_target for /broadcast |
| H-024 | src/components/layout/BottomSheet.jsx:154 | Non-standard env(keyboard-inset-height) | Use useViewportContext keyboardHeight |
| H-025 | src/features/profile/components/PostCreateSheet.jsx | No keyboard avoidance | Consume useViewportContext |
| H-026 | src/hooks/use-body-scroll-lock.js | Missing html overflow lock | Also set document.documentElement overflow |
| H-040 | src/hooks/use-pull-to-refresh.js:52-58 | Pull-to-refresh offline | Check navigator.onLine first |

---

## 4. UI / UX (58 total)

**Top Files:** `src/index.css`, `src/components/shared/LocationDisclosureDialog.jsx`, `src/features/auth/components/LoginForm.jsx`, `src/components/layout/AppHeader.jsx`, `src/features/broadcast/components/LocationPickerMap.jsx`

### CRITICAL (5)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-016 | src/index.css | Missing prefers-reduced-motion | Wrap animations in @media query |

### HIGH (20)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-027 | src/components/layout/AppHeader.jsx:253-318 | Touch targets below 44px | Change to min-w-[44px] min-h-[44px] |
| H-028 | src/features/broadcast/components/RadarOverlay.jsx:425-445 | Draggable pad handle 24px tall | Increase to h-11 (44px) |
| H-029 | src/components/shared/LocationDisclosureDialog.jsx:53-116 | Modal lacks focus trap/ARIA | Add role, aria-modal, focus trap, Escape |
| H-030 | src/features/broadcast/components/LocationPickerMap.jsx:63-105 | Map pin mouse-only | Add keyboard arrow controls |
| H-031 | src/features/auth/components/LoginForm.jsx:215-256 | Tablist missing ARIA | Complete ARIA tab pattern |
| H-038 | src/features/profile/components/ProfileEditForm.jsx:321-336 | Username status not announced | Add aria-live="polite" |
| H-039 | src/features/auth/components/LoginForm.jsx:302 | Password toggle tabIndex=-1 | Remove tabIndex or provide alternative |
| H-048 | BroadcastForm, PostCreateSheet | No success toast | Add success toast on submit |

---

## 5. Supabase / Database (72 total)

**Top Files:** `supabase/migrations/*`, `src/features/admin/api/admin-api.js`, `src/features/broadcast/api/broadcast-api.js`, `src/features/profile/api/posts-api.js`, `src/features/connections/api/connections-api.js`

### CRITICAL (10)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-003 | supabase/migrations/* | Tables without RLS | Add RLS policies |
| C-004 | src/features/admin/api/admin-api.js:183-189 | Client-side admin only | SECURITY DEFINER RPCs |
| C-005 | supabase/migrations/20260512_live_map_presence_server_time.sql:44 | SECURITY DEFINER without search_path | Add search_path, mark STABLE |
| C-017 | src/features/admin/api/admin-api.js:164-180 | Client-side count | Use DB aggregation |

### HIGH (21)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-009 | supabase/migrations/20260510_get_nearby_broadcasts_rpc.sql | RPC trusts client block list | Server-side auth.uid() lookup |
| H-010 | Various | Storage buckets without RLS | Add storage RLS |
| H-014 | src/features/broadcast/api/broadcast-api.js:72 | N+1 Bike Down check | Dedicated single-broadcast RPC |
| H-032 | src/features/profile/api/posts-api.js:22-39 | No limit on getUserPosts | .limit(50) + pagination |
| H-033 | src/features/connections/api/connections-api.js:238-244 | No limit on getFriendships | .limit(100) + cursor |
| H-034 | src/features/admin/api/admin-api.js:898-901 | Fetches up to 10,000 IDs | Batch processing or server function |
| H-035 | supabase/migrations/* | No DELETE policy for messages | Add DELETE policy |
| H-041 | src/features/broadcast/api/broadcast-api.js:223-229 | No limit on getEventRsvps | .limit(100) + pagination |
| H-050 | src/features/chat/hooks/use-conversations.js:55-63 | INSERT doesn't check blocked | Check blocked IDs |

---

## 6. Error Handling / Edge Cases (107 total)

**Top Files:** `src/features/broadcast/api/broadcast-api.js`, `src/features/auth/hooks/use-auth.js`, `src/features/chat/api/chat-api.js`, `src/lib/geocoding.js`, `src/lib/image-utils.js`

### CRITICAL (11)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| C-012 | src/features/broadcast/api/broadcast-api.js:131 | hardDeleteBroadcast throws | Return { data: null, error } |
| C-013 | src/features/auth/hooks/use-auth.js:372-386 | Sign-out clears state before API | Clear after success; add rollback |
| C-014 | src/features/broadcast/hooks/use-create-broadcast.js:179 | Promise.all uploads no error handling | try/catch + cleanup per upload |
| C-015 | src/features/auth/pages/OnboardingPage.jsx | No file type/size validation | Add validation before processing |

### HIGH (32)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-046 | broadcast-api.js, chat-api.js, profile-api.js | Inconsistent error patterns | Standardize on return { data, error } |
| H-047 | src/lib/geocoding.js, src/lib/image-utils.js | No retry for external APIs | Exponential backoff retry |

---

## 7. Code Quality (86 total)

**Top Files:** AvatarWithStatus.jsx refs, `use-live-map.js` + `use-radar-location.js`, `featureFlags.js`, multiple UI primitives

### HIGH (10)
| ID | File | Finding | Fix |
|----|------|---------|-----|
| H-043 | 6 files | AvatarWithStatus.jsx missing | Create or update imports |
| H-044 | use-live-map.js:42 + use-radar-location.js:15 | Duplicate distanceMeters | Extract to src/lib/geo.js |
| H-045 | use-create-broadcast.js, admin-api.js, EditEventDialog.jsx, BroadcastForm.jsx | Duplicate normalizeLocationText | Extract to src/lib/utils.js |
| H-046 | broadcast-api.js, chat-api.js, profile-api.js | Inconsistent error patterns | Standardize |
| H-049 | src/hooks/use-profile-batch.js:55-75 | Ref mutation anti-pattern | Use state or useEffect |

### MEDIUM (36) — Themes
- Unused imports/variables
- Cross-feature coupling
- Prop spreading without validation
- Magic numbers

### LOW (40) — Themes
- Production console.log statements
- Background color inconsistencies
- Dead code removal
- Minor query optimizations
