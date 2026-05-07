#!/bin/bash
# Vercel 404 Fix - Git Commands (Linux/Mac version)
# Usage: bash fix-vercel-404.sh

set -e

echo ""
echo "============================================================"
echo "Vercel Hard-Refresh 404 Fix - Git Commands"
echo "============================================================"
echo ""

# Create and switch to feature branch
echo "[STEP 1/5] Creating and switching to feature branch..."
git checkout -b feature/fix-vercel-refresh
echo "✓ Branch created: feature/fix-vercel-refresh"
echo ""

# Stage the vercel.json changes
echo "[STEP 2/5] Staging vercel.json changes..."
git add vercel.json
echo "✓ vercel.json staged"
echo ""

# Show the changes
echo "[STEP 3/5] Changes to be committed:"
echo ""
git diff --cached
echo ""

# Commit the changes
echo "[STEP 4/5] Committing changes..."
git commit -m "fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings

- Add 'cleanUrls: true' to remove trailing slashes for consistent SPA routing
- Add 'trailingSlash: false' to ensure all nested routes resolve correctly
- vercel.json rewrite rule already catches all routes to /index.html
- This prevents hard-refresh 404 errors on nested routes like /broadcast/1
- Workbox navigateFallback is null (correct) - lets Vercel handle routing
- Admin and API routes are protected by service worker denylist"

echo "✓ Changes committed"
echo ""

# Show branch info
echo "[STEP 5/5] Branch information:"
echo ""
git log --oneline -1
echo ""
echo "✓ Ready to push!"
echo ""
echo "============================================================"
echo "Next steps:"
echo "1. Review the commit: git log -1 -p"
echo "2. Push to remote: git push -u origin feature/fix-vercel-refresh"
echo "3. Create a PR on GitHub"
echo "4. Test on Vercel deployment preview"
echo "============================================================"
echo ""
