# Known Limitations — Ride Radar 2.0

## Product

1. **No dedicated "Crew Ride" feature.** Crew functionality is implemented as an `iso` broadcast subtype (`iso_subtype: 'bike_crew'`). Future versions may promote this to a first-class feature.

2. **Event visibility window.** Events are controlled by `expires_at` (set to `event_end_time + 6 hours`), not by a hard 30-day-before / 1-day-after window relative to `event_date`.

3. **Un-RSVP UI.** Users can toggle between "Interested" and "Going" but cannot fully remove their RSVP from the UI. The API supports `not_going` status.

4. **Live map presence is opt-in and disabled by default.** `autoPublish: false` means users must explicitly enable live map visibility in Settings before their live marker appears.

## Technical

1. **No automated tests before Phase 4.** Test coverage is minimal (smoke tests only). Critical flows require manual QA for each release.

2. **Bundle size.** Total vendor JS is ~930KB (React + Leaflet + Framer Motion + Radix + Supabase). Acceptable for the feature set but could benefit from further lazy-loading.

3. **React Query cache is memory-only.** No persistent cache (e.g., `@tanstack/react-query-persist-client`). Cache is lost on page reload.

4. **iPhone header overlap risk.** `AppLayout` `<main>` uses `pt-16` while the header uses `pt-safe + h-14`. On notched iPhones, the header may be taller than 4rem, causing minor overlap on non-radar pages.

5. **Auth event re-render on token refresh.** `authEvent` is stored in `useAuthState` context and triggers a re-render on every `TOKEN_REFRESHED`. This is intentionally preserved because the password recovery flow depends on it.

6. **Tap targets slightly below 44×44px in some areas.** Header action buttons (40px), settings rows (~34px), and ISO subtype buttons (~32px) are marginally below the WCAG recommended minimum.

## Monitoring

1. **Sentry requires DSN configuration.** The SDK is installed and wired, but will not report errors until `VITE_SENTRY_DSN` is set in the production environment.

2. **Plausible analytics require domain setup.** Analytics are gated by `VITE_ENABLE_ANALYTICS` and the Plausible domain configuration.
