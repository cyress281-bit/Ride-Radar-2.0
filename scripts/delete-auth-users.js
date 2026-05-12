/**
 * Delete ALL auth users from Supabase.
 *
 * Usage:
 *   node scripts/delete-auth-users.js <service_role_key>
 *
 * Requires the Supabase SERVICE_ROLE key (NOT the anon key).
 * Get it from: https://supabase.com/dashboard/project/_/settings/api
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iygtbcserdmvhhjicyyp.supabase.co';
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('Usage: node scripts/delete-auth-users.js <service_role_key>');
  console.error('Get your service role key from Supabase Dashboard > Project Settings > API > service_role');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteAllUsers() {
  console.log('Fetching all auth users...');

  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('Failed to list users:', error.message);
      process.exit(1);
    }

    if (!data.users.length) break;

    allUsers.push(...data.users);
    page++;
  }

  console.log(`Found ${allUsers.length} auth user(s).`);

  if (allUsers.length === 0) {
    console.log('No auth users to delete.');
    return;
  }

  let deleted = 0;
  let failed = 0;

  for (const user of allUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`  Failed to delete ${user.id}: ${error.message}`);
      failed++;
    } else {
      deleted++;
    }
  }

  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}`);
}

deleteAllUsers().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
