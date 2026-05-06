#!/bin/bash

# PWA Setup Script for Ride Radar 2.0
# Checks PWA readiness and generates missing assets

echo "🚀 Ride Radar PWA Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if public directory exists
if [ ! -d "public" ]; then
  echo "❌ Error: public/ directory not found"
  exit 1
fi

echo "✓ Found public/ directory"

# Check for manifest.json
if [ -f "public/manifest.json" ]; then
  echo "✓ manifest.json exists"
else
  echo "❌ manifest.json not found"
fi

# Check for icon source
if [ -f "public/icon.svg" ]; then
  echo "✓ icon.svg exists"
else
  echo "❌ icon.svg not found"
fi

# Check for PNG icons
MISSING_ICONS=0

if [ -f "public/icon-192.png" ]; then
  echo "✓ icon-192.png exists"
else
  echo "⚠️  icon-192.png not found"
  MISSING_ICONS=1
fi

if [ -f "public/icon-512.png" ]; then
  echo "✓ icon-512.png exists"
else
  echo "⚠️  icon-512.png not found"
  MISSING_ICONS=1
fi

echo ""

# If icons are missing, show instructions
if [ $MISSING_ICONS -eq 1 ]; then
  echo "📱 PWA Icons Missing"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "To generate PWA icons, choose one option:"
  echo ""
  echo "Option 1: Browser Generator (Recommended)"
  echo "  1. Open public/create-icon-placeholders.html in a browser"
  echo "  2. Click 'Download 192x192' and 'Download 512x512'"
  echo "  3. Save files as icon-192.png and icon-512.png in public/"
  echo ""
  echo "Option 2: ImageMagick (if installed)"
  echo "  convert -density 300 -background none public/icon.svg -resize 192x192 public/icon-192.png"
  echo "  convert -density 300 -background none public/icon.svg -resize 512x512 public/icon-512.png"
  echo ""
  echo "Option 3: Online Converter"
  echo "  https://cloudconvert.com/svg-to-png"
  echo ""
else
  echo "✅ All PWA assets present"
  echo ""
  echo "Next steps:"
  echo "  1. npm install        # Install dependencies"
  echo "  2. npm run build      # Build with service worker"
  echo "  3. npm run preview    # Test PWA locally"
  echo ""
  echo "Test offline mode:"
  echo "  - Open DevTools → Network tab"
  echo "  - Set to 'Offline'"
  echo "  - Navigate through app"
  echo ""
fi

# Check vite-plugin-pwa in package.json
if grep -q "vite-plugin-pwa" package.json; then
  echo "✓ vite-plugin-pwa installed"
else
  echo "❌ vite-plugin-pwa not found in package.json"
  echo "   Run: npm install vite-plugin-pwa workbox-window"
fi

echo ""
echo "📚 Documentation:"
echo "  - PWA_IMPLEMENTATION.md   # Full implementation guide"
echo "  - PWA_TESTING_GUIDE.md     # Testing checklist"
echo "  - public/README-ICONS.md   # Icon generation guide"
echo ""
