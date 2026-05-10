/**
 * Production-safe logging utility for Ride Radar 2.0.
 *
 * - `logger.debug`: Only outputs in development.
 * - `logger.warn`: Always outputs.
 * - `logger.error`: Always outputs, with a structured prefix.
 */

const isDev = import.meta.env.DEV;

function noop() {}

/**
 * Format arguments for error logging.
 * @param {string} prefix
 * @param {Array<*>} args
 * @returns {Array<*>}
 */
function formatArgs(prefix, args) {
  if (args.length === 0) return [prefix];
  const first = args[0];
  if (typeof first === 'string') {
    return [`[${prefix}] ${first}`, ...args.slice(1)];
  }
  return [`[${prefix}]`, ...args];
}

export const logger = {
  /**
   * Debug-level logging. Only outputs in development.
   * @param {...*} args
   */
  debug: isDev ? (...args) => console.log(...formatArgs('RideRadar', args)) : noop,

  /**
   * Warning-level logging. Always outputs.
   * @param {...*} args
   */
  warn: (...args) => console.warn(...formatArgs('RideRadar:warn', args)),

  /**
   * Error-level logging. Always outputs with structured formatting.
   * @param {...*} args
   */
  error: (...args) => console.error(...formatArgs('RideRadar:error', args)),
};

export default logger;
