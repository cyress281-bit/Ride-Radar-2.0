---
name: Code splitting and lazy loading implementation
description: Route-level code splitting with React.lazy, Suspense, ChunkErrorBoundary, and Vite manual chunks — reduces initial bundle from ~400KB to ~24KB entry + vendor-react/supabase on demand
type: project
---

Comprehensive code splitting implemented on 2026-05-06.

**Architecture:**
- All page routes in App.jsx use React.lazy() for dynamic imports
- Only SupabaseLogin and Layout are eagerly loaded (needed for auth flow)
- RadarMapView inside Home.jsx is also lazy-loaded (defers Leaflet ~150KB)
- Leaflet CSS moved from main.jsx global import to co-located inside RadarMapView.jsx
- ChunkErrorBoundary wraps Suspense to handle chunk load failures gracefully
- PageLoadingSpinner is the shared Suspense fallback
- preloadCoreRoutes() called after login success to warm the cache

**Vite manual chunks (vite.config.js):**
- vendor-react: react + react-dom + react-router (~163KB)
- vendor-supabase: @supabase/supabase-js (~202KB)
- vendor-leaflet: leaflet + react-leaflet (~151KB) — only loaded on map view
- vendor-query: @tanstack/react-query (~40KB)
- vendor-radix: all Radix UI primitives (~77KB)
- pages-admin: all 9 admin pages bundled together (~80KB)

**Results:**
- Entry JS: ~24KB (index chunk — just routing skeleton + auth context)
- Each page chunk: 2-17KB
- Leaflet only loaded when user opens map tab
- Admin pages only loaded if user navigates to /admin/*

**Why:** Initial bundle was ~400KB eagerly loading all routes. Users on /login were downloading Home, Messages, Broadcast, Map (Leaflet), and 9 admin pages they would never visit.

**How to apply:** When adding new pages, always use React.lazy() in App.jsx. Heavy third-party libraries should be co-located with their consuming component via lazy loading, not imported globally.
