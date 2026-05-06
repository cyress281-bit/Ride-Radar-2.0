import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

/**
 * Supabase client for Ride Radar 2.0
 *
 * Features:
 * - Persistent auth sessions (localStorage)
 * - Automatic token refresh
 * - Real-time subscriptions
 * - Row-level security enforcement
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Keep user logged in across browser sessions
    autoRefreshToken: true, // Automatically refresh expired tokens
    detectSessionInUrl: true, // Handle OAuth redirects
    storage: window.localStorage, // Use localStorage (not sessionStorage)
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Rate limit real-time events
    }
  },
  db: {
    schema: 'public'
  }
});

/**
 * Helper function to get current auth token
 * Useful for API calls that need authorization header
 */
export async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

/**
 * Helper function to get current user ID
 */
export async function getCurrentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}
