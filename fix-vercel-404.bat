@echo off
REM Vercel 404 Fix - Git Commands Script
REM This script applies the necessary git commands to commit the Vercel 404 fix

echo.
echo ============================================================
echo Vercel Hard-Refresh 404 Fix - Git Commands
echo ============================================================
echo.

REM Create and switch to feature branch
echo [STEP 1/5] Creating and switching to feature branch...
git checkout -b feature/fix-vercel-refresh
if errorlevel 1 (
    echo Error: Failed to create branch. Ensure you have git installed and are in a git repository.
    exit /b 1
)
echo ✓ Branch created: feature/fix-vercel-refresh
echo.

REM Stage the vercel.json changes
echo [STEP 2/5] Staging vercel.json changes...
git add vercel.json
if errorlevel 1 (
    echo Error: Failed to stage vercel.json
    exit /b 1
)
echo ✓ vercel.json staged
echo.

REM Show the changes
echo [STEP 3/5] Changes to be committed:
echo.
git diff --cached
echo.

REM Commit the changes
echo [STEP 4/5] Committing changes...
git commit -m "fix: Configure Vercel SPA routing with cleanUrls and trailingSlash settings

- Add 'cleanUrls: true' to remove trailing slashes for consistent SPA routing
- Add 'trailingSlash: false' to ensure all nested routes resolve correctly
- vercel.json rewrite rule already catches all routes to /index.html
- This prevents hard-refresh 404 errors on nested routes like /broadcast/1
- Workbox navigateFallback is null (correct) - lets Vercel handle routing
- Admin and API routes are protected by service worker denylist"

if errorlevel 1 (
    echo Error: Failed to commit changes
    exit /b 1
)
echo ✓ Changes committed
echo.

REM Show branch info
echo [STEP 5/5] Branch information:
echo.
git log --oneline -1
echo.
echo ✓ Ready to push!
echo.
echo ============================================================
echo Next steps:
echo 1. Review the commit: git log -1 -p
echo 2. Push to remote: git push -u origin feature/fix-vercel-refresh
echo 3. Create a PR on GitHub
echo 4. Test on Vercel deployment preview
echo ============================================================
echo.
