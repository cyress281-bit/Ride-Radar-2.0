# Ride Radar Monitoring & Post-Deploy Checklist

## Automated Health Check

Run the health check script against your live Supabase project:

```bash
# Set your env vars
export VITE_SUPABASE_URL=https://iygtbcserdmvhhjicyyp.supabase.co
export VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Run checks
node scripts/health-check.js
```

Checks performed:
- ✅ Supabase Auth connectivity
- ✅ Core tables exist (12 tables)
- ✅ `get_nearby_broadcasts` PostGIS RPC callable
- ✅ `is_admin()` function exists
- ✅ `updated_at` triggers active

## Admin Health Dashboard

Once deployed, visit `/admin/health` to see real-time system status:
- Supabase Auth latency
- Database query latency
- PostGIS RPC latency
- Realtime channel subscription
- Storage accessibility

Auto-refreshes every 30 seconds.

## Post-Deploy Verification Checklist

### Critical Path (Do These First)
- [ ] App loads without white screen or console errors
- [ ] `/login` page renders with branding
- [ ] Google OAuth button visible and clickable
- [ ] Email/password form accepts input
- [ ] New user can sign up → auto-redirect to `/onboarding`
- [ ] Onboarding form saves profile → redirects to `/home`
- [ ] Home/Radar page shows map with dark tiles
- [ ] Create broadcast button works (all 4 types)
- [ ] Broadcast appears in feed after creation
- [ ] Broadcast appears on map

### Social Features
- [ ] Send connection request from broadcast detail
- [ ] Accept connection request from notifications
- [ ] Conversation created automatically on accept
- [ ] Send message in conversation
- [ ] Real-time message appears instantly
- [ ] Block user from safety actions
- [ ] Blocked user's content hidden from feed

### Safety & Settings
- [ ] Report user from broadcast detail
- [ ] Settings page loads without errors
- [ ] Toggle live map visibility
- [ ] Toggle notification settings
- [ ] Analytics opt-in toggle works
- [ ] Account deletion flow works end-to-end

### Admin Panel
- [ ] `/admin` accessible for admin user
- [ ] Dashboard shows metrics
- [ ] Reports queue loads
- [ ] Can expire/delete broadcasts from admin
- [ ] Can promote/demote users
- [ ] `/admin/health` shows all green checks

### Mobile / PWA
- [ ] Install prompt appears on supported browsers
- [ ] App installs to home screen
- [ ] Works offline (shows offline banner)
- [ ] Bottom nav visible and tappable
- [ ] Safe area respected on iPhone

## Sentry / Error Tracking

Check your Sentry dashboard for:
- Uncaught exceptions
- Chunk load failures
- API timeout errors

## Plausible Analytics

Verify events firing:
- `pageview` on route changes
- `broadcast_created` on successful creation
- `message_sent` on chat
- `connection_request_sent` on connect

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Build time | > 60s | > 120s |
| Bundle size | > 500KB | > 1MB |
| API latency | > 2s | > 5s |
| Error rate | > 1% | > 5% |
| Uptime | < 99.9% | < 99% |

## Rollback Plan

If critical issues are found:
1. `git revert HEAD` on main
2. Push to GitHub
3. Vercel auto-deploys previous commit
4. Run `node scripts/health-check.js` to verify

## Contact

Issues? Check `/admin/health` first, then review Sentry logs.
