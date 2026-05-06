# Analytics & Monitoring Setup Guide

Quick start guide for setting up error tracking and analytics for Ride Radar 2.0.

## Quick Install

```bash
npm install @sentry/react plausible-tracker web-vitals
npm install --save-dev @sentry/vite-plugin
```

## Environment Variables

Add to your `.env` file:

```bash
# Sentry (Error Tracking)
VITE_SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/123456
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_DASHBOARD_URL=https://sentry.io/organizations/your-org/issues/

# Plausible (Analytics)
VITE_PLAUSIBLE_DOMAIN=rideradar.app
VITE_PLAUSIBLE_API_HOST=https://plausible.io
VITE_PLAUSIBLE_DASHBOARD_URL=https://plausible.io/rideradar.app
VITE_ENABLE_ANALYTICS=true

# App Version (for release tracking)
VITE_APP_VERSION=2.0.0

# For CI/CD (source maps upload)
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org
SENTRY_PROJECT=ride-radar
```

## 1. Sentry Setup (Error Tracking)

### Create Sentry Project

1. Go to https://sentry.io
2. Create account or sign in
3. Create new project:
   - Platform: React
   - Name: ride-radar
   - Alert frequency: On every new issue

### Get DSN

1. Go to Project Settings → Client Keys (DSN)
2. Copy DSN to `VITE_SENTRY_DSN`

### Create Auth Token (for source maps)

1. Go to Settings → Account → API → Auth Tokens
2. Create new token:
   - Name: "ride-radar-source-maps"
   - Scopes: `project:releases`, `org:read`
3. Copy token to `SENTRY_AUTH_TOKEN` (for CI/CD)

### Configure Alerts

1. Go to Alerts → Create Alert Rule
2. Set conditions:
   - When: Number of events ≥ 10
   - In: 1 hour
   - Action: Send notification to email/Slack

### Test Sentry

```bash
# Build and preview production
npm run build
npm run preview

# Open http://localhost:4173
# Check console for "[Sentry] Initialized (production)"
# Trigger test error (modify code temporarily)
# Verify error appears in Sentry dashboard
```

## 2. Plausible Setup (Analytics)

### Option A: Plausible Cloud

1. Go to https://plausible.io
2. Create account (€9/month for up to 10k visitors)
3. Add site:
   - Domain: `rideradar.app`
   - Timezone: Your timezone
4. Copy domain to `VITE_PLAUSIBLE_DOMAIN`

### Option B: Self-Hosted Plausible

```bash
# Clone Plausible hosting repo
git clone https://github.com/plausible/hosting
cd hosting

# Configure
cp plausible-conf.env.example plausible-conf.env
# Edit plausible-conf.env with your domain

# Start
docker-compose up -d
```

Set `VITE_PLAUSIBLE_API_HOST=https://your-plausible-domain.com`

### Test Plausible

```bash
# Build and preview
npm run build
npm run preview

# Open http://localhost:4173
# Check console for "[Analytics] Initialized with Plausible"
# Navigate between pages
# Wait 1-2 minutes
# Check Plausible dashboard for page views
```

## 3. Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Add analytics_enabled column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;

-- Add comment
COMMENT ON COLUMN user_settings.analytics_enabled IS 'User opt-in for anonymous usage analytics (Plausible). No PII is collected.';

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_settings_analytics_enabled
ON user_settings(analytics_enabled);
```

Or use Supabase CLI:

```bash
supabase migration up 20260507_add_analytics_enabled
```

## 4. Verify Installation

### Check Files Created

```
src/lib/sentry.js                    - Sentry initialization
src/lib/analytics.js                 - Plausible analytics
src/lib/performanceMonitoring.js     - Web Vitals tracking
src/hooks/usePageTracking.js         - Page view tracking
src/pages/admin/AdminMonitoring.jsx  - Admin dashboard
ANALYTICS.md                         - Documentation
```

### Check Imports in main.jsx

```javascript
import { initializeSentry } from '@/lib/sentry'
import { initializeAnalytics } from '@/lib/analytics'
import { initializeWebVitals } from '@/lib/performanceMonitoring'

initializeSentry()
initializeAnalytics()
initializeWebVitals()
```

### Check Settings Page

1. Run app: `npm run dev`
2. Go to `/settings`
3. Verify "Anonymous usage analytics" toggle exists
4. Toggle should enable/disable analytics

## 5. Production Build with Source Maps

### Manual Build

```bash
# Set environment variables
export SENTRY_AUTH_TOKEN=your-token
export SENTRY_ORG=your-org
export SENTRY_PROJECT=ride-radar
export NODE_ENV=production

# Build
npm run build

# Source maps will be uploaded to Sentry automatically
# Look for: "[sentry-vite-plugin] Uploaded source maps"
```

### CI/CD (GitHub Actions Example)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
          VITE_SENTRY_ENVIRONMENT: production
          VITE_PLAUSIBLE_DOMAIN: ${{ secrets.VITE_PLAUSIBLE_DOMAIN }}
          VITE_ENABLE_ANALYTICS: true
          VITE_APP_VERSION: ${{ github.sha }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: your-org
          SENTRY_PROJECT: ride-radar
          NODE_ENV: production
        run: npm run build
      
      - name: Deploy to Vercel
        run: vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 6. Admin Monitoring Dashboard

### Access

1. Set admin role in Supabase:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

2. Visit `/admin/monitoring` in the app

### Features

- **Real-time Stats** (auto-refresh every 30s)
  - Active users (last 5 min)
  - Broadcasts created today
  - Messages sent today
  - Connection requests today
  - Reports filed today
  - Recent errors (last 5 min)

- **Client Performance**
  - DOM loaded time
  - Load complete time
  - First Contentful Paint
  - Memory usage

- **External Dashboards**
  - Link to Sentry dashboard
  - Link to Plausible dashboard
  - Link to Supabase dashboard

## 7. User Opt-Out

Users can disable analytics:

1. Go to Settings
2. Toggle "Anonymous usage analytics" off
3. Analytics events stop (Sentry errors still tracked)

**Note:** This is stored in `user_settings.analytics_enabled`

## 8. What Gets Tracked

### Page Views
- All route changes (sanitized, no user IDs)

### Custom Events
- Broadcast created (type only, no content)
- Message sent (count only, no content)
- Connection requests (action only)
- User blocked/reported (reason only, no IDs)
- Profile completed
- PWA installed
- Settings changed

### Errors
- React component errors
- Chunk load failures
- Network errors
- Auth errors

### Performance
- Core Web Vitals (LCP, FID, CLS, TTFB, INP)
- Slow queries (>1s)
- Slow subscriptions (>500ms)
- Slow images (>2s)
- Memory usage

**See ANALYTICS.md for complete list**

## 9. Privacy Compliance

### GDPR
- ✅ No cookies (Plausible is cookieless)
- ✅ No PII collected
- ✅ User can opt-out
- ✅ Anonymous data only
- ✅ Transparent (all events documented)

### App Store
- ✅ Privacy Policy updated
- ✅ Data Safety disclosure in Settings
- ✅ User controls via toggle

## 10. Troubleshooting

### Sentry not initializing

**Check:**
- `VITE_SENTRY_DSN` is set
- DSN format: `https://xxx@o123456.ingest.sentry.io/123456`
- Running in production mode (`npm run build` + `npm run preview`)

**Debug:**
```javascript
// Temporarily log in src/lib/sentry.js
console.log('Sentry DSN:', import.meta.env.VITE_SENTRY_DSN)
console.log('Is prod:', import.meta.env.PROD)
```

### Plausible not tracking

**Check:**
- `VITE_PLAUSIBLE_DOMAIN` matches domain in Plausible dashboard
- `VITE_ENABLE_ANALYTICS=true`
- User has `analytics_enabled=true` in settings
- Running in production mode

**Debug:**
```javascript
// Temporarily log in src/lib/analytics.js
console.log('Plausible domain:', import.meta.env.VITE_PLAUSIBLE_DOMAIN)
console.log('Analytics enabled:', import.meta.env.VITE_ENABLE_ANALYTICS)
```

### Source maps not uploading

**Check:**
- `SENTRY_AUTH_TOKEN` is set
- Token has `project:releases` and `org:read` scopes
- `NODE_ENV=production`
- `@sentry/vite-plugin` is installed

**Debug:**
```bash
# Check vite build output for:
[sentry-vite-plugin] Uploading source maps...
[sentry-vite-plugin] Successfully uploaded X files
```

### Admin dashboard not loading

**Check:**
- User has `role='admin'` in `users` table
- `/admin/monitoring` route exists in App.jsx
- AdminMonitoring component imported

**Fix:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Support

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Plausible Docs:** https://plausible.io/docs
- **Web Vitals:** https://web.dev/vitals/
- **Issues:** See ANALYTICS.md for full documentation

---

**Setup Time:** ~30 minutes
**Monthly Cost:** $0 (Sentry free tier) + $9 (Plausible cloud) = $9/month
**Alternative:** Self-host Plausible for free
