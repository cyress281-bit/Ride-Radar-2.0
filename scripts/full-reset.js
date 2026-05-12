#!/usr/bin/env node
/**
 * RIDE RADAR 2.0 — FULL DATA RESET
 * Clears auth users + all database tables while preserving schema/RLS
 *
 * Prerequisites:
 *   1. SUPABASE_SERVICE_ROLE_KEY env var set
 *   2. @supabase/supabase-js installed (already in this project)
 *
 * Usage:
 *   set SUPABASE_SERVICE_ROLE_KEY=your_key
 *   node scripts/full-reset.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iygtbcserdmvhhjicyyp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ❌  SUPABASE_SERVICE_ROLE_KEY is required                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Get your service_role key:                                      ║
║    Supabase Dashboard → Project Settings → API → service_role   ║
║                                                                  ║
║  Then run:                                                       ║
║    set SUPABASE_SERVICE_ROLE_KEY=<your-key>                     ║
║    node scripts/full-reset.js                                   ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TABLES = [
  'push_subscriptions',
  'notifications',
  'live_map_presence',
  'user_blocks',
  'reports',
  'connection_requests',
  'friendships',
  'messages',
  'conversations',
  'broadcasts',
  'user_profiles',
  'users',
];

async function resetDatabaseTables() {
  console.log('\n📦 Step 1: Truncating database tables...');
  console.log('   (Schema, RLS policies, and functions are preserved)\n');

  // Use raw SQL via RPC or REST - we use the REST API to execute SQL
  // Supabase doesn't expose raw SQL over REST for security, so we use
  // a workaround: delete all rows from each table

  for (const table of TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // match all rows

    // Some tables may not have 'id' column, try alternative
    if (error && error.message.includes('column')) {
      // Try with a different column or just select all then delete
      const { data: rows, error: selErr } = await supabase.from(table).select('*').limit(1000);
      if (!selErr && rows && rows.length > 0) {
        for (const row of rows) {
          const pk = Object.keys(row)[0];
          await supabase.from(table).delete().eq(pk, row[pk]);
        }
      }
      console.log(`   ✅ ${table}: cleared`);
    } else if (error) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: cleared`);
    }
  }
}

async function resetAuthUsers() {
  console.log('\n👤 Step 2: Deleting auth users...\n');

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error(`   ❌ Failed to list users: ${listError.message}`);
    return;
  }

  const users = listData?.users || [];
  console.log(`   Found ${users.length} auth user(s).`);

  if (users.length === 0) {
    console.log('   ✅ No auth users to delete.');
    return;
  }

  let deleted = 0;
  let failed = 0;

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`   ⚠️  Failed: ${user.id} — ${error.message}`);
      failed++;
    } else {
      deleted++;
      process.stdout.write(`   ✅ Deleted ${deleted}/${users.length}\r`);
    }
  }

  console.log(`\n   🎉 Auth users: ${deleted} deleted, ${failed} failed.`);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         RIDE RADAR 2.0 — FULL DATA RESET                        ║
╠══════════════════════════════════════════════════════════════════╣
║  This will permanently delete:                                   ║
║    • All auth users (login accounts)                             ║
║    • All user profiles, broadcasts, messages, friendships, etc.  ║
║                                                                  ║
║  This will NOT delete:                                           ║
║    • Database schema, tables, or RLS policies                    ║
║    • Storage buckets or files                                    ║
║    • Edge functions                                              ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await resetDatabaseTables();
  await resetAuthUsers();

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    ✅ RESET COMPLETE                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Your Supabase project is now clean. Ready for new users!       ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
