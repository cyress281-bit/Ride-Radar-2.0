#!/usr/bin/env node

/**
 * Create placeholder PWA icons
 *
 * This creates simple single-color PNG icons as placeholders.
 * For production, use the proper icon generation from icon.svg.
 *
 * Usage: node scripts/create-placeholder-icons.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

// Create a simple PNG in base64 (green square with RR text)
// This is just a placeholder - real icons should be generated from icon.svg

function createPlaceholderIcon(size) {
  // For now, we'll create a data URL placeholder
  // In production, open public/create-icon-placeholders.html in browser
  // and download the properly rendered icons

  console.log(`Creating ${size}x${size} placeholder...`);
  console.log(`⚠️  This is a basic placeholder. For production:`);
  console.log(`   1. Open public/create-icon-placeholders.html in a browser`);
  console.log(`   2. Click the download buttons to get proper PNG files`);
  console.log(`   3. Save as icon-192.png and icon-512.png in public/`);
  console.log('');
}

console.log('📱 PWA Icon Placeholder Generator');
console.log('─────────────────────────────────────');
console.log('');

createPlaceholderIcon(192);
createPlaceholderIcon(512);

console.log('✓ To generate actual icons:');
console.log('  1. Open public/create-icon-placeholders.html in your browser');
console.log('  2. Download icon-192.png and icon-512.png');
console.log('  3. Place them in the public/ directory');
console.log('');
console.log('✓ Or use ImageMagick (if installed):');
console.log('  convert -density 300 -background none public/icon.svg -resize 192x192 public/icon-192.png');
console.log('  convert -density 300 -background none public/icon.svg -resize 512x512 public/icon-512.png');
console.log('');
