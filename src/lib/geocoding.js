const GEOCODE_CACHE_PREFIX = 'rr:geocode:';
const GEOCODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_APPROXIMATE_RADIUS_MILES = 1.5;

export const LOCATION_PRECISION = {
  APPROXIMATE: 'approximate',
  PRECISE: 'precise',
};

export function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180
  );
}

export function normalizePrecision(value) {
  return value === LOCATION_PRECISION.PRECISE
    ? LOCATION_PRECISION.PRECISE
    : LOCATION_PRECISION.APPROXIMATE;
}

export function normalizeLocationText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, salt) {
  return hashString(`${seed}:${salt}`) / 0xffffffff;
}

function milesToLatDegrees(miles) {
  return miles / 69;
}

function milesToLngDegrees(miles, lat) {
  const divisor = Math.max(Math.cos((Number(lat) * Math.PI) / 180) * 69, 1);
  return miles / divisor;
}

export function approximateLocation(lat, lng, options = {}) {
  if (!isValidCoordinate(lat, lng)) return null;

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const radiusMiles = Number(options.radiusMiles || DEFAULT_APPROXIMATE_RADIUS_MILES);
  const seed = String(options.seed || `${numericLat.toFixed(3)}:${numericLng.toFixed(3)}`);
  const angle = seededUnit(seed, 'angle') * Math.PI * 2;
  const distanceMiles = radiusMiles * (0.45 + seededUnit(seed, 'distance') * 0.55);
  const approxLat = numericLat + Math.sin(angle) * milesToLatDegrees(distanceMiles);
  const approxLng = numericLng + Math.cos(angle) * milesToLngDegrees(distanceMiles, numericLat);

  return {
    lat: Number(Math.max(-90, Math.min(90, approxLat)).toFixed(6)),
    lng: Number(Math.max(-180, Math.min(180, approxLng)).toFixed(6)),
    approximateRadiusMiles: Number(radiusMiles.toFixed(2)),
  };
}

export function buildPresenceLocation({ lat, lng, precision, userId }) {
  if (!isValidCoordinate(lat, lng)) return null;

  const normalizedPrecision = normalizePrecision(precision);
  if (normalizedPrecision === LOCATION_PRECISION.PRECISE) {
    return {
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      locationPrecision: LOCATION_PRECISION.PRECISE,
      approximateRadiusMiles: null,
    };
  }

  const hourBucket = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
  const approximate = approximateLocation(lat, lng, {
    seed: `${userId || 'rider'}:${hourBucket}:${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`,
    radiusMiles: DEFAULT_APPROXIMATE_RADIUS_MILES,
  });

  return {
    ...approximate,
    locationPrecision: LOCATION_PRECISION.APPROXIMATE,
  };
}

function getCachedGeocode(cacheKey) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.storedAt || Date.now() - cached.storedAt > GEOCODE_CACHE_TTL_MS) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return cached.result || null;
  } catch {
    return null;
  }
}

function setCachedGeocode(cacheKey, result) {
  if (typeof window === 'undefined' || !result) return;

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({ storedAt: Date.now(), result }));
  } catch {
    // Local storage can be full or disabled; geocoding still succeeds without cache.
  }
}

export async function geocodeLocationText(text, options = {}) {
  const query = normalizeLocationText(text);
  if (!query || query.length < 3) return null;

  const cacheKey = `${GEOCODE_CACHE_PREFIX}${query.toLowerCase()}`;
  if (options.cache !== false) {
    const cached = getCachedGeocode(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs || 7000);

  try {
    const endpoint = options.endpoint || import.meta.env.VITE_GEOCODING_ENDPOINT || 'https://nominatim.openstreetmap.org/search';
    const url = new URL(endpoint);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('q', query);

    const contactEmail = import.meta.env.VITE_GEOCODING_EMAIL;
    if (contactEmail) url.searchParams.set('email', contactEmail);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed with ${response.status}`);
    }

    const results = await response.json();
    const match = Array.isArray(results) ? results[0] : null;
    const lat = Number(match?.lat);
    const lng = Number(match?.lon);

    if (!isValidCoordinate(lat, lng)) return null;

    const result = {
      lat,
      lng,
      displayName: match.display_name || query,
      provider: endpoint.includes('nominatim') ? 'nominatim' : 'custom',
      query,
    };

    setCachedGeocode(cacheKey, result);
    return result;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
