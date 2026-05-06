# Analytics and Monitoring Documentation

This document describes all analytics events and monitoring systems implemented in Ride Radar 2.0.

## Overview

Ride Radar uses a privacy-focused analytics approach with three main systems:

1. **Sentry** - Error tracking and performance monitoring
2. **Plausible** - Privacy-focused, cookieless analytics
3. **Web Vitals** - Core performance metrics (LCP, FID, CLS, TTFB, INP)

## Privacy Principles

- **No PII collected** - User IDs, emails, names, and locations are never tracked
- **Opt-in by default** - Users control analytics via Settings
- **GDPR compliant** - Plausible is cookieless and doesn't require consent banners
- **Transparent** - All tracked events are documented here

## User Opt-Out

Users can disable analytics in Settings:
- Navigate to `/settings`
- Toggle "Anonymous usage analytics"
- Setting is stored in `user_settings.analytics_enabled`
- When disabled, no events are sent to Plausible (Sentry still tracks errors)

## Tracked Events

All events are tracked without any personally identifiable information.

### User Actions

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Broadcast Created` | `type: 'solo_ride' \| 'iso' \| 'event' \| 'alert'` | User creates a new broadcast |
| `Message Sent` | None | User sends a message in a conversation |
| `Connection Request` | `action: 'sent' \| 'accepted' \| 'declined'` | User sends/accepts/declines connection request |
| `RSVP` | `type: broadcast_type` | User RSVPs to an event |
| `Profile Completed` | None | User completes onboarding |

### Moderation Actions

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `User Blocked` | None | User blocks another user |
| `User Reported` | `reason: report_type` | User reports another user |

### App Features

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `PWA Installed` | None | User installs the app as a PWA |
| `Search Used` | `filter: 'broadcast_type' \| 'distance' \| 'date'` | User applies search/filter on home feed |
| `Image Upload` | `type: 'avatar' \| 'bike' \| 'event' \| 'alert'` | User uploads an image |
| `Location Shared` | None | User enables location sharing in settings |
| `Notification Toggle` | `type: notification_type, enabled: 'on' \| 'off'` | User changes notification preferences |

### Errors

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Error` | `type: 'auth' \| 'network' \| 'query' \| 'upload' \| 'unknown'` | Non-fatal error occurs |
| `Chunk Load Error` | `errorType: 'chunk_load_failure'` | Lazy-loaded chunk fails to load |

### Performance

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Web Vital` | `metric: 'LCP' \| 'FID' \| 'CLS' \| 'TTFB' \| 'INP', status: 'good' \| 'needs-improvement' \| 'poor', rating: string` | Core Web Vital measured |
| `Slow Query` | `query: query_name, duration_range: string` | Query takes >1s to execute |
| `Slow Subscription` | `channel: channel_name, duration_range: string` | Real-time subscription takes >500ms to connect |
| `Slow Image Load` | `type: image_type, duration_range: string` | Image takes >2s to load |
| `Slow Route Transition` | `route: route_name, duration_range: string` | Route transition takes >1s |

### Account Management

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Account Deleted` | None | User deletes their account |

## Page Views

Page views are automatically tracked on every route change using `usePageTracking()` hook.

**Tracked URLs:**
- `/home` - Home feed
- `/broadcast` - Create broadcast
- `/broadcast/:id` - Broadcast detail
- `/messages` - Messages list
- `/messages/:id` - Conversation view
- `/notifications` - Notifications
- `/profile` - Current user profile
- `/profile/:userId` - Other user's profile
- `/settings` - Settings
- `/onboarding` - Onboarding flow
- `/login` - Login page
- `/landing` - Landing page

**Note:** User IDs in URLs are sanitized and not sent to analytics.

## Error Tracking (Sentry)

### Automatically Captured

- React component errors (ErrorBoundary)
- Chunk load failures (ChunkErrorBoundary)
- Unhandled promise rejections
- Console errors in production

### Filtered Errors

These errors are **not** sent to Sentry:
- Chunk load errors (network issues, expected after deployments)
- Network timeout errors (user's connection)
- Auth session missing errors (expected for logged-out users)
- Browser extension errors
- ResizeObserver errors (benign)

### User Context

When user is authenticated, Sentry receives:
- User ID (non-PII)
- `is_public` (boolean)
- `has_bike` (boolean)

**Never sent:**
- Email
- Display name
- Location
- Phone number
- Any profile content

### Performance Monitoring

Sentry tracks:
- Page load times
- Route transition times
- API response times
- Database query times

Sample rate: 10% in production, 100% in staging

### Session Replay

Session replays are recorded only for sessions with errors:
- All text is masked
- All media is blocked
- All input fields are masked
- 10% of normal sessions, 100% of error sessions

## Performance Monitoring

### Core Web Vitals

Measured automatically on page load:

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | <2.5s | Loading performance |
| **FID** (First Input Delay) | <100ms | Interactivity |
| **CLS** (Cumulative Layout Shift) | <0.1 | Visual stability |
| **TTFB** (Time to First Byte) | <800ms | Server response time |
| **INP** (Interaction to Next Paint) | <200ms | Responsiveness |

### Custom Performance Metrics

- TanStack Query execution time
- Real-time subscription connection time
- Image load time
- Route transition time
- Memory usage

All metrics are sent to Sentry as context for debugging performance issues.

## Admin Monitoring Dashboard

Admins can view real-time system health at `/admin/monitoring`:

### Real-Time Stats
- Active users (last 5 min)
- Broadcasts created today
- Messages sent today
- Connection requests today
- Reports filed today
- Recent errors (last 5 min)

### Client Performance
- DOM loaded time
- Load complete time
- First Contentful Paint
- Memory usage

### External Dashboards
- Sentry dashboard (error tracking)
- Plausible dashboard (analytics)
- Supabase dashboard (database, auth, storage)

## Environment Variables

Required for production:

```bash
# Sentry (error tracking)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_DASHBOARD_URL=https://sentry.io/organizations/your-org/issues/

# Plausible (analytics)
VITE_PLAUSIBLE_DOMAIN=rideradar.app
VITE_PLAUSIBLE_API_HOST=https://plausible.io
VITE_PLAUSIBLE_DASHBOARD_URL=https://plausible.io/rideradar.app
VITE_ENABLE_ANALYTICS=true

# App version (for release tracking)
VITE_APP_VERSION=2.0.0
```

## Implementation Details

### Initialization

All monitoring systems are initialized in `src/main.jsx`:

```javascript
import { initializeSentry } from '@/lib/sentry'
import { initializeAnalytics } from '@/lib/analytics'
import { initializeWebVitals } from '@/lib/performanceMonitoring'

initializeSentry()
initializeAnalytics()
initializeWebVitals()
```

### Tracking Custom Events

```javascript
import { trackEvent } from '@/lib/analytics'

// Track a custom event
trackEvent('My Event', { property: 'value' })

// Use pre-defined event trackers
import {
  trackBroadcastCreated,
  trackMessageSent,
  trackConnectionRequest,
  // ... etc
} from '@/lib/analytics'

trackBroadcastCreated('solo_ride')
```

### Capturing Errors

```javascript
import { captureError } from '@/lib/sentry'

try {
  // risky operation
} catch (error) {
  captureError(error, { context: 'additional info' })
}
```

### Measuring Performance

```javascript
import {
  measureQueryPerformance,
  measureSubscriptionConnection,
  measureImageLoad,
} from '@/lib/performanceMonitoring'

// In a query hook
const startTime = performance.now()
const data = await fetchData()
measureQueryPerformance('my-query', startTime)

// For subscriptions
const startTime = performance.now()
await channel.subscribe()
measureSubscriptionConnection('my-channel', startTime)
```

## Database Schema

The `user_settings` table includes an `analytics_enabled` column:

```sql
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;
```

This column controls whether analytics events are sent for each user.

## Testing

### Development Mode
- Sentry: Disabled (logs to console instead)
- Analytics: Disabled (logs to console instead)
- Web Vitals: Disabled (not measured in dev)

### Staging/Production Mode
- Sentry: Enabled with DSN
- Analytics: Enabled if `VITE_ENABLE_ANALYTICS=true`
- Web Vitals: Enabled and tracked

### Testing Analytics

1. Build production version: `npm run build`
2. Preview: `npm run preview`
3. Open browser console
4. Check for "[Analytics] Initialized" message
5. Perform actions and verify events in Plausible dashboard
6. Check Sentry for captured errors

## Compliance

### GDPR
- Analytics are opt-in (user controls via Settings)
- No cookies used (Plausible is cookieless)
- No PII collected
- User can opt-out at any time
- Data retention follows Plausible and Sentry policies

### App Store Requirements
- Analytics opt-in toggle in Settings
- Privacy Policy updated with analytics disclosure
- Data safety documentation in `/review-readiness` page

## Support

For questions about analytics implementation:
- Check `/admin/monitoring` for real-time system health
- Review Sentry dashboard for error patterns
- Review Plausible dashboard for usage patterns
- Check browser console in production build for debugging

## Future Enhancements

Potential additions (not yet implemented):
- Custom dashboards in admin panel
- Alerts for high error rates
- Performance budget tracking
- A/B testing framework
- Conversion funnel tracking
- Cohort analysis
