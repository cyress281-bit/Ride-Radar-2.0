# Manual Git Commands for Vercel 404 Fix

If you prefer to run git commands manually (or if the scripts don't work), copy-paste these commands one at a time:

## Command 1: Create and Switch to Feature Branch
```bash
git checkout -b feature/fix-vercel-refresh
```

**Expected output:**
```
Switched to a new branch 'feature/fix-vercel-refresh'
```

---

## Command 2: Stage the vercel.json Changes
```bash
git add vercel.json
```

**No output** if successful.

---

## Command 3: View What Will Be Committed
```bash
git diff --cached
```

**Expected output** (showing the addition of cleanUrls and trailingSlash):
```diff
diff --git a/vercel.json b/vercel.json
index ... 100644
--- a/vercel.json
+++ b/vercel.json
@@ -6 +6,8 @@
       "destination": "/index.html"
     }
-  ]
+  ],
+  "trailingSlash": false,
+  "cleanUrls": true
}
```

---

## Command 4: Commit the Changes
```bash
git commit -m "fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings

- Add 'cleanUrls: true' to remove trailing slashes for consistent SPA routing
- Add 'trailingSlash: false' to ensure all nested routes resolve correctly
- vercel.json rewrite rule already catches all routes to /index.html
- This prevents hard-refresh 404 errors on nested routes like /broadcast/1
- Workbox navigateFallback is null (correct) - lets Vercel handle routing
- Admin and API routes are protected by service worker denylist"
```

**Expected output:**
```
[feature/fix-vercel-refresh xxxxxxx] fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings
 1 file changed, 2 insertions(+)
```

---

## Command 5: Verify Commit
```bash
git log -1 -p
```

**Expected output**: Shows the commit details and the vercel.json diff

---

## Command 6: Push to Remote
```bash
git push -u origin feature/fix-vercel-refresh
```

**Expected output:**
```
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 350 bytes | 350.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), reused pack 0 (delta 0)
remote: Resolving deltas: 100% (1/1), done.
remote: Create a pull request for 'feature/fix-vercel-refresh' on GitHub by visiting:
remote:      https://github.com/manch/Ride-Radar-2.0/pull/new/feature/fix-vercel-refresh
To github.com:manch/Ride-Radar-2.0.git
 * [new branch]      feature/fix-vercel-refresh -> feature/fix-vercel-refresh
Branch 'feature/fix-vercel-refresh' set up to track remote branch 'feature/fix-vercel-refresh' from 'origin'.
```

---

## Command 7: Create PR (Optional - Manual in GitHub UI or via CLI)

### Option A: Use GitHub CLI (if installed)
```bash
gh pr create --title "fix: Resolve Vercel hard-refresh 404s on nested routes" \
  --body "Fixes hard-refresh 404 errors on nested routes in Vercel deployments by adding cleanUrls and trailingSlash settings to vercel.json

## Changes
- vercel.json: Added 'cleanUrls: true' to normalize URLs
- vercel.json: Added 'trailingSlash: false' to remove trailing slashes
- This ensures all nested routes return index.html instead of 404

## Testing
1. Local: npm run build && npm run preview
2. Test hard-refresh on /broadcast/1, /messages, /profile/2
3. Vercel preview deployment will auto-test the fix

## Verification
- ✅ App.jsx uses BrowserRouter (client-side routing)
- ✅ vercel.json rewrite rule is correct
- ✅ Service worker denylist protects admin/api routes
- ✅ No breaking changes, minimal config update"
```

### Option B: Create PR in GitHub Web UI
1. Go to: https://github.com/manch/Ride-Radar-2.0
2. GitHub will show a prompt: "Compare & pull request"
3. Click the button
4. Fill in title and description (copy from Option A)
5. Click "Create pull request"

---

## Rollback (If Needed)

If you need to undo everything and go back to main:

```bash
# Delete the local feature branch
git checkout main
git branch -D feature/fix-vercel-refresh

# Or if branch already pushed:
git push origin --delete feature/fix-vercel-refresh
```

---

## Quick Reference

**All commands in one code block** (for copy-paste if needed):
```bash
git checkout -b feature/fix-vercel-refresh
git add vercel.json
git diff --cached
git commit -m "fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings

- Add 'cleanUrls: true' to remove trailing slashes for consistent SPA routing
- Add 'trailingSlash: false' to ensure all nested routes resolve correctly
- vercel.json rewrite rule already catches all routes to /index.html
- This prevents hard-refresh 404 errors on nested routes like /broadcast/1
- Workbox navigateFallback is null (correct) - lets Vercel handle routing
- Admin and API routes are protected by service worker denylist"
git log -1 -p
git push -u origin feature/fix-vercel-refresh
```

---

## Troubleshooting Common Git Errors

### Error: "fatal: not a git repository"
**Solution**: Make sure you're in the project directory
```bash
cd C:\Users\manch\Ride-Radar-2.0
```

### Error: "fatal: A branch named 'feature/fix-vercel-refresh' already exists"
**Solution**: Delete the old branch first
```bash
git branch -D feature/fix-vercel-refresh
git checkout -b feature/fix-vercel-refresh
```

### Error: "nothing to commit, working tree clean"
**Solution**: This means vercel.json wasn't modified. Verify the file:
```bash
cat vercel.json
```
Should show `"cleanUrls": true` and `"trailingSlash": false`

### Error: "Permission denied" when pushing
**Solution**: Check git credentials or SSH key setup
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## Verification After Deployment

Once changes are pushed and Vercel deploys:

1. Visit your preview deployment URL: `https://ride-radar-xxx.vercel.app`
2. Open browser DevTools (F12)
3. Navigate to a nested route like `/broadcast/1` in address bar
4. Hard-refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
5. Verify in Network tab:
   - `index.html` returns 200 status (not 404)
   - No errors in Console tab
   - Page loads with correct component rendered

✅ If all above checks pass, the fix is working!
