@echo off
REM PWA Setup Script for Ride Radar 2.0
REM Checks PWA readiness and generates missing assets

echo.
echo 🚀 Ride Radar PWA Setup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Check if public directory exists
if not exist "public\" (
  echo ❌ Error: public\ directory not found
  exit /b 1
)

echo ✓ Found public\ directory

REM Check for manifest.json
if exist "public\manifest.json" (
  echo ✓ manifest.json exists
) else (
  echo ❌ manifest.json not found
)

REM Check for icon source
if exist "public\icon.svg" (
  echo ✓ icon.svg exists
) else (
  echo ❌ icon.svg not found
)

REM Check for PNG icons
set MISSING_ICONS=0

if exist "public\icon-192.png" (
  echo ✓ icon-192.png exists
) else (
  echo ⚠️  icon-192.png not found
  set MISSING_ICONS=1
)

if exist "public\icon-512.png" (
  echo ✓ icon-512.png exists
) else (
  echo ⚠️  icon-512.png not found
  set MISSING_ICONS=1
)

echo.

REM If icons are missing, show instructions
if %MISSING_ICONS%==1 (
  echo 📱 PWA Icons Missing
  echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  echo.
  echo To generate PWA icons, choose one option:
  echo.
  echo Option 1: Browser Generator ^(Recommended^)
  echo   1. Open public\create-icon-placeholders.html in a browser
  echo   2. Click "Download 192x192" and "Download 512x512"
  echo   3. Save files as icon-192.png and icon-512.png in public\
  echo.
  echo Option 2: ImageMagick ^(if installed^)
  echo   magick -density 300 -background none public\icon.svg -resize 192x192 public\icon-192.png
  echo   magick -density 300 -background none public\icon.svg -resize 512x512 public\icon-512.png
  echo.
  echo Option 3: Online Converter
  echo   https://cloudconvert.com/svg-to-png
  echo.
) else (
  echo ✅ All PWA assets present
  echo.
  echo Next steps:
  echo   1. npm install        # Install dependencies
  echo   2. npm run build      # Build with service worker
  echo   3. npm run preview    # Test PWA locally
  echo.
  echo Test offline mode:
  echo   - Open DevTools → Network tab
  echo   - Set to "Offline"
  echo   - Navigate through app
  echo.
)

REM Check vite-plugin-pwa in package.json
findstr /C:"vite-plugin-pwa" package.json >nul 2>&1
if %errorlevel%==0 (
  echo ✓ vite-plugin-pwa installed
) else (
  echo ❌ vite-plugin-pwa not found in package.json
  echo    Run: npm install vite-plugin-pwa workbox-window
)

echo.
echo 📚 Documentation:
echo   - PWA_IMPLEMENTATION.md   # Full implementation guide
echo   - PWA_TESTING_GUIDE.md     # Testing checklist
echo   - public\README-ICONS.md   # Icon generation guide
echo.

pause
