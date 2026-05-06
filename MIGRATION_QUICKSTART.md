# 🚀 Supabase Migration Quickstart

**Goal:** Get off Base44 and onto Supabase in 2-3 weeks

---

## ✅ Step 1: Set Up Supabase (30 minutes)

### 1.1 Create Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Click "New Project"
3. Fill in:
   - **Name:** Ride Radar
   - **Database Password:** (save this somewhere safe!)
   - **Region:** Choose closest to your users
   - **Plan:** Free tier
4. Wait 2-3 minutes for project to provision

### 1.2 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open `SUPABASE_MIGRATION.md` in this repo
3. Copy the entire SQL from **Step 1.2** (Create Core Schema)
4. Paste into SQL Editor
5. Click **Run**
6. Repeat for **Step 1.3** (Helper Functions)
7. Repeat for **Step 2** (Row Level Security)

### 1.3 Get API Credentials

1. Go to **Project Settings → API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 1.4 Configure Local Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

---

## ✅ Step 2: Install Dependencies (2 minutes)

```bash
npm install @supabase/supabase-js
```

**Files already created:**
- ✅ `src/lib/supabase.js` - Supabase client
- ✅ `.env.example` - Environment template

---

## ✅ Step 3: Enable Authentication (10 minutes)

### 3.1 Configure Auth in Supabase

1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. (Optional) Customize email templates in **Authentication → Email Templates**

### 3.2 Create First User (Testing)

Go to **Authentication → Users → Add User**:
- **Email:** your-email@example.com
- **Password:** test123456
- **Auto Confirm:** Yes

This gives you a test account to use during migration.

---

## ✅ Step 4: Migration Strategy

We'll migrate features one at a time, keeping Base44 running alongside until done.

### Migration Order:
1. ✅ **Auth** (foundation - Week 1)
2. ✅ **Messages** (biggest win - Week 1-2)
3. ✅ **Home Feed** (core feature - Week 2)
4. ✅ **Broadcasts** (create/edit - Week 2)
5. ✅ **Profile** (Week 3)
6. ✅ **Everything else** (Week 3)

### How It Works:
- New code uses Supabase
- Old code still uses Base44 (for now)
- Once feature works with Supabase, remove Base44 code
- No downtime!

---

## 🎯 Week 1: Auth + Messages

### Day 1-2: Auth Migration

**What to do:**
1. I'll create new `AuthContext` using Supabase
2. Test login/logout works
3. Test session persistence (close browser, reopen)
4. Keep Base44 auth as fallback for now

**Files to modify:**
- `src/lib/AuthContext.jsx` (update to use Supabase)
- `src/App.jsx` (minimal changes)

### Day 3-5: Messages Migration

**What to do:**
1. Update `useConversationMessages` hook to use Supabase
2. Add real-time subscriptions (no more polling!)
3. Test messages appear instantly
4. Update send message functionality

**Files to modify:**
- `src/hooks/useConversationMessages.js` (new file)
- `src/pages/Messages.jsx`
- `src/pages/ConversationView.jsx`

**Expected improvement:**
- Messages appear **instantly** instead of 5-30s delay
- No more battery drain from polling
- Much smoother UX

---

## 🎯 Week 2: Home Feed + Broadcasts

### Day 1-3: Home Feed Migration

**What to do:**
1. Create `useNearbyBroadcasts` hook with Supabase
2. Server-side geospatial queries (PostGIS)
3. No more client-side distance calculations
4. Add real-time for new broadcasts

**Files to modify:**
- `src/hooks/useNearbyBroadcasts.js` (new file)
- `src/pages/Home.jsx`

**Expected improvement:**
- Feed loads **70% faster** (no waterfall queries)
- Distance pre-calculated on server
- Real-time updates for new posts

### Day 4-5: Broadcast Creation

**What to do:**
1. Update broadcast creation to use Supabase
2. Handle image uploads (Supabase Storage)
3. Test create/edit/delete

**Files to modify:**
- `src/pages/Broadcast.jsx`

---

## 🎯 Week 3: Profile + Cleanup

### Day 1-2: Profile Migration

**What to do:**
1. Update profile pages to use Supabase
2. Handle avatar uploads
3. Test profile edit

### Day 3-5: Final Cleanup

**What to do:**
1. Migrate remaining pages (Notifications, Settings, etc.)
2. Remove ALL Base44 code
3. Test everything works
4. Deploy to production

---

## 🌐 Domain Setup (5 minutes)

Your domain: **rideradarapp.com**

### Keep Your Domain!

1. Go to your domain registrar (where you bought it)
2. Update DNS records:
   - If using Vercel:
     - Add A record: `76.76.21.21`
     - Add CNAME: `cname.vercel-dns.com`
   - If using Netlify:
     - Add A record: `75.2.60.5`
     - Add CNAME: `your-site.netlify.app`

3. Vercel/Netlify will handle SSL automatically

**No downtime!** DNS propagates in 5-30 minutes.

---

## 📱 Mobile App Strategy (Post-Migration)

After Supabase migration is done:

### Week 4-5: Capacitor Wrapper

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. Add iOS platform:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   ```

3. Add Android platform:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```

4. Build web app:
   ```bash
   npm run build
   npx cap sync
   ```

5. Open in Xcode (iOS) or Android Studio:
   ```bash
   npx cap open ios
   npx cap open android
   ```

**That's it!** Your React app now runs as a native app.

### Additional Capacitor Plugins Needed:
- `@capacitor/geolocation` (GPS)
- `@capacitor/camera` (photo uploads)
- `@capacitor/push-notifications` (notifications)
- `@capacitor/share` (share broadcasts)

**Estimated timeline:** 1-2 weeks to have iOS + Android apps ready

---

## 💰 Cost Breakdown

### Supabase Free Tier (Perfect for <10k users)
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Real-time subscriptions included
- **Cost: $0/month**

### When You Exceed Free Tier
- **Pro Plan: $25/month**
  - 8GB database
  - 100GB storage
  - 250GB bandwidth
  - 100,000 MAU

### Hosting (Vercel/Netlify)
- **Free tier:** Plenty for your needs
- **Pro tier:** $20/month (only if you need it)

### Total Cost
- **Year 1:** $0-25/month
- **At scale (10k+ users):** $25-45/month

Compare to Base44 integration credit limits! 🎉

---

## 📊 Expected Results

| Feature | Before (Base44) | After (Supabase) |
|---------|-----------------|------------------|
| **Messages** | Polling every 5s | Real-time (instant) |
| **Feed updates** | Polling every 30s | Real-time (instant) |
| **Geospatial** | Client-side calc | Server-side (PostGIS) |
| **Feed load time** | 1.5-2s | 0.3-0.5s |
| **Battery drain** | High (polling) | Low (WebSocket) |
| **Cost** | Credit limits | $0-25/month |
| **Queries** | Limited | Unlimited |

---

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "RLS policy prevents operation"
- Check Row Level Security policies in database
- Make sure you're authenticated
- Verify auth token is being sent

### "PostGIS function not found"
- Run the PostGIS extension enable command
- Check schema was created correctly

### "Can't connect to Supabase"
- Check project is running (not paused)
- Verify URL and anon key are correct
- Check browser console for errors

---

## 🎉 What's Next?

After completing the migration:

1. **Week 4:** Test everything thoroughly
2. **Week 5:** Capacitor mobile wrapper
3. **Week 6:** Submit to App Store + Google Play
4. **Week 7:** Launch! 🚀

---

## 📞 Need Help?

1. Check Supabase docs: https://supabase.com/docs
2. Supabase Discord: https://discord.supabase.com
3. Review `SUPABASE_MIGRATION.md` for detailed SQL

---

**Ready to start?** 

Run through Step 1 (Set Up Supabase) and let me know when you're done. I'll start migrating the code! 🚀
