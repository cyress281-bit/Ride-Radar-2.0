import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';
import { captureError, setSentryContext } from './sentry';
import { trackEvent } from './analytics';
import { logger } from './logger';

/**
 * Performance monitoring utilities for Ride Radar 2.0
 *
 * Tracks:
 * - Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 * - TanStack Query performance
 * - Real-time subscription connection times
 * - Image load times
 * - Route transition times
 */

// Performance thresholds (based on Core Web Vitals recommendations)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

/**
 * Initialize Core Web Vitals monitoring
 * Call this once in main.jsx
 */
export function initializeWebVitals() {
  if (!import.meta.env.PROD) {
    return;
  }

  // Largest Contentful Paint (loading performance)
  onLCP((metric) => {
    reportWebVital('LCP', metric);
  });

  // First Input Delay (interactivity)
  onFID((metric) => {
    reportWebVital('FID', metric);
  });

  // Cumulative Layout Shift (visual stability)
  onCLS((metric) => {
    reportWebVital('CLS', metric);
  });

  // Time to First Byte (server response time)
  onTTFB((metric) => {
    reportWebVital('TTFB', metric);
  });

  // Interaction to Next Paint (responsiveness)
  onINP((metric) => {
    reportWebVital('INP', metric);
  });


}

/**
 * Report a web vital metric to Sentry and analytics
 */
function reportWebVital(name, metric) {
  const { value, rating } = metric;
  const threshold = THRESHOLDS[name];

  // Determine if metric is good/needs-improvement/poor
  let status = 'good';
  if (threshold) {
    if (value > threshold.poor) {
      status = 'poor';
    } else if (value > threshold.good) {
      status = 'needs-improvement';
    }
  }

  // Send to Sentry as measurement
  setSentryContext('web-vitals', {
    [name]: {
      value: Math.round(value),
      rating,
      status,
    },
  });

  // Track in analytics (aggregate only, no sensitive data)
  trackEvent('Web Vital', {
    metric: name,
    status,
    rating,
  });


}

/**
 * Track TanStack Query performance
 * Call this in query hooks to measure query execution time
 */
export function measureQueryPerformance(queryKey, startTime) {
  if (startTime == null) return null;

  const duration = performance.now() - startTime;
  const queryName = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  // Only track slow queries (>1s)
  if (duration > 1000) {
    setSentryContext('query-performance', {
      query: queryName,
      duration: Math.round(duration),
    });

    trackEvent('Slow Query', {
      query: queryName,
      duration_range: getDurationRange(duration),
    });

    logger.warn(`[Performance] Slow query: ${queryName} took ${Math.round(duration)}ms`);
  }

  return duration;
}

/**
 * Track real-time subscription connection time
 */
export function measureSubscriptionConnection(channelName, startTime) {
  if (startTime == null) return null;

  const duration = performance.now() - startTime;

  // Only track slow connections (>500ms)
  if (duration > 500) {
    setSentryContext('subscription-performance', {
      channel: channelName,
      duration: Math.round(duration),
    });

    trackEvent('Slow Subscription', {
      channel: channelName,
      duration_range: getDurationRange(duration),
    });

    logger.warn(`[Performance] Slow subscription: ${channelName} took ${Math.round(duration)}ms`);
  }

  return duration;
}

/**
 * Track image load performance
 */
export function measureImageLoad(imageType, startTime) {
  if (startTime == null) return null;

  const duration = performance.now() - startTime;

  // Only track slow loads (>2s)
  if (duration > 2000) {
    trackEvent('Slow Image Load', {
      type: imageType,
      duration_range: getDurationRange(duration),
    });

    logger.warn(`[Performance] Slow image load: ${imageType} took ${Math.round(duration)}ms`);
  }

  return duration;
}

/**
 * Track route transition performance
 */
let routeTransitionStart = null;

export function startRouteTransition() {
  routeTransitionStart = performance.now();
}

export function endRouteTransition(routeName) {
  if (routeTransitionStart == null) return;

  const duration = performance.now() - routeTransitionStart;
  routeTransitionStart = null;

  // Only track slow transitions (>1s)
  if (duration > 1000) {
    trackEvent('Slow Route Transition', {
      route: routeName,
      duration_range: getDurationRange(duration),
    });

    logger.warn(`[Performance] Slow route transition: ${routeName} took ${Math.round(duration)}ms`);
  }

  return duration;
}

/**
 * Convert duration to range for privacy (don't send exact timings)
 */
function getDurationRange(duration) {
  if (duration < 500) return '0-500ms';
  if (duration < 1000) return '500-1000ms';
  if (duration < 2000) return '1-2s';
  if (duration < 5000) return '2-5s';
  return '5s+';
}

/**
 * Monitor memory usage (for debugging memory leaks)
 */
export function checkMemoryUsage() {
  if (!performance.memory) return null;

  const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
  const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

  // Warn if memory usage is >80%
  if (usagePercent > 80) {
    logger.warn(
      `[Performance] High memory usage: ${Math.round(usagePercent)}% (${Math.round(
        usedJSHeapSize / 1024 / 1024
      )}MB)`
    );

    captureError(new Error('High memory usage detected'), {
      usedMB: Math.round(usedJSHeapSize / 1024 / 1024),
      limitMB: Math.round(jsHeapSizeLimit / 1024 / 1024),
      usagePercent: Math.round(usagePercent),
    });
  }

  return {
    usedMB: Math.round(usedJSHeapSize / 1024 / 1024),
    limitMB: Math.round(jsHeapSizeLimit / 1024 / 1024),
    usagePercent: Math.round(usagePercent),
  };
}

/**
 * Get performance summary for dashboard
 */
export function getPerformanceSummary() {
  if (typeof performance === 'undefined') {
    return {
      domContentLoaded: null,
      loadComplete: null,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      memory: null,
    };
  }

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');
  const lcp = performance.getEntriesByType('largest-contentful-paint')[0];

  return {
    domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
    loadComplete: navigation ? Math.round(navigation.loadEventEnd) : null,
    firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
    largestContentfulPaint: lcp ? Math.round(lcp.startTime) : null,
    memory: checkMemoryUsage(),
  };
}
