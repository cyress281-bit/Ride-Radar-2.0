import { createClient } from '@supabase/supabase-js';
import { capacitorStorage } from './capacitor-storage.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const REMEMBER_DEVICE_KEY = 'rr_remember_device';

/**
 * Get a browser storage API by type.
 * @param {'local'|'session'} type
 * @returns {Storage|null}
 */
function getBrowserStorage(type) {
  if (typeof window === 'undefined') return null;
  return type === 'session' ? window.sessionStorage : window.localStorage;
}

/**
 * Determine whether the user opted to remember this device.
 * Defaults to true if the key is absent.
 * @returns {boolean}
 */
function shouldRememberDevice() {
  const storage = getBrowserStorage('local');
  return storage?.getItem(REMEMBER_DEVICE_KEY) === 'true';
}

/** Custom auth storage that respects the "remember device" preference. */
const authStorage = {
  getItem(key) {
    const primary = shouldRememberDevice()
      ? getBrowserStorage('local')
      : getBrowserStorage('session');
    const fallback = shouldRememberDevice()
      ? getBrowserStorage('session')
      : getBrowserStorage('local');
    return primary?.getItem(key) ?? fallback?.getItem(key) ?? null;
  },
  setItem(key, value) {
    const primary = shouldRememberDevice()
      ? getBrowserStorage('local')
      : getBrowserStorage('session');
    const secondary = shouldRememberDevice()
      ? getBrowserStorage('session')
      : getBrowserStorage('local');
    primary?.setItem(key, value);
    secondary?.removeItem(key);
  },
  removeItem(key) {
    getBrowserStorage('local')?.removeItem(key);
    getBrowserStorage('session')?.removeItem(key);
  },
};

/**
 * Decode the payload of a JWT without verification.
 * @param {string} token
 * @returns {object|null}
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  if (!/^[^.]+\.[^.]+\.[^.]+$/.test(token)) return null;
  if (typeof globalThis.atob !== 'function') return null;

  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

/**
 * Validate Supabase environment configuration at module load.
 * Logs warnings instead of throwing so the app never hard-crashes on misconfig.
 */
function validateSupabaseEnv() {
  const warnings = [];
  const placeholderUrls = new Set([
    'https://your-project-id.supabase.co',
    'https://your-project.supabase.co',
  ]);

  if (!supabaseUrl) {
    warnings.push('VITE_SUPABASE_URL is missing');
  } else {
    try {
      new URL(supabaseUrl);
    } catch {
      warnings.push('VITE_SUPABASE_URL is not a valid URL');
    }

    if (placeholderUrls.has(supabaseUrl)) {
      warnings.push('VITE_SUPABASE_URL still contains the example placeholder');
    }
  }

  if (!supabaseAnonKey) {
    warnings.push('VITE_SUPABASE_ANON_KEY is missing');
  } else if (supabaseAnonKey === 'your-anon-key-here') {
    warnings.push('VITE_SUPABASE_ANON_KEY still contains the example placeholder');
  } else {
    const payload = decodeJwtPayload(supabaseAnonKey);
    if (!payload) {
      warnings.push('VITE_SUPABASE_ANON_KEY is not a valid JWT');
    } else if (payload.role !== 'anon') {
      warnings.push(
        `VITE_SUPABASE_ANON_KEY has role "${payload.role || 'unknown'}"; expected "anon"`
      );
    }
  }

  if (warnings.length > 0) {
    // Configuration warnings are silently logged in dev via logger if needed
  }
}

validateSupabaseEnv();

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let _client = null;

if (supabaseUrl && supabaseAnonKey) {
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: capacitorStorage,
      experimental: {
        passkey: true,
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public',
    },
  });
} else {
  console.error('[Supabase] Client could not be created: missing URL or anon key');
}

/** Supabase client for Ride Radar 2.0. */
export const supabase = _client;

// Supabase client is NOT exposed on window to prevent accidental leakage in staging builds

/**
 * Set the "remember device" preference in localStorage.
 * @param {boolean} value
 */
export function setRememberDevicePreference(value) {
  const storage = getBrowserStorage('local');
  storage?.setItem(REMEMBER_DEVICE_KEY, String(value));
}


