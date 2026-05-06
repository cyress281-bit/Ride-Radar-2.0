# Deployment Checklist - Ride Radar 2.0

## 🗄️ Database Setup (Required Before Deployment)

### 1. Apply Migrations (in order)

Run these SQL scripts in your Supabase SQL Editor:

```bash
# Order matters - run in sequence:
1. supabase/migrations/20260506_create_delete_user_account.sql
2. supabase/migrations/20260506_fix_duplicate_conversations.sql
3. supabase/migrations/20260506_admin_rls_policies.sql
```

**Or with Supabase CLI:**
```bash
supabase db push
```

### 2. Set Initial Admin User

```sql
-- Replace with your email
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

### 3. Create Storage Bucket (if not exists)

In Supabase Dashboard → Storage:
- Create bucket: `uploads`
- Set to **public**
- Add folders: `avatars/`, `bikes/`, `events/`, `alerts/`

### 4. Verify RLS Policies

Check that all tables have proper RLS policies enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

---

## 🔧 Environment Variables

### Required for Production:

```bash
# .env.production or hosting platform environment vars
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ NEVER commit `.env` files to git!**

### Verify Environment:
```bash
# Check .gitignore includes:
.env
.env.local
.env.production
```

---

## 🚀 Pre-Deployment Testing

### Run Build Test:
```bash
npm run build
npm run preview  # Test production build locally
```

### Check for Errors:
```bash
npm run lint      # Should pass with no critical errors
npm run typecheck # Should complete (warnings OK)
```

### Manual Testing Checklist:

- [ ] **Signup Flow**
  - Create new account
  - Complete onboarding with avatar + bike
  - Verify profile data persists
  - Check auto-created user_profiles row

- [ ] **GPS Scenarios**
  - Test with location enabled (distance sorting works)
  - Test with location denied (fallback query works)
  - Desktop browser (no GPS) - should show all broadcasts

- [ ] **Broadcast Creation**
  - Solo ride (with current location)
  - ISO - Mechanic
  - ISO - Bike Crew
  - Event (with image upload)
  - Alert (with multiple photos)

- [ ] **Messaging**
  - Send message to friend
  - Accept connection request
  - Verify no duplicate conversations

- [ ] **Block Feature**
  - Block a user
  - Verify immediate removal from feed
  - Check conversations disappear
  - Unblock works

- [ ] **Account Deletion**
  - Create disposable test account
  - Add some data (profile, broadcasts, messages)
  - Delete account (type "DELETE" to confirm)
  - Verify signout and data removal

- [ ] **Admin Panel** (if admin role set)
  - Access /admin/dashboard
  - View reports
  - Moderate broadcast
  - Send test notification

---

## 📦 Deployment Steps

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
# Site Settings → Environment Variables
```

### Option 3: Custom Server

```bash
# Build
npm run build

# Copy dist/ folder to server
# Serve with nginx, Apache, or Node static server
```

**Example nginx config:**
```nginx
server {
    listen 80;
    server_name rideradarapp.com;
    root /var/www/ride-radar/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔒 Post-Deployment Security

### 1. Enable HTTPS
- Use Let's Encrypt (free) or your hosting provider's SSL
- Redirect all HTTP to HTTPS

### 2. Configure CORS (Supabase)
- Supabase Dashboard → Authentication → URL Configuration
- Add your production domain to allowed redirect URLs

### 3. Rate Limiting (Supabase)
- Check rate limits on Free tier (sufficient for testing)
- Upgrade to Pro if needed ($25/month - unlimited)

### 4. Monitor Logs
- Supabase Dashboard → Logs
- Watch for:
  - Failed auth attempts
  - RLS policy violations
  - Excessive queries

---

## 📊 Analytics & Monitoring Setup

### 1. Sentry (Error Tracking)

**Setup:**
1. Create account at https://sentry.io
2. Create new project for Ride Radar
3. Copy DSN to `.env`: `VITE_SENTRY_DSN=https://xxx@sentry.io/xxx`
4. Set environment: `VITE_SENTRY_ENVIRONMENT=production`
5. Create auth token for source maps: Project Settings → Auth Tokens
6. Add to CI/CD: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

**Dashboard:** `VITE_SENTRY_DASHBOARD_URL=https://sentry.io/organizations/your-org/issues/`

**What it tracks:**
- React component errors
- Chunk load failures
- Unhandled promise rejections
- Performance metrics (page loads, API calls)
- Session replays (only for error sessions)

### 2. Plausible (Privacy-Focused Analytics)

**Setup:**
1. Create account at https://plausible.io (or self-host)
2. Add domain to Plausible dashboard
3. Copy domain to `.env`: `VITE_PLAUSIBLE_DOMAIN=rideradar.app`
4. Enable analytics: `VITE_ENABLE_ANALYTICS=true`
5. Set API host (if self-hosting): `VITE_PLAUSIBLE_API_HOST=https://plausible.io`

**Dashboard:** `VITE_PLAUSIBLE_DASHBOARD_URL=https://plausible.io/rideradar.app`

**What it tracks:**
- Page views (no cookies!)
- Custom events (broadcasts, messages, connections)
- No PII collected
- GDPR compliant
- User can opt-out in Settings

### 3. Web Vitals (Performance)

**Automatically tracked:**
- LCP (Largest Contentful Paint) - target: <2.5s
- FID (First Input Delay) - target: <100ms
- CLS (Cumulative Layout Shift) - target: <0.1
- TTFB (Time to First Byte) - target: <800ms
- INP (Interaction to Next Paint) - target: <200ms

**View metrics:** `/admin/monitoring` page

### 4. Database Migration for Analytics

Run in Supabase SQL Editor:
```sql
-- Add analytics_enabled column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;
```

Or with CLI:
```bash
supabase migration up 20260507_add_analytics_enabled
```

### 5. Admin Monitoring Dashboard

**Access:** `/admin/monitoring` (admin users only)

**Features:**
- Real-time stats (active users, broadcasts, messages)
- Client performance metrics
- Links to external dashboards (Sentry, Plausible, Supabase)
- Auto-refresh every 30 seconds

### 6. Testing Analytics in Production

**Test Sentry:**
1. Build production: `npm run build`
2. Preview: `npm run preview`
3. Check console for "[Sentry] Initialized"
4. Trigger test error
5. Verify in Sentry dashboard

**Test Plausible:**
1. Visit production site
2. Check console for "[Analytics] Initialized"
3. Navigate between pages
4. Verify page views in Plausible dashboard (may take 1-2 min)

**Test Custom Events:**
1. Create broadcast → Check "Broadcast Created" event
2. Send message → Check "Message Sent" event
3. Toggle settings → Check "Notification Toggle" event

**Test Opt-Out:**
1. Go to Settings
2. Disable "Anonymous usage analytics"
3. Perform actions → No events should be sent
4. Re-enable → Events resume

### 7. Install Required Packages

```bash
npm install @sentry/react plausible-tracker web-vitals
npm install --save-dev @sentry/vite-plugin
```

**Package versions (recommended):**
- `@sentry/react`: ^7.100.0
- `plausible-tracker`: ^0.3.9
- `web-vitals`: ^3.5.2
- `@sentry/vite-plugin`: ^2.16.0

### 8. Documentation

**All tracked events documented in:** `ANALYTICS.md`

**Key points:**
- No PII collected (user IDs, emails, names, locations)
- User controls via Settings toggle
- GDPR compliant (cookieless)
- Opt-in by default (can opt-out)

---

## 📊 Post-Launch Monitoring

### Week 1 Checklist:

- [ ] Monitor user signups (check `users` table row count)
- [ ] Check for duplicate conversations (should be 0)
- [ ] Verify storage usage (images uploading correctly)
- [ ] Review any error logs in Supabase
- [ ] Test on multiple devices (iOS, Android, desktop)
- [ ] **Check Sentry for errors** (should be <5% error rate)
- [ ] **Review Plausible analytics** (page views, top pages)
- [ ] **Check Core Web Vitals** in `/admin/monitoring`
- [ ] **Monitor performance** (slow queries, subscriptions)

### Database Queries to Run:

```sql
-- Check for orphaned data
SELECT COUNT(*) FROM user_profiles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Check for duplicate conversations (should return 0)
WITH conv_pairs AS (
  SELECT 
    participant_ids,
    type,
    COUNT(*) as count
  FROM conversations
  WHERE status = 'active'
  GROUP BY participant_ids, type
)
SELECT * FROM conv_pairs WHERE count > 1;

-- Check storage usage
SELECT 
  COUNT(*) as total_files,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'uploads';
```

---

## 🐛 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution:** Check `.env` file exists and has correct values. Restart dev server after changes.

### Issue: RLS policy violation errors
**Solution:** Run all 3 migrations. Verify with `SELECT * FROM pg_policies;`

### Issue: Images not uploading
**Solution:** 
1. Verify `uploads` bucket exists and is public
2. Check browser console for CORS errors
3. Verify user is authenticated

### Issue: Admin panel shows "Access Denied"
**Solution:** 
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Issue: Duplicate conversations still appearing
**Solution:** Run migration 2 again, it cleans up existing duplicates.

### Issue: Feed empty for desktop users
**Solution:** Verify the GPS fallback fix is deployed (check for `finalBroadcasts` in Home.jsx).

---

## 🔄 Rolling Back (Emergency)

If critical issues arise post-deployment:

### 1. Rollback Frontend:
```bash
# Vercel
vercel rollback

# Netlify
netlify deploy --prod --alias=previous-version
```

### 2. Rollback Database (careful!):
```sql
-- Only if absolutely necessary
-- Dropping functions is safe (doesn't lose data)
DROP FUNCTION IF EXISTS delete_user_account();
DROP FUNCTION IF EXISTS get_or_create_conversation();
DROP FUNCTION IF EXISTS is_admin();
```

**Note:** Do NOT drop tables or constraints without a backup!

---

## ✅ Launch Confirmation

After successful deployment, verify:

- [ ] App loads at production URL
- [ ] HTTPS enabled (green padlock in browser)
- [ ] New user can sign up
- [ ] Broadcasts appear in feed
- [ ] Real-time updates work (test with 2 browsers)
- [ ] Mobile responsive (test on phone)
- [ ] Admin panel accessible (if admin)

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Issue Tracking:** Create issues in your GitHub repo
- **Supabase Support:** https://supabase.com/support

---

## 🎉 You're Ready to Launch!

All critical bugs fixed, all high-priority features working.

**Next Steps:**
1. Run through testing checklist above
2. Apply database migrations
3. Deploy to hosting platform
4. Set admin user
5. Announce to users!

**Good luck! 🚀**
