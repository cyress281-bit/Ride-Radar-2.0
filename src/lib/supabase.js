import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const REMEMBER_DEVICE_KEY = 'rr_remember_device';

const getBrowserStorage = (type) => {
  if (typeof window === 'undefined') return null;
  return type === 'session' ? window.sessionStorage : window.localStorage;
};

const shouldRememberDevice = () => {
  const storage = getBrowserStorage('local');
  return storage?.getItem(REMEMBER_DEVICE_KEY) !== 'false';
};

const authStorage = {
  getItem(key) {
    const primary = shouldRememberDevice() ? getBrowserStorage('local') : getBrowserStorage('session');
    const fallback = shouldRememberDevice() ? getBrowserStorage('session') : getBrowserStorage('local');
    return primary?.getItem(key) ?? fallback?.getItem(key) ?? null;
  },
  setItem(key, value) {
    const primary = shouldRememberDevice() ? getBrowserStorage('local') : getBrowserStorage('session');
    const secondary = shouldRememberDevice() ? getBrowserStorage('session') : getBrowserStorage('local');
    primary?.setItem(key, value);
    secondary?.removeItem(key);
  },
  removeItem(key) {
    getBrowserStorage('local')?.removeItem(key);
    getBrowserStorage('session')?.removeItem(key);
  },
};

export function setRememberDevicePreference(remember) {
  const local = getBrowserStorage('local');
  local?.setItem(REMEMBER_DEVICE_KEY, remember ? 'true' : 'false');
}

const getSupabaseProjectRef = (url) => {
  try {
    const { hostname } = new URL(url);
    if (!hostname.endsWith('.supabase.co')) return null;
    return hostname.split('.')[0];
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  if (!/^[^.]+\.[^.]+\.[^.]+$/.test(token) || typeof globalThis.atob !== 'function') {
    return null;
  }

  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(globalThis.atob(paddedPayload));
  } catch {
    return null;
  }
};

const validateSupabaseEnv = () => {
  const errors = [];
  const placeholderUrls = new Set([
    'https://your-project-id.supabase.co',
    'https://your-project.supabase.co',
  ]);

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is missing');
  } else {
    try {
      new URL(supabaseUrl);
    } catch {
      errors.push('VITE_SUPABASE_URL must be a valid URL');
    }

    if (placeholderUrls.has(supabaseUrl)) {
      errors.push('VITE_SUPABASE_URL still contains the example placeholder');
    }
  }

  if (!supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is missing');
  } else if (supabaseAnonKey === 'your-anon-key-here') {
    errors.push('VITE_SUPABASE_ANON_KEY still contains the example placeholder');
  } else if (!supabaseAnonKey.startsWith('sb_publishable_')) {
    const keyPayload = decodeJwtPayload(supabaseAnonKey);

    if (!keyPayload) {
      errors.push('VITE_SUPABASE_ANON_KEY must be a valid anon JWT or publishable key');
    } else if (keyPayload.role !== 'anon') {
      errors.push(`VITE_SUPABASE_ANON_KEY has role "${keyPayload.role || 'unknown'}"; expected "anon"`);
    }

    const urlProjectRef = supabaseUrl ? getSupabaseProjectRef(supabaseUrl) : null;
    if (keyPayload?.ref && urlProjectRef && keyPayload.ref !== urlProjectRef) {
      errors.push('VITE_SUPABASE_URL project ref does not match VITE_SUPABASE_ANON_KEY');
    }
  }

  if (errors.length > 0) {
    const message = `Invalid Supabase environment configuration: ${errors.join('; ')}`;
    logger.error(message);
    throw new Error(message);
  }
};

validateSupabaseEnv();

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
    storage: authStorage,
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

logger.debug('[Supabase] Client initialized');

// Expose for debugging only in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.supabase = supabase;
  logger.debug('[Supabase] Client exposed as window.supabase for debugging');
}

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
