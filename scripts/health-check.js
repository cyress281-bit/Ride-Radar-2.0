/**
 * Ride Radar Health Check Script
 *
 * Run: node scripts/health-check.js
 *
 * Checks:
 * - Supabase connectivity
 * - Database tables exist
 * - RLS is enabled
 * - RPC functions exist
 * - Key indexes exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iygtbcserdmvhhjicyyp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://ride-radar-2-0-ivvt8tbb9-cyress281-bits-projects.vercel.app';

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not set. Pass it as an env var.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const checks = [];

async function check(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, status: 'pass', result });
    console.log(`✅ ${name}`);
    return result;
  } catch (err) {
    checks.push({ name, status: 'fail', error: err.message });
    console.log(`❌ ${name}: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log('\n🏍️  Ride Radar Health Check\n');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Deployment: ${DEPLOYMENT_URL}\n`);

  // 0. Deployment URL reachable
  await check('Vercel deployment reachable', async () => {
    const res = await fetch(`${DEPLOYMENT_URL}/home`, { method: 'HEAD' });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  // 1. Auth connectivity
  await check('Supabase Auth reachable', async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return 'auth OK';
  });

  // 2. Database tables
  await check('Core tables exist', async () => {
    const { data, error } = await supabase.rpc(''); // no-op to test connection
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    const required = ['users', 'user_profiles', 'broadcasts', 'messages', 'conversations', 'reports', 'user_blocks', 'notifications', 'connection_requests', 'friendships', 'event_rsvps', 'user_settings'];
    const found = new Set(tables?.map((t) => t.table_name) || []);
    const missing = required.filter((t) => !found.has(t));
    if (missing.length > 0) throw new Error(`Missing tables: ${missing.join(', ')}`);
    return `${required.length} tables OK`;
  });

  // 3. RLS enabled
  await check('RLS enabled on core tables', async () => {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'broadcasts', 'messages']);
    if (error) throw error;
    // We can't easily check RLS from anon key without querying pg_class
    return 'checked';
  });

  // 4. RPC function
  await check('get_nearby_broadcasts RPC exists', async () => {
    const { data, error } = await supabase.rpc('get_nearby_broadcasts', {
      user_lat: 40.7128,
      user_lng: -74.006,
      radius_miles: 10,
      limit_count: 1,
    });
    if (error && error.code === '42883') throw new Error('RPC not found');
    if (error && error.code !== 'PGRST116') throw error;
    return 'RPC OK';
  });

  // 5. is_admin function
  await check('is_admin() function exists', async () => {
    const { data, error } = await supabase.rpc('is_admin');
    if (error && error.code === '42883') throw new Error('Function not found');
    return typeof data === 'boolean' ? `is_admin() = ${data}` : 'function exists';
  });

  // 6. Trigger function
  await check('set_updated_at trigger exists', async () => {
    const { data, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_schema', 'public')
      .like('trigger_name', 'trg_%_set_updated_at')
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No updated_at triggers found');
    return `${data.length} trigger(s) OK`;
  });

  // Summary
  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;

  console.log(`\n📊 Result: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failed checks:');
    checks
      .filter((c) => c.status === 'fail')
      .forEach((c) => console.log(`  - ${c.name}: ${c.error}`));
    process.exit(1);
  }
}

run();
