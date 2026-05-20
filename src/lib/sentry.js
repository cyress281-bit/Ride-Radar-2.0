import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * Only runs when VITE_SENTRY_DSN is configured.
 * Includes:
 * - Error tracking with context
 * - Conservative browser tracing
 * - React Router integration
 * - User context from Supabase auth
 *
 * Required Vercel env vars:
 * - VITE_SENTRY_DSN: browser DSN from the Ride Radar Sentry project
 * - VITE_APP_ENV: optional environment label, e.g. production, preview, beta
 */
// PII patterns to scrub from all Sentry event data
const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // emails
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT tokens
  /[a-f0-9]{32,}/gi, // long hex strings (API keys, hashes)
];

const SENSITIVE_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'apikey',
  'api_key',
  'supabasekey',
  'email',
  'body',
  'message',
  'content',
  'text',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'location',
];

function scrubString(str) {
  if (typeof str !== 'string') return str;
  return SENSITIVE_PATTERNS.reduce(
    (s, pattern) => s.replace(pattern, '[REDACTED]'),
    str
  );
}

function isSensitiveKey(key) {
  const normalized = String(key || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

function scrubValue(value, key = '') {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        scrubValue(entryValue, entryKey),
      ])
    );
  }
  return value;
}

function scrubEvent(event) {
  // Scrub message
  if (event.message) {
    event.message = scrubString(event.message);
  }
  // Scrub exception values
  if (event.exception?.values) {
    event.exception.values.forEach((ex) => {
      if (ex.value) ex.value = scrubString(ex.value);
      if (ex.stacktrace?.frames) {
        ex.stacktrace.frames.forEach((frame) => {
          if (frame.vars) {
            Object.keys(frame.vars).forEach((k) => {
              frame.vars[k] = scrubString(frame.vars[k]);
            });
          }
        });
      }
    });
  }
  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach((bc) => {
      if (bc.message) bc.message = scrubString(bc.message);
      if (bc.data) {
        bc.data = scrubValue(bc.data);
      }
    });
  }
  if (event.extra) event.extra = scrubValue(event.extra);
  if (event.contexts) event.contexts = scrubValue(event.contexts);
  if (event.request) event.request = scrubValue(event.request);
  // Scrub user context (keep id but not email/name)
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.name;
    delete event.user.ip_address;
  }
  return event;
}

export function initializeSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Release tracking (from package.json version)
    release: `ride-radar@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,

    // Global tags for crash reporting metadata
    initialScope: {
      tags: {
        'app.version': import.meta.env.VITE_APP_VERSION || '2.0.0',
        'app.environment': environment,
      },
    },

    // Performance monitoring
    integrations: [
      // React Router integration for accurate route tracking
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),

      // Breadcrumbs for console logs
      Sentry.breadcrumbsIntegration({
        console: false,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],

    tracesSampleRate: environment === 'production' ? 0.05 : 0,

    // Filter out expected errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Don't send chunk load errors (handled by ChunkErrorBoundary)
      if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
        return null;
      }

      // Don't send network timeout errors (user's connection issue)
      if (error && error.message && error.message.includes('NetworkError')) {
        return null;
      }

      // Don't send Supabase auth errors (expected for logged-out users)
      if (error && error.message && error.message.includes('Auth session missing')) {
        return null;
      }

      return scrubEvent(event);
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Network request failed',
      // ResizeObserver (benign)
      'ResizeObserver loop limit exceeded',
    ],

    // Don't track sensitive data
    beforeBreadcrumb(breadcrumb) {
      // Filter out query params that might contain sensitive data
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data && breadcrumb.data.url) {
          breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
        }
      }
      return breadcrumb;
    },
  });


}

/**
 * Set user context for Sentry
 * Call this when user signs in
 */
export function setSentryUser(user, profile) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setUser({
    id: user?.id,
    // Don't send PII (email, name, etc.)
    // Only send non-identifying metadata
    is_public: profile?.is_public,
    has_bike: !!profile?.bike_make,
  });
}

/**
 * Clear user context from Sentry
 * Call this when user signs out
 */
export function clearSentryUser() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(key, value) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setContext(key, scrubValue(value));
}

/**
 * Manually capture an error in Sentry
 */
export function captureError(error, context = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, { extra: scrubValue(context) });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(message, data = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message: scrubString(message),
    data: scrubValue(data),
    level: 'info',
  });
}
