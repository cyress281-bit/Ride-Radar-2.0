# PWA Icons

This directory contains icons for the Ride Radar Progressive Web App.

## Required Files

- `icon-192.png` - 192x192px icon (required for PWA)
- `icon-512.png` - 512x512px icon (required for PWA)
- `icon.svg` - Source SVG for generating PNG icons

## Generating Icons

### Option 1: Using the HTML Generator

1. Open `create-icon-placeholders.html` in a browser
2. The icons will be drawn on canvas elements
3. Click "Download 192x192" and "Download 512x512" buttons
4. Save the files as `icon-192.png` and `icon-512.png` in this directory

### Option 2: Using ImageMagick (if installed)

```bash
# Install ImageMagick first: https://imagemagick.org/

# Generate 192x192
convert -density 300 -background none icon.svg -resize 192x192 icon-192.png

# Generate 512x512
convert -density 300 -background none icon.svg -resize 512x512 icon-512.png
```

### Option 3: Using Online Tools

1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Set dimensions to 192x192 and 512x512
4. Download and save as `icon-192.png` and `icon-512.png`

### Option 4: Using Design Tools

Export from Figma, Sketch, Adobe Illustrator, etc. at:
- 192x192px (any maskable)
- 512x512px (any maskable)

## Icon Design

The current icon features:
- Dark background (#080808) matching app theme
- Neon green (#beff00) "RR" letters
- Radar circle background effect
- Rounded corners for iOS/Android compatibility

## Maskable Icons

Both icons use `"purpose": "any maskable"` in the manifest, meaning they work as:
- Standard icons (with padding)
- Maskable icons (full bleed, safe zone in center)

Ensure important content (RR letters) stays within the safe zone (center 80% of canvas).
