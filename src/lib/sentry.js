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
 * Only runs in production mode when VITE_SENTRY_DSN is configured.
 * Includes:
 * - Error tracking with context
 * - Performance monitoring
 * - Session replay for debugging
 * - React Router integration
 * - User context from Supabase auth
 */
export function initializeSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production';
  const isProd = import.meta.env.PROD;

  // Only initialize in production with valid DSN
  if (!isProd || !dsn) {
    console.log('[Sentry] Skipped initialization (dev mode or no DSN)');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Release tracking (from package.json version)
    release: `ride-radar@${import.meta.env.VITE_APP_VERSION || '2.0.0'}`,

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

      // Session replay for visual debugging
      Sentry.replayIntegration({
        // Only record sessions with errors (privacy-focused)
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),

      // Breadcrumbs for console logs
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],

    // Performance monitoring sample rate
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in staging

    // Session replay sample rates
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

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

      return event;
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

  console.log(`[Sentry] Initialized (${environment})`);
}

/**
 * Set user context for Sentry
 * Call this when user signs in
 */
export function setSentryUser(user, profile) {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

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
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry
 */
export function setSentryContext(key, value) {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.setContext(key, value);
}

/**
 * Manually capture an error in Sentry
 */
export function captureError(error, context = {}) {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) {
    console.error('[Sentry] Error captured (dev mode):', error, context);
    return;
  }

  Sentry.captureException(error, { extra: context });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(message, data = {}) {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}
