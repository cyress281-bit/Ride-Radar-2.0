# Ride Radar Beta Tester Checklist

**Thanks for joining the beta.** Your real-world testing is what turns a good app into a great one. This guide covers what to test, how to report issues, and what to expect.

---

## 1. Welcome & Beta Expectations

Ride Radar is a real-world test build. Features may change, intermittent bugs can happen, and some flows are still being refined. Please treat the app as a **community awareness tool**, not a guaranteed source of truth or emergency service.

**What "beta" means here:**
- The core loop works: create signals, view the map, message other riders
- Edge cases are where we need your help
- Your feedback directly shapes what gets fixed next

---

## 2. Core Flows to Test

Test these in order. If something breaks early, report it and stop — no need to power through a broken foundation.

| # | Flow | What to check |
|---|------|---------------|
| 1 | **Install & first open** | App loads, splash screen shows, no blank screen |
| 2 | **Sign up / log in** | Email magic link or password login works |
| 3 | **Onboarding** | Profile setup completes, bike info saves |
| 4 | **Radar (home) screen** | Map loads, your location shows, broadcasts appear |
| 5 | **Pull-to-refresh** | New broadcasts load, spinner dismisses |
| 6 | **Create a signal** | Meetup, Road Warning, and Bike Down all submit successfully |
| 7 | **View signal detail** | Tap any broadcast card → full detail opens |
| 8 | **Signal interactions** | RSVP to a meetup, mark a warning helpful |
| 9 | **Edit / delete your signal** | Options menu works, changes save |
| 10 | **Settings** | Toggle live map, update profile, change preferences |

---

## 3. Signals to Test

Create at least one of each signal type during your testing:

### Meetup / Event
- Title, description, date/time
- **Address autocomplete** — start typing an address, pick from suggestions
- Verify the pin appears on the map

### Road Warning
- Select a preset (Police, Traffic, Debris, etc.)
- Add a photo if possible (max 2)
- Verify expiry is reasonable (most warnings expire in 1–4 hours)

### Bike Down
- Mark your location
- Add description and photo
- Verify it appears as an urgent alert on the map

### Solo Ride
- Start a ride, verify your pin moves with you
- End the ride, verify it disappears

---

## 4. Messaging to Test

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Start a chat from a rider's profile | Conversation opens, first message sends |
| 2 | Receive a message | Notification arrives, badge increments |
| 3 | Send a photo in chat | Uploads, preview shows, recipient can view |
| 4 | Block a user | Messages hidden, no error |
| 5 | Conversation list | Shows latest message, unread indicator |

---

## 5. PWA / Mobile Install Testing

Ride Radar works as a Progressive Web App — no app store required.

### iOS Safari
1. Open Ride Radar in Safari
2. Tap Share → "Add to Home Screen"
3. Launch from the home screen icon
4. **Check:** Full-screen, no Safari chrome, splash screen on open

### Android Chrome
1. Open Ride Radar in Chrome
2. Tap menu → "Add to Home screen" or "Install app"
3. Launch from the home screen
4. **Check:** Standalone mode, feels like a native app

### After install, verify:
- [ ] App opens from home screen (not browser)
- [ ] Pull-to-refresh works
- [ ] Back gesture/button behaves correctly
- [ ] No "open in browser" prompts

---

## 6. Notifications Testing

| Platform | Test | Expected |
|----------|------|----------|
| iOS PWA | Allow notifications when prompted | Badge updates, banner alerts appear |
| Android PWA | Allow notifications when prompted | Badge updates, banner alerts appear |
| Both | Send yourself a message from another account | Notification arrives within ~10 seconds |
| Both | Background the app, have someone message you | Notification arrives while app is closed |

**Known limitation:** iOS PWA notifications depend on Safari and may be less reliable than native push. If notifications stop, check Settings → Notifications in iOS.

---

## 7. Performance & Stability Checks

Run through these quickly. We are looking for "feels broken," not micro-optimizations.

| # | Check | Pass if... |
|---|-------|------------|
| 1 | Cold start | App shows content within ~3 seconds on repeat opens |
| 2 | Radar map | No white flash when opening; dark tiles load |
| 3 | Route transitions | Tapping nav items feels instant, no long blank screens |
| 4 | List scrolling | Broadcast list scrolls smoothly, no stutter |
| 5 | Photo loading | Images appear with a blur placeholder, not broken icons |
| 6 | Resume from background | App picks up where you left off, no forced reload |
| 7 | Network switch | WiFi → cellular → WiFi, app reconnects gracefully |

---

## 8. Report Immediately (Urgent)

These are genuine blockers. Send a report right away.

- 🚨 **Cannot log in or sign up**
- 🚨 **App shows blank white screen on open**
- 🚨 **Creating a signal fails completely**
- 🚨 **Map does not load or shows no tiles**
- 🚨 **Messages fail to send or never arrive**
- 🚨 **App crashes to home screen (iOS) or closes (Android)**
- 🚨 **Cannot install as PWA**
- 🚨 **Real-time location sharing broken** (if both users have it enabled)

---

## 9. Not Urgent (Nice-to-Know)

These are expected beta rough edges. Report them if you want, but they will not block launch.

- ⚠️ Brief white flash on first map load in dark mode
- ⚠️ Avatar image takes a moment to update when switching profiles
- ⚠️ Layout shifts during active development updates
- ⚠️ iOS PWA requires force-close and reopen to get latest build
- ⚠️ Notifications on iOS PWA less reliable than native apps
- ⚠️ Minor visual polish issues (spacing, animation timing)

---

## 10. How to Submit Bugs

**Preferred:** Use the in-app **Support** page (Settings → Support) — it captures your device info automatically.

**Alternative:** Post in the beta Discord channel or email **support@rideradar.app**

**One bug per report.** If you find three issues, send three reports. It helps us track and fix faster.

---

## 11. What to Include in Bug Reports

The more context, the faster we fix it.

**Required:**
- What you were trying to do
- What actually happened
- Device (iPhone 15, Pixel 8, etc.)
- Browser / OS version

**Very helpful:**
- Screenshots or screen recordings
- Steps to reproduce (be specific: "tap X, then Y, then Z")
- Whether it happens every time or only sometimes
- Whether it started today or has always happened

**If reporting a crash:**
- What screen you were on
- What you tapped last
- Whether it happens on reload

---

## 12. Safety Disclaimer

Ride Radar is a **community awareness tool**, not an emergency service.

- **Do not rely on it for life-safety decisions.** Always use your own judgment.
- **Signal accuracy depends on user reports.** A "Police" signal may be outdated or incorrect.
- **Ride within your limits.** No app replaces safe riding practices.
- **In an emergency, call local emergency services.**

---

## Quick Reference

| | |
|---|---|
| **App URL** | https://www.rideradarapp.com |
| **Support Email** | support@rideradar.app |
| **Beta Channel** | Discord #beta-feedback |
| **Last Updated** | May 22, 2026 |

**Thank you for testing. Every report makes the app better for riders everywhere.**
