# Audit Findings Cross-Reference by File

> Generated mapping of every audited source file to its findings.  
> **Scoring:** CRITICAL = 10 pts | HIGH = 5 pts | MEDIUM = 2 pts | LOW = 1 pt

---

## Summary Table

| Rank | File | Critical | High | Medium | Low | Risk Score |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 1 | `src/features/admin/api/admin-api.js` | 2 | 3 | 0 | 0 | **35** |
| 2 | `supabase/migrations/*` | 2 | 2 | 0 | 0 | **30** |
| 3 | `src/lib/supabase.js` | 2 | 1 | 0 | 0 | **25** |
| 4 | `src/features/auth/hooks/use-auth.js` | 2 | 1 | 0 | 0 | **25** |
| 5 | `src/features/broadcast/hooks/use-create-broadcast.js` | 2 | 1 | 0 | 0 | **25** |
| 6 | `src/features/broadcast/api/broadcast-api.js` | 1 | 3 | 0 | 0 | **25** |
| 7 | `src/App.jsx` | 1 | 2 | 0 | 0 | **20** |
| 8 | `src/features/map/components/LiveMapMapLibre.jsx` | 1 | 2 | 0 | 0 | **20** |
| 9 | `vite.config.js` | 1 | 2 | 0 | 0 | **20** |
| 10 | `index.html` | 0 | 4 | 0 | 0 | **20** |
| 11 | `src/features/chat/hooks/use-messages.js` | 1 | 1 | 0 | 0 | **15** |
| 12 | `src/features/notifications/hooks/use-notifications.js` | 1 | 1 | 0 | 0 | **15** |
| 13 | `src/index.css` | 1 | 1 | 0 | 0 | **15** |
| 14 | `public/manifest.json` | 1 | 1 | 0 | 0 | **15** |
| 15 | `src/features/auth/components/LoginForm.jsx` | 0 | 3 | 0 | 0 | **15** |
| 16 | `src/features/map/hooks/use-live-map.js` | 0 | 3 | 0 | 0 | **15** |
| 17 | `src/features/auth/pages/OnboardingPage.jsx` | 1 | 0 | 0 | 0 | **10** |
| 18 | `src/providers/ViewportProvider.jsx` | 1 | 0 | 0 | 0 | **10** |
| 19 | `src/features/profile/components/PostDetailSheet.jsx` | 1 | 0 | 0 | 0 | **10** |
| 20 | `src/features/broadcast/pages/BroadcastDetailPage.jsx` | 1 | 0 | 0 | 0 | **10** |
| 21 | `src/lib/image-utils.js` | 0 | 2 | 0 | 0 | **10** |
| 22 | `src/features/broadcast/components/RadarOverlay.jsx` | 0 | 2 | 0 | 0 | **10** |
| 23 | `src/features/profile/components/PostCreateSheet.jsx` | 0 | 2 | 0 | 0 | **10** |
| 24 | `src/features/broadcast/components/BroadcastForm.jsx` | 0 | 2 | 0 | 0 | **10** |
| 25 | `src/features/auth/pages/LoginPage.jsx` | 0 | 1 | 0 | 0 | **5** |
| 26 | `src/features/auth/api/auth-api.js` | 0 | 1 | 0 | 0 | **5** |
| 27 | `src/hooks/use-app-resume-refresh.js` | 0 | 1 | 0 | 0 | **5** |
| 28 | `src/features/chat/pages/ConversationPage.jsx` | 0 | 1 | 0 | 0 | **5** |
| 29 | `src/lib/sentry.js` | 0 | 1 | 0 | 0 | **5** |
| 30 | `src/lib/registerSW.js` | 0 | 1 | 0 | 0 | **5** |
| 31 | `src/components/layout/BottomSheet.jsx` | 0 | 1 | 0 | 0 | **5** |
| 32 | `src/hooks/use-body-scroll-lock.js` | 0 | 1 | 0 | 0 | **5** |
| 33 | `src/components/layout/AppHeader.jsx` | 0 | 1 | 0 | 0 | **5** |
| 34 | `src/components/shared/LocationDisclosureDialog.jsx` | 0 | 1 | 0 | 0 | **5** |
| 35 | `src/features/broadcast/components/LocationPickerMap.jsx` | 0 | 1 | 0 | 0 | **5** |
| 36 | `src/features/profile/api/posts-api.js` | 0 | 1 | 0 | 0 | **5** |
| 37 | `src/features/connections/api/connections-api.js` | 0 | 1 | 0 | 0 | **5** |
| 38 | `src/features/profile/hooks/use-profile.js` | 0 | 1 | 0 | 0 | **5** |
| 39 | `src/features/profile/components/ProfileEditForm.jsx` | 0 | 1 | 0 | 0 | **5** |
| 40 | `src/hooks/use-pull-to-refresh.js` | 0 | 1 | 0 | 0 | **5** |
| 41 | `src/hooks/use-profile-batch.js` | 0 | 1 | 0 | 0 | **5** |
| 42 | `src/features/chat/hooks/use-conversations.js` | 0 | 1 | 0 | 0 | **5** |
| 43 | `src/hooks/use-radar-location.js` | 0 | 1 | 0 | 0 | **5** |
| 44 | `src/features/chat/api/chat-api.js` | 0 | 1 | 0 | 0 | **5** |
| 45 | `src/features/profile/api/profile-api.js` | 0 | 1 | 0 | 0 | **5** |
| 46 | `src/lib/geocoding.js` | 0 | 1 | 0 | 0 | **5** |
| 47 | `6 files referencing AvatarWithStatus.jsx` | 0 | 1 | 0 | 0 | **5** |

---

## Detailed Findings by File

### `src/features/admin/api/admin-api.js`
**Risk Score: 35** | 2 Critical, 3 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-004 | **CRITICAL** | 183-189 | Admin API Client-Side Only — Privilege Escalation |
| C-017 | **CRITICAL** | 164-180 | getEventRsvpCounts Client-Side Count — Data Transfer |
| H-034 | HIGH | 898-901 | sendAnnouncement Fetches Up to 10,000 User IDs |
| H-045 | HIGH | — | Duplicate normalizeLocationText() Function |
| H-046 | HIGH | — | Inconsistent Error Patterns Across API Files |

---

### `supabase/migrations/*`
**Risk Score: 30** | 2 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-003 | **CRITICAL** | — | Tables Without RLS — Data Exposure |
| C-005 | **CRITICAL** | — | get_live_map_presence() Security Definer Without search_path |
| H-009 | HIGH | — | getNearbyBroadcasts Trusts Client for Block List |
| H-035 | HIGH | — | No DELETE Policy for Messages |

---

### `src/lib/supabase.js`
**Risk Score: 25** | 2 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-001 | **CRITICAL** | 29-53 | JWT Tokens Stored in localStorage — XSS Token Theft |
| C-002 | **CRITICAL** | 2 | Missing capacitor-storage.js Module — Auth Crash |
| H-010 | HIGH | — | Storage Buckets Without RLS Policies (related) |

---

### `src/features/auth/hooks/use-auth.js`
**Risk Score: 25** | 2 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-008 | **CRITICAL** | 65-236 | Auth Provider Bypasses TanStack Query |
| C-013 | **CRITICAL** | 372-386 | Sign-Out Clears State Before API Call — No Rollback |
| H-046 | HIGH | — | Inconsistent Error Patterns Across API Files |

---

### `src/features/broadcast/hooks/use-create-broadcast.js`
**Risk Score: 25** | 2 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-014 | **CRITICAL** | 179 | Promise.all Photo Uploads Have No Error Handling |
| C-007 | **CRITICAL** | — | No Background Sync — Bike Down Alerts Lost Offline |
| H-045 | HIGH | — | Duplicate normalizeLocationText() Function |

---

### `src/features/broadcast/api/broadcast-api.js`
**Risk Score: 25** | 1 Critical, 3 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-012 | **CRITICAL** | 131 | hardDeleteBroadcast Throws Instead of Returning Error |
| H-014 | HIGH | 72 | N+1 Broadcast Query for Bike Down Check |
| H-041 | HIGH | 223-229 | Missing limit() on Event RSVPs |
| H-046 | HIGH | — | Inconsistent Error Patterns Across API Files |

---

### `src/App.jsx`
**Risk Score: 20** | 1 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-008 | **CRITICAL** | — | Auth Provider Bypasses TanStack Query (related to auth routing) |
| H-001 | HIGH | 84-108 | Client-Side Only Route Guards — Stale Session Access |
| H-008 | HIGH | 134-169 | Onboarding Guard Leaks Layout During Loading |

---

### `src/features/map/components/LiveMapMapLibre.jsx`
**Risk Score: 20** | 1 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-019 | **CRITICAL** | 238 | Link Component Used But Never Imported — Runtime Crash |
| H-015 | HIGH | 951-955 | Inline Objects/Functions Causing Re-renders |
| H-016 | HIGH | 448, 875, 879 | Marker Layer Rebuilt on GPS Updates |

---

### `vite.config.js`
**Risk Score: 20** | 1 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-006 | **CRITICAL** | 174 | No Offline Fallback Page — Deep Links Fail Offline |
| H-019 | HIGH | 84-176 | No Stale-While-Revalidate Strategy |
| H-020 | HIGH | — | SW Update Auto-Reload Can Lose User Data (related) |

---

### `index.html`
**Risk Score: 20** | 0 Critical, 4 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-005 | HIGH | — | Missing Content Security Policy (CSP) |
| H-006 | HIGH | — | Missing X-Frame-Options / Clickjacking Protection |
| H-021 | HIGH | — | Missing apple-mobile-web-app-capable Meta Tag |
| H-022 | HIGH | — | Missing Apple Touch Startup Image |

---

### `src/features/chat/hooks/use-messages.js`
**Risk Score: 15** | 1 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-007 | **CRITICAL** | — | No Background Sync — Bike Down Alerts Lost Offline (related) |
| H-012 | HIGH | 23 | Message Query Key Includes user.id — Self-Inflicted Cache Invalidation |

---

### `src/features/notifications/hooks/use-notifications.js`
**Risk Score: 15** | 1 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-020 | **CRITICAL** | 63 | Stale Notification Settings in Shared Realtime Channel |
| H-042 | HIGH | 218-229 | useMarkRead Over-Broad Query Targeting |

---

### `src/index.css`
**Risk Score: 15** | 1 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-016 | **CRITICAL** | — | Missing prefers-reduced-motion Support |
| H-017 | HIGH | 1-2 | Render-Blocking Google Fonts @import |

---

### `public/manifest.json`
**Risk Score: 15** | 1 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-018 | **CRITICAL** | — | All Icon Files Missing from public/ Directory |
| H-023 | HIGH | — | Missing share_target for Social App |

---

### `src/features/auth/components/LoginForm.jsx`
**Risk Score: 15** | 0 Critical, 3 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-004 | HIGH | 92-148 | No Rate Limiting on Auth Endpoints |
| H-031 | HIGH | 215-256 | Custom Tablist Missing ARIA Controls |
| H-039 | HIGH | 302 | Password Visibility Toggle Inaccessible to Keyboard |

---

### `src/features/map/hooks/use-live-map.js`
**Risk Score: 15** | 0 Critical, 3 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-013 | HIGH | 110-137 | Duplicate Settings Query in Live Map |
| H-037 | HIGH | 159-160, 177 | Presence Polling Without Visibility Check |
| H-044 | HIGH | 42 | Duplicate distanceMeters() Implementation |

---

### `src/features/auth/pages/OnboardingPage.jsx`
**Risk Score: 10** | 1 Critical, 0 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-015 | **CRITICAL** | — | File Upload No Type/Size Pre-validation |

---

### `src/providers/ViewportProvider.jsx`
**Risk Score: 10** | 1 Critical, 0 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-009 | **CRITICAL** | 58-64 | ViewportProvider Context Value Inline — Cascading Re-renders |

---

### `src/features/profile/components/PostDetailSheet.jsx`
**Risk Score: 10** | 1 Critical, 0 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-010 | **CRITICAL** | 25 | Scroll Lock Trap in PostDetailSheet |

---

### `src/features/broadcast/pages/BroadcastDetailPage.jsx`
**Risk Score: 10** | 1 Critical, 0 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| C-011 | **CRITICAL** | 915, 1024, 454 | Broadcast Detail Page Uses Raw `<img>` Tags |

---

### `src/lib/image-utils.js`
**Risk Score: 10** | 0 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-007 | HIGH | 247 | User-Controlled Image URLs Without Origin Validation |
| H-047 | HIGH | — | No Retry Logic for External APIs |

---

### `src/features/broadcast/components/RadarOverlay.jsx`
**Risk Score: 10** | 0 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-015 | HIGH | 562 | Inline Objects/Functions Causing Re-renders |
| H-028 | HIGH | 425-445 | Draggable Pad Handle Only 24px Tall |

---

### `src/features/profile/components/PostCreateSheet.jsx`
**Risk Score: 10** | 0 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-025 | HIGH | — | No Keyboard Avoidance in PostCreateSheet |
| H-048 | HIGH | — | No Success Toast After Critical Actions |

---

### `src/features/broadcast/components/BroadcastForm.jsx`
**Risk Score: 10** | 0 Critical, 2 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-045 | HIGH | — | Duplicate normalizeLocationText() Function |
| H-048 | HIGH | — | No Success Toast After Critical Actions |

---

### `src/features/auth/pages/LoginPage.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-002 | HIGH | 54-70 | Password Recovery Without Session Verification |

---

### `src/features/auth/api/auth-api.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-003 | HIGH | 146-152 | Open Redirect in linkOAuthProvider |

---

### `src/hooks/use-app-resume-refresh.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-011 | HIGH | 55-60 | App Resume Thundering Herd |

---

### `src/features/chat/pages/ConversationPage.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-015 | HIGH | 436-439 | Inline Objects/Functions Causing Re-renders |

---

### `src/lib/sentry.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-018 | HIGH | 1 | Full Sentry Namespace Import |

---

### `src/lib/registerSW.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-020 | HIGH | 22-33 | SW Update Auto-Reload Can Lose User Data |

---

### `src/components/layout/BottomSheet.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-024 | HIGH | 154 | Non-Standard CSS env(keyboard-inset-height) |

---

### `src/hooks/use-body-scroll-lock.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-026 | HIGH | — | Missing html Overflow Lock for iOS |

---

### `src/components/layout/AppHeader.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-027 | HIGH | 253-318 | Touch Targets Below 44x44px Minimum |

---

### `src/components/shared/LocationDisclosureDialog.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-029 | HIGH | 53-116 | Modal Lacks Focus Trap and ARIA |

---

### `src/features/broadcast/components/LocationPickerMap.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-030 | HIGH | 63-105 | Map Pin Placement Mouse-Only |

---

### `src/features/profile/api/posts-api.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-032 | HIGH | 22-39 | getUserPosts No Limit — Memory Risk |

---

### `src/features/connections/api/connections-api.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-033 | HIGH | 238-244 | getFriendships No Limit |

---

### `src/features/profile/hooks/use-profile.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-036 | HIGH | 50-51 | Profile Update Invalidation Too Narrow |

---

### `src/features/profile/components/ProfileEditForm.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-038 | HIGH | 321-336 | Username Availability Not Announced to Screen Readers |

---

### `src/hooks/use-pull-to-refresh.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-040 | HIGH | 52-58 | Pull-to-Refresh Fires Unconditionally Offline |

---

### `src/hooks/use-profile-batch.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-049 | HIGH | 55-75 | useProfileBatch Ref Mutation Anti-Pattern |

---

### `src/features/chat/hooks/use-conversations.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-050 | HIGH | 55-63 | Conversation INSERT Handler Doesn't Check Blocked Users |

---

### `src/hooks/use-radar-location.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-044 | HIGH | 15 | Duplicate distanceMeters() Implementation |

---

### `src/features/chat/api/chat-api.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-046 | HIGH | — | Inconsistent Error Patterns Across API Files |

---

### `src/features/profile/api/profile-api.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-046 | HIGH | — | Inconsistent Error Patterns Across API Files |

---

### `src/lib/geocoding.js`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-047 | HIGH | — | No Retry Logic for External APIs |

---

### `6 files referencing AvatarWithStatus.jsx`
**Risk Score: 5** | 0 Critical, 1 High

| ID | Severity | Lines | Summary |
|:---|:---:|:---|:---|
| H-043 | HIGH | — | AvatarWithStatus.jsx — Missing File |

---

*End of cross-reference.*
