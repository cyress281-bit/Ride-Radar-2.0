/**
 * Feature flags for gradual feature rollout.
 * Flags are stored in localStorage so they persist across sessions
 * and can be toggled from the browser console during development/testing.
 *
 * Usage in browser console:
 *   import('/src/lib/featureFlags.js').then(m => m.setFlag('maplibre', true))
 *   -- or --
 *   localStorage.setItem('rr:flag:maplibre', 'true'); location.reload();
 */

const FLAG_PREFIX = 'rr:flag:';

const DEFAULTS = {
  maplibre: false,
};

export function getFlag(name) {
  try {
    const stored = localStorage.getItem(`${FLAG_PREFIX}${name}`);
    if (stored !== null) return stored === 'true';
    return DEFAULTS[name] ?? false;
  } catch {
    return DEFAULTS[name] ?? false;
  }
}

export function setFlag(name, value) {
  try {
    localStorage.setItem(`${FLAG_PREFIX}${name}`, String(value));
    console.log(`[FeatureFlag] ${name} = ${value} (reload to apply)`);
  } catch {
    console.warn('[FeatureFlag] Could not persist flag');
  }
}

export const USE_MAPLIBRE = getFlag('maplibre');
