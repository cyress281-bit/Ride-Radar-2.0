---
name: Image Optimization System
description: Comprehensive image optimization with WebP conversion, multi-size responsive uploads, blur-up placeholders, and OptimizedImage component
type: project
---

Implemented image optimization system on 2026-05-06. Key components:

- `src/lib/imageOptimization.js` — Core utilities: WebP detection/conversion, multi-size generation (150/400/800/1200px), blur placeholder (20px base64), Supabase Storage URL helpers
- `src/components/OptimizedImage.jsx` — Reusable component with blur-up fade-in, lazy loading, skeleton loader, error retry, srcset support
- `src/lib/localImageUpload.js` — Updated to use WebP conversion and optional multi-size upload; backward compatible with legacy single-URL format

**Why:** Images are the heaviest assets in the app (avatars, bike photos, event posters, alert images). Client-side WebP conversion reduces transfer size ~30%. Multi-size variants prevent oversized images on small viewports. Blur placeholders eliminate layout shift and improve perceived performance.

**How to apply:** All new image displays should use `<OptimizedImage>` component. The upload flow automatically converts to WebP and generates responsive sizes. Legacy URLs (plain strings) are handled transparently — no migration of existing data required.

Pre-existing build issues: `web-vitals`, `plausible-tracker`, `@sentry/react` are missing from node_modules but referenced in analytics/monitoring files. These are unrelated to image optimization.
