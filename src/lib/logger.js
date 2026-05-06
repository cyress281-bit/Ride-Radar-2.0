/**
 * Production-safe logging utility for Ride Radar 2.0
 *
 * - logger.debug() : Only outputs in development (import.meta.env.DEV)
 * - logger.warn()  : Only outputs in development
 * - logger.error() : Always outputs (real errors should always be visible)
 *
 * This prevents sensitive data (user IDs, Supabase URLs, query objects,
 * session states) from leaking into production browser consoles.
 */

const isDev = import.meta.env.DEV;

function noop() {}

export const logger = {
  /**
   * Debug-level logging. Only outputs in development.
   * Use for: state transitions, subscription lifecycle, query results.
   */
  debug: isDev ? console.log.bind(console) : noop,

  /**
   * Warning-level logging. Only outputs in development.
   * Use for: fallback paths, non-critical failures, deprecation notices.
   */
  warn: isDev ? console.warn.bind(console) : noop,

  /**
   * Error-level logging. Always outputs.
   * Use for: real failures that need visibility (auth errors, query failures, etc.)
   */
  error: console.error.bind(console),
};

export default logger;
