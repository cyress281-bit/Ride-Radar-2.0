/**
 * Production-safe logging utility for Ride Radar 2.0.
 *
 * - `logger.debug`: Only outputs in development.
 * - `logger.warn`: Always outputs.
 * - `logger.error`: Always outputs, with a structured prefix.
 * - All outputs are scrubbed for PII (emails, JWTs, API keys).
 */

const isDev = import.meta.env.DEV;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

function noop() {}

const SENSITIVE_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  /[a-f0-9]{32,}/gi,
];

function scrub(value) {
  if (typeof value === 'string') {
    return SENSITIVE_PATTERNS.reduce((s, p) => s.replace(p, '[REDACTED]'), value);
  }
  if (value instanceof Error && value.message) {
    const scrubbed = new Error(scrub(value.message));
    scrubbed.stack = scrub(value.stack);
    scrubbed.name = value.name;
    return scrubbed;
  }
  return value;
}

function scrubArgs(args) {
  return args.map(scrub);
}

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
  debug: isDev ? (...args) => console.log(...formatArgs(`RideRadar@${APP_VERSION}`, scrubArgs(args))) : noop,

  /**
   * Info-level logging. Only outputs in development.
   * @param {...*} args
   */
  info: isDev ? (...args) => console.log(...formatArgs(`RideRadar@${APP_VERSION}:info`, scrubArgs(args))) : noop,

  /**
   * Warning-level logging. Always outputs.
   * @param {...*} args
   */
  warn: (...args) => console.warn(...formatArgs(`RideRadar@${APP_VERSION}:warn`, scrubArgs(args))),

  /**
   * Error-level logging. Always outputs with structured formatting.
   * @param {...*} args
   */
  error: (...args) => console.error(...formatArgs(`RideRadar@${APP_VERSION}:error`, scrubArgs(args))),
};

export default logger;
