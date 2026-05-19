/**
 * @fileoverview Supabase auth API wrappers for Ride Radar 2.0.
 *
 * All functions return `{ data, error }` shapes and do NOT throw.
 * The calling hooks/components decide whether to surface errors.
 */

import { supabase } from '@/lib/supabase.js';
import { setRememberDevicePreference } from '@/lib/supabase.js';

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @param {{ rememberDevice?: boolean }} [options]
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function signInWithEmail(email, password, options = {}) {
  setRememberDevicePreference(options.rememberDevice !== false);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Sign up with email and password.
 * @param {string} email
 * @param {string} password
 * @param {{ rememberDevice?: boolean }} [options]
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function signUpWithEmail(email, password, options = {}) {
  setRememberDevicePreference(options.rememberDevice !== false);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: email.split('@')[0] },
    },
  });
  return { data, error };
}

/**
 * Sign in with an OAuth provider (e.g. 'google').
 * @param {string} provider
 * @param {{ rememberDevice?: boolean, redirectTo?: string }} [options]
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function signInWithOAuth(provider, options = {}) {
  setRememberDevicePreference(options.rememberDevice !== false);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: options.redirectTo || `${window.location.origin}/login`,
    },
  });
  return { data, error };
}

/**
 * Sign out the current user.
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function signOut() {
  const { data, error } = await supabase.auth.signOut();
  return { data, error };
}

/**
 * Get the current session.
 * @returns {Promise<{ data: { session: object|null }, error: Error|null }>}
 */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Subscribe to auth state changes.
 * @param {(event: string, session: object|null) => void} callback
 * @returns {{ unsubscribe: () => void }}
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  return { data, error };
}

/**
 * Request an email change for the current user.
 * @param {string} email
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function updateEmail(email) {
  const { data, error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}/settings/account` }
  );
  return { data, error };
}

/**
 * Update the current user's password.
 * @param {string} newPassword
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}
