# Vercel Hard-Refresh 404 Fix - Complete Guide

## Problem
Hard-refreshing nested routes (e.g., `/broadcast/1`) on Vercel deployment returns 404 errors because the server cannot find the static file for that route.

## Root Cause
SPAs (Single Page Applications) need the server to return `index.html` for all non-static routes. The old `vercel.json` config was correct but lacked explicit `cleanUrls` and `trailingSlash` settings which can cause edge cases.

## Solution Applied

### Changes Made to `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "trailingSlash": false,
  "cleanUrls": true
}
```

**What This Does:**
- `rewrites`: All requests (except static assets) → serve `/index.html`
- `cleanUrls: true`: Removes `.html` extensions and rewrites cleanly
- `trailingSlash: false`: Ensures `/broadcast/1/` becomes `/broadcast/1` (no trailing slash)

### Architecture Validation

✅ **Frontend Routing (App.jsx)**
- Uses `BrowserRouter` (correct for client-side routing)
- Routes defined in React Router handle nested routes like `/broadcast/:id`
- React Router intercepts navigation before hitting server

✅ **Service Worker (vite.config.js)**
- Workbox `navigateFallback: null` (CORRECT - lets Vercel handle routing)
- Denylist protects `/admin` and `/api` from being rewritten
- API calls and admin routes are safe

✅ **Vercel Configuration**
- Rewrite rule catches all routes and serves `index.html`
- Browser receives HTML, React Router takes over
- React Router reads URL and renders correct component

## Testing Instructions

### Step 1: Local Build & Preview
```bash
npm run build       # Creates optimized production bundle in dist/
npm run preview     # Starts local server on http://localhost:4173
```

### Step 2: Test Hard-Refresh on Nested Routes
Open in browser and hard-refresh (Ctrl+Shift+R or Cmd+Shift+R):

1. **http://localhost:4173/broadcast/1** - Should load BroadcastDetail component
2. **http://localhost:4173/messages** - Should load Messages component
3. **http://localhost:4173/profile/2** - Should load RiderProfile component
4. **http://localhost:4173/live-map** - Should load LiveMap component

**Expected Result**: 
- Page loads with no 404 error
- React Router renders the correct component
- Browser DevTools Network tab shows `index.html` returned with 200 status

### Step 3: Verify Static Assets Load
- DevTools Network tab should show CSS/JS files with 200 status
- No 404 errors in console except expected 3rd-party fonts/images

### Step 4: Deploy & Test on Vercel
1. Push feature branch: `git push -u origin feature/fix-vercel-refresh`
2. Vercel creates automatic preview deployment
3. Test same nested routes on preview URL: `https://ride-radar-xxx-manch.vercel.app/broadcast/1`
4. Hard-refresh should work without 404

## Git Workflow

### Option A: Use Provided Script (Windows)
```bash
cd Ride-Radar-2.0
fix-vercel-404.bat
```

### Option B: Manual Git Commands
```bash
# Create feature branch
git checkout -b feature/fix-vercel-refresh

# Stage changes
git add vercel.json

# Commit with descriptive message
git commit -m "fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings

- Add 'cleanUrls: true' to remove trailing slashes for consistent SPA routing
- Add 'trailingSlash: false' to ensure all nested routes resolve correctly
- vercel.json rewrite rule already catches all routes to /index.html
- This prevents hard-refresh 404 errors on nested routes like /broadcast/1
- Workbox navigateFallback is null (correct) - lets Vercel handle routing
- Admin and API routes are protected by service worker denylist"

# Push to remote
git push -u origin feature/fix-vercel-refresh

# Create PR on GitHub (or command line)
gh pr create --title "fix: Resolve Vercel hard-refresh 404s on nested routes" \
  --body "Fixes #XXX - Configure Vercel for proper SPA routing with cleanUrls and trailingSlash settings"
```

## Troubleshooting

### Issue: Still getting 404 on preview
**Solution:**
1. Check Vercel deployment logs: Settings → Deployments → Recent → View Logs
2. Ensure `vercel.json` is in root directory (not inside `src/`)
3. Manually redeploy: Vercel Dashboard → Deployments → Select failed one → Redeploy
4. Clear browser cache: DevTools → Settings → Disable cache (while DevTools open)

### Issue: CSS/JS files return 404
**Solution:**
1. This means rewrite rule is too broad
2. Check that Vite build output is in `dist/` folder
3. Verify `public/` assets are being copied to `dist/`
4. Check Vercel build output: "✓ Static files uploaded to Vercel"

### Issue: API calls broken after deploy
**Solution:**
1. Service worker denylist should protect `/api/*` routes
2. Add logging to check if API calls work locally vs production
3. Check Vercel Environment Variables are set correctly
4. Verify API base URL points to correct Supabase endpoint

## Performance Implications
- ✅ No performance impact - rewrites happen at Vercel edge level
- ✅ Browser cache still works - CSS/JS chunks cached by hash name
- ✅ Service worker still caches API responses and images

## Fallback Option: HashRouter
If Vercel rewrite still doesn't work:

Edit `src/App.jsx` line 5:
```javascript
// From:
import { BrowserRouter as Router, ... } from 'react-router-dom';

// To:
import { HashRouter as Router, ... } from 'react-router-dom';
```

This changes URLs from:
- `https://site.com/broadcast/1` → `https://site.com/#/broadcast/1`

HashRouter doesn't rely on server-side routing, but URLs look less clean.

## Verification Checklist
- [ ] `vercel.json` has `cleanUrls: true` and `trailingSlash: false`
- [ ] `rewrite` rule redirects `/(.*) → /index.html`
- [ ] `vite.config.js` has `navigateFallback: null` in Workbox
- [ ] `App.jsx` uses `BrowserRouter` (not HashRouter)
- [ ] Local preview test passes: nested routes load without 404
- [ ] Changes committed to `feature/fix-vercel-refresh` branch
- [ ] Vercel preview deployment passes tests
- [ ] PR created and reviewed before merging to main

## References
- [Vercel SPA Routing Docs](https://vercel.com/docs/concepts/projects/overview#framework-selection)
- [React Router Docs](https://reactrouter.com/)
- [Workbox navigateFallback](https://developer.chrome.com/docs/workbox/modules/workbox-build/)
