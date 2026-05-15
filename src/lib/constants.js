/**
 * Single source of truth for all Ride Radar 2.0 application constants.
 */

// ------------------------------------------------------------------
// Broadcast expiry durations (in milliseconds)
// ------------------------------------------------------------------

/** @type {Record<string, number|null>} */
export const BROADCAST_EXPIRY_MS = {
  solo_ride: 1 * 60 * 60 * 1000,  // 1 hour
  iso: 6 * 60 * 60 * 1000,        // 6 hours
  alert: 4 * 60 * 60 * 1000,      // 4 hours (default fallback for custom titles)
  bike_down: 6 * 60 * 60 * 1000,  // 6 hours — same urgency as alert
  event: null,                     // Use event end time instead
};

/** Preset-specific expiry for Road Warning signals (keyed by title preset). */
export const ALERT_PRESET_EXPIRY_MS = {
  'Police':         1 * 60 * 60 * 1000,   // 1 hour
  'Traffic':        2 * 60 * 60 * 1000,   // 2 hours
  'Animal on road': 2 * 60 * 60 * 1000,   // 2 hours
  'Blocked lane':   3 * 60 * 60 * 1000,   // 3 hours
  'Debris':         4 * 60 * 60 * 1000,   // 4 hours
  'Gravel':         4 * 60 * 60 * 1000,   // 4 hours
  'Oil spill':      4 * 60 * 60 * 1000,   // 4 hours
  'Street closed':  6 * 60 * 60 * 1000,   // 6 hours
  'Flooding':       8 * 60 * 60 * 1000,   // 8 hours
  'Pothole':       12 * 60 * 60 * 1000,   // 12 hours
  'Construction':  12 * 60 * 60 * 1000,   // 12 hours
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
