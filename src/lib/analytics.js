import Plausible from 'plausible-tracker';
import { logger } from './logger';

/**
 * Privacy-focused analytics using Plausible
 *
 * Plausible is GDPR-compliant, cookieless, and open-source.
 * We track events and page views WITHOUT collecting any PII.
 *
 * Only runs in production when:
 * - VITE_PLAUSIBLE_DOMAIN is configured
 * - VITE_ENABLE_ANALYTICS is true
 * - User has analytics_enabled = true in their settings
 */

let plausible = null;
let analyticsEnabled = false;
let userOptedOut = false;

/**
 * Initialize Plausible analytics
 */
export function initializeAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  const enabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  const isProd = import.meta.env.PROD;

  if (!isProd || !enabled || !domain) {
    return;
  }

  plausible = Plausible({
    domain,
    apiHost: import.meta.env.VITE_PLAUSIBLE_API_HOST || 'https://plausible.io',
    trackLocalhost: false,
  });

  analyticsEnabled = true;
}

/**
 * Set user opt-in/opt-out preference
 * Call this when user changes analytics_enabled in settings
 */
export function setAnalyticsOptIn(optedIn) {
  userOptedOut = !optedIn;
}

/**
 * Check if analytics should run
 */
function shouldTrack() {
  return analyticsEnabled && !userOptedOut && plausible;
}

/**
 * Track a page view
 * Automatically called by usePageTracking hook on route changes
 */
export function trackPageView(url = null) {
  if (!shouldTrack()) return;

  try {
    plausible.trackPageview({
      url: url || window.location.pathname,
    });
  } catch (error) {
    logger.error('[Analytics] Failed to track page view:', error);
  }
}

/**
 * Track a custom event
 * Events are privacy-focused and don't contain PII
 */
export function trackEvent(eventName, props = {}) {
  if (!shouldTrack()) return;

  try {
    // Sanitize props to ensure no PII
    const sanitizedProps = sanitizeEventProps(props);

    plausible.trackEvent(eventName, { props: sanitizedProps });
  } catch (error) {
    logger.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Remove any potential PII from event properties
 */
function sanitizeEventProps(props) {
  const sanitized = { ...props };

  // Remove any keys that might contain PII
  delete sanitized.userId;
  delete sanitized.email;
  delete sanitized.name;
  delete sanitized.displayName;
  delete sanitized.display_name;
  delete sanitized.phone;
  delete sanitized.location;
  delete sanitized.latitude;
  delete sanitized.longitude;

  return sanitized;
}

/**
 * Pre-defined event trackers for common actions
 */

export function trackBroadcastCreated(type) {
  trackEvent('Broadcast Created', { type });
}

export function trackMessageSent() {
  trackEvent('Message Sent');
}

export function trackConnectionRequest(action) {
  // action: 'sent' | 'accepted' | 'declined'
  trackEvent('Connection Request', { action });
}

export function trackUserBlocked() {
  trackEvent('User Blocked');
}

export function trackUserReported(reason) {
  trackEvent('User Reported', { reason });
}

export function trackProfileCompleted() {
  trackEvent('Profile Completed');
}

export function trackPWAInstalled() {
  trackEvent('PWA Installed');
}

export function trackSearchUsed(filterType) {
  // filterType: 'broadcast_type' | 'distance' | 'date'
  trackEvent('Search Used', { filter: filterType });
}

export function trackRSVP(broadcastType) {
  trackEvent('RSVP', { type: broadcastType });
}

export function trackImageUpload(imageType) {
  // imageType: 'avatar' | 'bike' | 'event' | 'alert'
  trackEvent('Image Upload', { type: imageType });
}

export function trackLocationShared() {
  trackEvent('Location Shared');
}

export function trackNotificationToggle(notificationType, enabled) {
  trackEvent('Notification Toggle', {
    type: notificationType,
    enabled: enabled ? 'on' : 'off',
  });
}

export function trackAccountDeleted() {
  trackEvent('Account Deleted');
}

export function trackErrorOccurred(errorType) {
  // errorType: 'auth' | 'network' | 'query' | 'upload' | 'unknown'
  trackEvent('Error', { type: errorType });
}
