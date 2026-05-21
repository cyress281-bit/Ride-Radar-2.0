# PWA Testing Guide - Ride Radar 2.0

This guide walks through testing all PWA features to ensure everything works correctly.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate PWA icons:**
   - Use `public/icon.svg` as the source icon asset for regeneration
   - Download `icon-192.png` and `icon-512.png`
   - Save to `public/` directory

3. **Build the app:**
   ```bash
   npm run build
   ```

4. **Preview locally:**
   ```bash
   npm run preview
   ```
   App runs at `http://localhost:4173`

## Test 1: Offline Functionality

### Setup
1. Open app in Chrome/Edge
2. Log in to your account
3. Navigate to `/home`, `/messages`, `/profile` (visit each page)
4. Open DevTools (F12) → Network tab

### Test Steps
1. Set Network to "Offline" (dropdown in Network tab)
2. Refresh page
3. ✅ **Expected**: Page loads from cache, shows offline banner at top
4. Navigate to `/messages`
5. ✅ **Expected**: Messages page loads, previously viewed conversations show
6. Navigate to `/broadcast`
7. ✅ **Expected**: Page loads with cached data
8. Try to send a message
9. ✅ **Expected**: Message queued, toast shows "Message will send when online"
10. Set Network back to "Online"
11. ✅ **Expected**: "Back online!" banner shows briefly, queued message sends

### Verification
- [ ] Offline banner appears when disconnected
- [ ] Previously visited pages load offline
- [ ] Images load from cache
- [ ] Navigation works between cached pages
- [ ] Messages queue when sent offline
- [ ] Online banner appears when reconnected
- [ ] Queued messages send automatically

## Test 2: PWA Installation (Chrome Desktop)

### Test Steps
1. Open app in Chrome desktop
2. Look for install icon in address bar (⊕ or ⬇)
3. Click install icon OR go to Settings page
4. ✅ **Expected**: "Install Ride Radar App" button shows
5. Click install button
6. ✅ **Expected**: Install dialog appears
7. Click "Install" in dialog
8. ✅ **Expected**: App opens in standalone window (no browser UI)
9. Close app window
10. Open from Start Menu / Applications folder
11. ✅ **Expected**: App launches in standalone mode

### Verification
- [ ] Install prompt appears on first visit
- [ ] Settings page shows "Install App" button
- [ ] Installation succeeds
- [ ] App opens in standalone mode (no address bar)
- [ ] App appears in Start Menu / Applications
- [ ] Uninstall option available in browser settings

## Test 3: PWA Installation (Android Chrome)

### Test Steps
1. Open app on Android phone in Chrome
2. Wait for bottom sheet prompt OR tap ⋮ → "Install app"
3. ✅ **Expected**: Install prompt appears
4. Tap "Install"
5. ✅ **Expected**: App icon added to home screen
6. Tap home screen icon
7. ✅ **Expected**: App opens in fullscreen (no browser chrome)
8. Long-press app icon
9. ✅ **Expected**: Shortcuts menu shows "Create Broadcast" and "Messages"
10. Tap a shortcut
11. ✅ **Expected**: App opens to that page

### Verification
- [ ] Install prompt appears after criteria met
- [ ] App icon added to home screen
- [ ] App opens in fullscreen mode
- [ ] App shortcuts work (Android 7.1+)
- [ ] Back button works correctly
- [ ] Status bar matches theme color

## Test 4: PWA Installation (iOS Safari)

### Test Steps
1. Open app on iPhone in Safari
2. Tap Share button (⎙)
3. Scroll and tap "Add to Home Screen"
4. ✅ **Expected**: Preview shows icon and name
5. Tap "Add"
6. ✅ **Expected**: Icon appears on home screen
7. Tap home screen icon
8. ✅ **Expected**: App opens in fullscreen (no Safari UI)
9. Navigate through app
10. ✅ **Expected**: Navigation works, no Safari chrome

### Verification
- [ ] Add to Home Screen available
- [ ] Icon appears on home screen
- [ ] App opens in fullscreen
- [ ] Status bar shows (no Safari controls)
- [ ] Back/forward navigation works
- [ ] App doesn't open in Safari on subsequent launches

## Test 5: Service Worker Caching

### Setup
1. Open DevTools → Application tab
2. Select "Cache Storage" in sidebar

### Test Steps - API Caching
1. Navigate to `/home` (loads broadcasts)
2. In DevTools, expand "supabase-api-cache"
3. ✅ **Expected**: See cached API responses
4. Go offline (Network → Offline)
5. Navigate away and back to `/home`
6. ✅ **Expected**: Broadcasts load from cache

### Test Steps - Image Caching
1. View profiles with avatars
2. In Cache Storage, expand "supabase-storage-cache"
3. ✅ **Expected**: Avatar images cached
4. Go offline
5. Navigate to profile pages
6. ✅ **Expected**: Avatars load from cache

### Test Steps - Static Assets
1. In Cache Storage, expand "workbox-precache-*"
2. ✅ **Expected**: See JS, CSS, HTML files cached
3. Go offline
4. Hard refresh (Ctrl+Shift+R)
5. ✅ **Expected**: App loads from precached assets

### Verification
- [ ] API responses cached (supabase-api-cache)
- [ ] Images cached (supabase-storage-cache)
- [ ] Static assets precached (workbox-precache)
- [ ] Google Fonts cached (google-fonts-cache)
- [ ] Cache limits respected (100 API, 200 images)
- [ ] Old cache entries evicted when limit reached

## Test 6: Service Worker Updates

### Setup
1. Build and preview app: `npm run build && npm run preview`
2. Open app in browser
3. Open DevTools → Application → Service Workers

### Test Steps
1. ✅ **Expected**: Service worker shows as "activated and running"
2. Make a visible change to code (e.g., change text in Home.jsx)
3. Rebuild: `npm run build`
4. Refresh browser (don't hard refresh)
5. ✅ **Expected**: Alert appears: "New version available! Reload to update?"
6. Click "OK"
7. ✅ **Expected**: Page reloads with new version
8. Verify change is visible

### Verification
- [ ] Service worker registers on first visit
- [ ] New version detected on rebuild
- [ ] Update prompt appears
- [ ] Reload applies new version
- [ ] Old caches cleared
- [ ] New service worker activates

## Test 7: Offline Message Queue

### Setup
1. Log in and navigate to a conversation
2. Open DevTools → Application → Local Storage
3. Look for `ride-radar-offline-queue` key

### Test Steps
1. Go offline (Network → Offline)
2. Type and send a message
3. ✅ **Expected**: Message appears in conversation (optimistic update)
4. Check Local Storage
5. ✅ **Expected**: Message stored in `ride-radar-offline-queue`
6. Send 2 more messages while offline
7. ✅ **Expected**: Queue has 3 items
8. Go back online
9. ✅ **Expected**: Messages send automatically within ~1 second
10. Check Local Storage
11. ✅ **Expected**: Queue is empty (cleared after sync)

### Verification
- [ ] Messages queue in localStorage when offline
- [ ] Queue persists across page refreshes
- [ ] Messages send when back online
- [ ] Queue clears after successful send
- [ ] Failed messages retry
- [ ] Old queued items expire (24 hours)

## Test 8: Settings Integration

### Test Steps
1. Navigate to `/settings`
2. Scroll to "App Features" section

### When Installable
1. ✅ **Expected**: "Install Ride Radar App" button shows
2. Click button
3. ✅ **Expected**: Install dialog appears
4. Complete installation

### When Installed
1. ✅ **Expected**: "App Installed" badge shows (green)
2. Badge shows checkmark icon and "Installed on your device"

### Push Notifications
1. ✅ **Expected**: "Enable Push Notifications" button shows (if not granted)
2. Click button
3. ✅ **Expected**: Browser permission prompt appears
4. Allow notifications
5. ✅ **Expected**: Button disappears (permission granted)

### Verification
- [ ] Install button appears when installable
- [ ] Install button triggers native prompt
- [ ] Installed badge shows after installation
- [ ] Push notification button shows when not granted
- [ ] Permission prompt appears on click
- [ ] Button hides after permission granted

## Test 9: Network Resilience

### Test Steps
1. Load app while online
2. Go offline
3. Navigate through cached pages
4. Go back online
5. ✅ **Expected**: Data refetches automatically
6. Intermittent connection:
   - Toggle offline/online rapidly
   - ✅ **Expected**: App handles gracefully, no errors
7. Slow connection (DevTools → Network → Slow 3G)
   - ✅ **Expected**: App shows cached data immediately
   - ✅ **Expected**: Updates appear when fresh data loads

### Verification
- [ ] Offline mode works reliably
- [ ] Online mode refetches data
- [ ] Rapid toggling doesn't crash app
- [ ] Slow connections fall back to cache
- [ ] Network timeouts handled gracefully

## Test 10: Real-time Features (Online Only)

### Test Steps
1. Ensure online
2. Open app in two tabs/devices
3. Send message in Tab 1
4. ✅ **Expected**: Message appears in Tab 2 (real-time)
5. Go offline in Tab 1
6. Send message in Tab 1
7. ✅ **Expected**: Message queued (not sent yet)
8. Go back online in Tab 1
9. ✅ **Expected**: Message sends, appears in Tab 2

### Verification
- [ ] Real-time subscriptions work when online
- [ ] Real-time disabled when offline (expected)
- [ ] Queued messages don't trigger real-time
- [ ] Real-time resumes when back online
- [ ] No errors in console about failed subscriptions

## Test 11: Lighthouse PWA Audit

### Test Steps
1. Open app in Chrome
2. Open DevTools → Lighthouse tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"
5. Wait for audit to complete

### Expected Scores
- **PWA Score**: 90+ (out of 100)
- **Performance**: 80+ (with caching)
- **Accessibility**: 90+
- **Best Practices**: 90+
- **SEO**: 80+

### PWA Checklist (should all pass)
- [x] Registers a service worker
- [x] Responds with 200 when offline
- [x] Contains valid web app manifest
- [x] Uses HTTPS (or localhost)
- [x] Has a `<meta name="viewport">` tag
- [x] Provides a valid apple-touch-icon
- [x] Themed address bar

### Verification
- [ ] PWA audit score above 90
- [ ] All installability criteria met
- [ ] No console errors
- [ ] Manifest valid
- [ ] Service worker active

## Test 12: Browser Compatibility

Test in multiple browsers to ensure PWA works everywhere:

### Chrome/Edge (Chromium)
- [ ] Service worker registers
- [ ] Install prompt appears
- [ ] Offline mode works
- [ ] Caching strategies work

### Firefox
- [ ] Service worker registers
- [ ] Install prompt appears (desktop only)
- [ ] Offline mode works
- [ ] No console errors

### Safari (macOS)
- [ ] Service worker registers
- [ ] Add to Dock works (macOS 11+)
- [ ] Offline mode works
- [ ] No iOS-specific issues

### Safari (iOS)
- [ ] Service worker registers
- [ ] Add to Home Screen works
- [ ] Standalone mode works
- [ ] Status bar styling correct

### Mobile Chrome (Android)
- [ ] Install prompt appears
- [ ] App shortcuts work
- [ ] Theme color applies
- [ ] Fullscreen mode works

## Common Issues

### Issue: Install prompt doesn't appear

**Possible causes:**
- Not using HTTPS (except localhost)
- Manifest missing or invalid
- Service worker not registered
- Icons missing (192px, 512px)
- User dismissed prompt too many times

**Fix:**
- Check DevTools → Application → Manifest
- Verify all manifest fields valid
- Generate missing icons
- Clear browser data and try again

### Issue: Offline mode not working

**Possible causes:**
- Service worker not registered
- First visit (not cached yet)
- Cache cleared
- Network requests not matching cache patterns

**Fix:**
- Visit pages while online first
- Check DevTools → Application → Service Workers (should be "activated")
- Check Cache Storage has entries
- Verify workbox config in vite.config.js

### Issue: Updates not applying

**Possible causes:**
- Browser caching old service worker
- Hard refresh bypasses SW
- Update detection failed

**Fix:**
- Don't use hard refresh (Ctrl+Shift+R)
- Use normal refresh (F5)
- Check DevTools → Application → Service Workers → "Update on reload" (disable)
- Unregister old SW and re-register

## Automated Testing Script

For CI/CD testing, use Playwright or Cypress with PWA assertions:

```bash
# Install Playwright
npm install -D @playwright/test

# Run PWA tests
npx playwright test
```

Example test (create `tests/pwa.spec.js`):

```javascript
import { test, expect } from '@playwright/test';

test('PWA installs and works offline', async ({ page, context }) => {
  // Navigate to app
  await page.goto('http://localhost:4173');
  
  // Check service worker registered
  const swRegistration = await page.evaluate(() => 
    navigator.serviceWorker.ready
  );
  expect(swRegistration).toBeTruthy();
  
  // Check manifest exists
  const manifest = await page.locator('link[rel="manifest"]');
  expect(await manifest.getAttribute('href')).toBe('/manifest.json');
  
  // Go offline
  await context.setOffline(true);
  
  // Navigate should still work
  await page.goto('http://localhost:4173/home');
  expect(await page.title()).toBeTruthy();
  
  // Check offline banner appears
  const banner = await page.locator('text=offline');
  await expect(banner).toBeVisible();
});
```

## Success Criteria

PWA implementation is complete when:

- [x] Lighthouse PWA audit scores 90+
- [x] App installs on desktop (Chrome/Edge)
- [x] App installs on mobile (iOS/Android)
- [x] Offline mode works for cached routes
- [x] Service worker updates automatically
- [x] Message queue syncs when back online
- [x] Real-time features work when online
- [x] No console errors in any browser
- [x] Theme colors match design system
- [x] Icons display correctly on all platforms

---

**Last Updated**: May 6, 2026  
**Version**: 2.0.0  
**Status**: ✅ Ready for Testing
