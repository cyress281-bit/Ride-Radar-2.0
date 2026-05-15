/**
 * Single source of truth for all Ride Radar 2.0 application constants.
 */

// ------------------------------------------------------------------
// Broadcast expiry durations (in milliseconds)
// ------------------------------------------------------------------

/** @type {Record<string, number|null>} */
export const BROADCAST_EXPIRY_MS = {
  solo_ride: 72 * 60 * 60 * 1000, // 72 hours
  iso: 72 * 60 * 60 * 1000,       // 72 hours
  alert: 6 * 60 * 60 * 1000,      // 6 hours
  bike_down: 6 * 60 * 60 * 1000,  // 6 hours — same urgency as alert
  event: null,                    // Use event end time instead
};

// ------------------------------------------------------------------
// Map defaults
// ------------------------------------------------------------------

/** Default search radius in miles. */
export const DEFAULT_RADIUS_MILES = 50;

/** Maximum number of broadcasts to render or fetch. */
export const MAX_BROADCASTS = 100;

// ------------------------------------------------------------------
// Presence / real-time
// ------------------------------------------------------------------

/** How long a presence entry is considered valid (10 minutes). */
export const PRESENCE_TTL_MS = 10 * 60 * 1000;

/** Interval between heartbeat updates (4 minutes). */
export const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

/** How often to refresh presence state from the server (30 seconds). */
export const PRESENCE_REFRESH_MS = 30 * 1000;

// ------------------------------------------------------------------
// Limits
// ------------------------------------------------------------------

/** Maximum number of photos allowed on an alert broadcast. */
export const MAX_ALERT_PHOTOS = 2;

/** Maximum length of a chat message in characters. */
export const MAX_MESSAGE_LENGTH = 2000;

/** List length above which virtualized rendering should be used. */
export const VIRTUALIZATION_THRESHOLD = 20;

// ------------------------------------------------------------------
// App metadata
// ------------------------------------------------------------------

/** Human-readable application name. */
export const APP_NAME = 'Ride Radar';

/** Public support email address. */
export const SUPPORT_EMAIL = 'support@rideradar.app';
