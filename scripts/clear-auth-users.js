#!/usr/bin/env node
/**
 * Clear all auth users from Supabase
 * Usage: node scripts/clear-auth-users.js
 * Requires: SUPABASE_SERVICE_ROLE_KEY env var or prompt
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iygtbcserdmvhhjicyyp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is required.');
  console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key');
  console.error('   Then run:    set SUPABASE_SERVICE_ROLE_KEY=your_key && node scripts/clear-auth-users.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function clearAuthUsers() {
  console.log('🔍 Fetching all auth users...');
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const users = listData?.users || [];
  console.log(`🗑️  Found ${users.length} auth user(s) to delete.`);

  if (users.length === 0) {
    console.log('✅ No auth users to delete.');
    return;
  }

  let deleted = 0;
  let failed = 0;

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`   ⚠️  Failed to delete ${user.id}: ${error.message}`);
      failed++;
    } else {
      deleted++;
      process.stdout.write(`   ✅ Deleted ${deleted}/${users.length}\r`);
    }
  }

  console.log(`\n🎉 Done! Deleted ${deleted} user(s). ${failed > 0 ? `Failed: ${failed}` : ''}`);
}

clearAuthUsers().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
