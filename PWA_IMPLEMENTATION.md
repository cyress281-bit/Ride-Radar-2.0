# PWA Implementation Guide - Ride Radar 2.0

## Overview

Ride Radar is now a fully functional Progressive Web App (PWA) with offline support, installability, and background sync capabilities.

## Features Implemented

### 1. Service Worker & Offline Support

**Location:** Configured in `vite.config.js` via `vite-plugin-pwa`

**Caching Strategies:**

- **Static Assets** (JS, CSS, HTML, images, fonts): `CacheFirst` with precaching
- **Supabase REST API**: `NetworkFirst` with 10s timeout, falls back to cache
  - Cache expires after 24 hours
  - Max 100 entries
- **Supabase Storage** (avatars, bike photos, event images): `CacheFirst`
  - Cache expires after 30 days
  - Max 200 entries
- **Google Fonts**: `CacheFirst` with 1 year expiration

**Excluded from Caching:**
- `/admin/*` routes (admin pages load fresh data)
- WebSocket real-time connections (`/realtime`)
- API endpoints (`/api`, `/__`)

**Service Worker Registration:**
- Auto-registration in `src/main.jsx`
- Update detection with user prompt
- Install prompt capture for "Add to Home Screen"

### 2. PWA Manifest

**Location:** `public/manifest.json`

**Configuration:**
- Name: "Ride Radar"
- Theme color: `#beff00` (neon green)
- Background: `#080808` (dark)
- Display: `standalone` (looks like native app)
- Start URL: `/home`
- Orientation: `portrait-primary` (mobile-first)

**Icons:**
- 192x192px (any maskable)
- 512x512px (any maskable)
- Source: `public/icon.svg`

**App Shortcuts:**
1. Create Broadcast → `/broadcast`
2. Messages → `/messages`

### 3. Offline Detection & UI

**Hook:** `src/hooks/useOnlineStatus.js`
- Detects online/offline state
- Listens to `online` and `offline` events

**Banner:** `src/components/OfflineBanner.jsx`
- Shows "You're offline - viewing cached data" when disconnected
- Shows "Back online!" briefly when reconnected
- Animated slide-in from top
- Positioned above all content (z-index: 50)

**Fallback Page:** `src/components/OfflineFallback.jsx`
- Shown when navigation fails offline
- Lists offline capabilities
- "Try Again" and "Go to Home" actions

### 4. Install Prompt

**Hook:** `src/hooks/usePWAInstall.js`
- Tracks install state (`isInstallable`, `isInstalled`)
- Triggers install prompt programmatically

**UI Integration:** `src/pages/Settings.jsx`
- "Install Ride Radar App" button (when installable)
- "App Installed" badge (when installed)
- "Enable Push Notifications" button

**Platform Detection:**
- Captures `beforeinstallprompt` event
- Detects standalone mode
- Tracks installation date in localStorage

### 5. Offline Queue

**Hook:** `src/hooks/useOfflineQueue.js`
- Queues mutations when offline
- Processes queue when back online
- Persists queue in localStorage
- Auto-retry with 24-hour expiration

**Message Queue:** `useMessageQueue()` specialization
- Automatically queues messages sent while offline
- Syncs messages when reconnected
- Shows queued message count

### 6. React Query Offline Config

**Location:** `src/lib/query-client.js`

**Changes:**
- `networkMode: 'offlineFirst'` for queries and mutations
- Custom retry logic (don't retry if offline)
- Stale data served when offline
- Mutations queued automatically

### 7. Push Notifications (Infrastructure)

**Location:** `src/lib/registerSW.js`

**Functions:**
- `requestPushPermission(userId)` - Request notification permission
- `subscribeToPush(userId)` - Subscribe to push with VAPID key
- `unsubscribePush()` - Unsubscribe from push

**TODO (Backend):**
- Set up Supabase Edge Function for push notifications
- Generate VAPID keys
- Store push tokens in `user_settings.push_token` column
- Implement notification sending logic

## Installation

### 1. Install Dependencies

```bash
npm install
```

New packages added:
- `vite-plugin-pwa@^0.21.2`
- `workbox-window@^7.3.0`

### 2. Generate PWA Icons

**Option A: Browser-based (Recommended)**

1. Open `public/create-icon-placeholders.html` in a browser
2. Click "Download 192x192" and "Download 512x512"
3. Save as `public/icon-192.png` and `public/icon-512.png`

**Option B: ImageMagick (if installed)**

```bash
convert -density 300 -background none public/icon.svg -resize 192x192 public/icon-192.png
convert -density 300 -background none public/icon.svg -resize 512x512 public/icon-512.png
```

**Option C: Online Tool**

1. Go to https://cloudconvert.com/svg-to-png
2. Upload `public/icon.svg`
3. Export at 192x192 and 512x512

### 3. Build the App

```bash
npm run build
```

This generates:
- Service worker at `dist/sw.js`
- PWA manifest at `dist/manifest.json`
- Precached static assets
- Workbox runtime caching config

### 4. Preview PWA

```bash
npm run preview
```

Then open in browser and test:
1. Install prompt appears
2. App installs to home screen
3. Works offline after first visit
4. Cached data loads instantly

## Testing Checklist

### Offline Functionality

- [ ] **Initial Load**: Visit `/home` while online
- [ ] **Go Offline**: Disable network in DevTools (Network tab → Offline)
- [ ] **Cached Routes**: Navigate to `/messages`, `/broadcast`, `/profile`
- [ ] **Cached Images**: Avatars and images load from cache
- [ ] **Offline Banner**: "You're offline" banner appears at top
- [ ] **Send Message**: Queue message while offline
- [ ] **Go Online**: Re-enable network
- [ ] **Sync**: Queued message sends automatically
- [ ] **Online Banner**: "Back online!" shows briefly

### Installation

- [ ] **Desktop Chrome**: Install prompt appears, app installs
- [ ] **Mobile Safari (iOS)**: "Add to Home Screen" works
- [ ] **Mobile Chrome (Android)**: Install prompt appears
- [ ] **Standalone Mode**: App opens without browser chrome
- [ ] **App Shortcuts**: Long-press icon shows shortcuts (Android)
- [ ] **Settings Badge**: "App Installed" badge shows in Settings

### Service Worker Updates

- [ ] **New Version**: Make code change and rebuild
- [ ] **Update Prompt**: "New version available! Reload to update?" alert
- [ ] **Reload**: App reloads with new version
- [ ] **No Breaking**: Existing cached data still works

### Caching

- [ ] **API Responses**: Network first, falls back to cache
- [ ] **Images**: Cache first (avatars, bike photos)
- [ ] **Fonts**: Cached for 1 year
- [ ] **Admin Routes**: Not cached (always fresh)
- [ ] **Real-time**: WebSocket connections work (not cached)

## Production Deployment

### Vercel / Netlify

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Headers**: Add caching headers for service worker

Example `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

### HTTPS Required

PWAs require HTTPS in production. Service workers only work on:
- `https://*` domains
- `localhost` (development only)

### Manifest Validation

Test your PWA with:
- Chrome DevTools → Application → Manifest
- Lighthouse PWA audit (score should be 90+)
- https://www.pwabuilder.com/ (validation tool)

## File Structure

```
ride-radar-2.0/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icon.svg                   # Source icon
│   ├── icon-192.png              # 192x192 icon (generate)
│   ├── icon-512.png              # 512x512 icon (generate)
│   ├── create-icon-placeholders.html  # Icon generator
│   └── README-ICONS.md           # Icon generation guide
├── src/
│   ├── components/
│   │   ├── OfflineBanner.jsx     # Offline status banner
│   │   └── OfflineFallback.jsx   # Offline fallback page
│   ├── hooks/
│   │   ├── useOnlineStatus.js    # Online/offline detection
│   │   ├── usePWAInstall.js      # Install prompt hook
│   │   ├── useOfflineQueue.js    # Offline mutation queue
│   │   └── useMessageQueue.js    # Message-specific queue
│   ├── lib/
│   │   ├── registerSW.js         # Service worker registration
│   │   └── query-client.js       # React Query with offline config
│   ├── pages/
│   │   └── Settings.jsx          # PWA install UI
│   ├── App.jsx                   # Offline banner integration
│   └── main.jsx                  # SW registration entry point
├── scripts/
│   ├── generate-icons.js         # Icon generation script
│   └── create-placeholder-icons.js  # Placeholder script
├── vite.config.js                # Vite + PWA plugin config
├── index.html                    # PWA meta tags
└── PWA_IMPLEMENTATION.md         # This file
```

## Browser Support

### Full PWA Support
- Chrome/Edge 90+ (Desktop & Mobile)
- Safari 16+ (iOS/macOS)
- Firefox 90+ (Desktop & Android)
- Samsung Internet 14+

### Partial Support
- Safari 15 (iOS) - Install prompt different
- UC Browser - Limited SW support

### No Support (Graceful Degradation)
- IE11 - Falls back to normal web app
- Opera Mini - No service worker

## Known Limitations

1. **iOS Safari**: "Add to Home Screen" requires manual user action (no install prompt)
2. **Push Notifications**: Require backend Edge Function (not implemented)
3. **Background Sync**: Only works when app is installed (not in browser tab)
4. **Offline Real-time**: Supabase subscriptions don't work offline (expected)
5. **Large Media**: Videos and large images may not cache (size limits)

## Troubleshooting

### Service Worker Not Registering

**Issue**: Console shows "Service worker registration failed"

**Solutions**:
- Ensure running on `https://` or `localhost`
- Check browser supports service workers
- Clear browser cache and hard reload (Ctrl+Shift+R)
- Check DevTools → Application → Service Workers

### Offline Banner Not Showing

**Issue**: Banner doesn't appear when offline

**Solutions**:
- Check Network tab in DevTools is set to "Offline"
- Verify `OfflineBanner` is rendered in `App.jsx`
- Check browser console for React errors

### Install Prompt Not Appearing

**Issue**: "Install App" button doesn't show

**Solutions**:
- PWA criteria must be met (manifest, service worker, icons)
- App must be loaded over HTTPS
- User hasn't dismissed prompt too many times
- Some browsers (Safari) don't support programmatic prompts

### Cached Data Not Loading

**Issue**: Pages fail offline despite being visited

**Solutions**:
- Visit pages while online first (precaching)
- Check DevTools → Application → Cache Storage
- Verify service worker is activated
- Check Workbox cache config in `vite.config.js`

## Future Enhancements

1. **Background Sync API**: Queue mutations in SW, not localStorage
2. **Push Notifications**: Full implementation with backend
3. **Periodic Sync**: Auto-refresh data in background (if installed)
4. **Share Target API**: Share rides from other apps
5. **Shortcuts**: Dynamic shortcuts for recent conversations
6. **Badging API**: Show unread message count on app icon

## Resources

- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Builder](https://www.pwabuilder.com/)

---

**Implementation Date**: May 6, 2026  
**Version**: 2.0.0  
**Status**: ✅ Complete
