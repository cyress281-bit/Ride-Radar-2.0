#!/usr/bin/env node
/**
 * Remove old preview deployments from Vercel (keeps production)
 * Usage: node scripts/clear-vercel-deployments.js
 */

const { execSync } = require('child_process');

const PROJECT = 'ride-radar-2-0';

function getDeployments() {
  try {
    const out = execSync(`npx vercel list ${PROJECT} --yes 2>nul`, { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    console.error('❌ Failed to list deployments. Make sure you are logged into Vercel CLI.');
    return [];
  }
}

async function clearPreviewDeployments() {
  console.log('🔍 Fetching Vercel deployments...\n');
  const urls = getDeployments();

  if (urls.length === 0) {
    console.log('✅ No deployments found.');
    return;
  }

  console.log(`Found ${urls.length} deployment(s):`);
  urls.forEach(u => console.log(`  • ${u}`));

  // Get production URL
  let prodUrl;
  try {
    const info = execSync(`npx vercel inspect ${PROJECT} --yes 2>nul`, { encoding: 'utf8' });
    const match = info.match(/https:\/\/[^\s]+/);
    prodUrl = match ? match[0] : null;
  } catch { /* ignore */ }

  console.log(`\n🛡️  Production URL (will be kept): ${prodUrl || 'unknown'}`);
  console.log('\n⚠️  This will remove ALL preview deployments. Press Ctrl+C to cancel.');
  console.log('    Starting in 5 seconds...\n');

  await new Promise(r => setTimeout(r, 5000));

  let removed = 0;
  for (const url of urls) {
    if (prodUrl && url === prodUrl) {
      console.log(`   ⏭️  Skipping production: ${url}`);
      continue;
    }
    try {
      execSync(`npx vercel remove "${url}" --yes 2>nul`, { stdio: 'ignore' });
      console.log(`   🗑️  Removed: ${url}`);
      removed++;
    } catch {
      console.log(`   ⚠️  Failed to remove: ${url}`);
    }
  }

  console.log(`\n🎉 Done! Removed ${removed} preview deployment(s).`);
}

clearPreviewDeployments().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
