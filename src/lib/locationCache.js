const RADAR_OFFLINE_SNAPSHOT_KEY = 'rr:radar-offline-snapshot';
const RADAR_LOCATION_CACHE_KEY = 'rr:last-radar-location';
const GEOCODE_CACHE_PREFIX = 'rr:geocode:';
const LIVE_SESSION_KEY = 'rr:live-session';

const RADAR_OFFLINE_SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RADAR_LOCATION_CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000;
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getBrowserStorage(type) {
  if (typeof window === 'undefined') return null;
  return type === 'session' ? window.sessionStorage : window.localStorage;
}

function removeKeysWithPrefix(storage, prefix) {
  if (!storage) return;
  const keysToRemove = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function clearLocalLocationCaches() {
  const local = getBrowserStorage('local');
  const session = getBrowserStorage('session');

  local?.removeItem(RADAR_OFFLINE_SNAPSHOT_KEY);
  local?.removeItem(RADAR_LOCATION_CACHE_KEY);
  session?.removeItem(LIVE_SESSION_KEY);

  removeKeysWithPrefix(local, GEOCODE_CACHE_PREFIX);
  removeKeysWithPrefix(session, GEOCODE_CACHE_PREFIX);
}

export {
  RADAR_OFFLINE_SNAPSHOT_KEY,
  RADAR_OFFLINE_SNAPSHOT_MAX_AGE_MS,
  RADAR_LOCATION_CACHE_KEY,
  RADAR_LOCATION_CACHE_MAX_AGE_MS,
  GEOCODE_CACHE_PREFIX,
  GEOCODE_CACHE_TTL_MS,
  LIVE_SESSION_KEY,
};
