import { GEOCODE_CACHE_PREFIX, GEOCODE_CACHE_TTL_MS } from '@/lib/locationCache.js';

/**
 * Geocoding utilities for Ride Radar 2.0.
 *
 * - Nominatim address lookup with short-lived localStorage cache
 * - Deterministic location fuzzing for privacy
 * - Presence location builder
 */
const DEFAULT_FUZZ_RADIUS_MILES = 1.5;
const LOCATION_PRECISION = {
  APPROXIMATE: 'approximate',
  PRECISE: 'precise',
};

/**
 * Check whether lat/lng are valid coordinates.
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
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

// ------------------------------------------------------------------
// Hashing helpers for deterministic fuzzing
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Cache helpers
// ------------------------------------------------------------------

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
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ storedAt: Date.now(), result })
    );
  } catch {
    // Storage may be full or disabled; geocoding still succeeds without cache.
  }
}

// ------------------------------------------------------------------
// Photon autocomplete
// ------------------------------------------------------------------

const PHOTON_BASE_URL = 'https://photon.komoot.io/api';
const PHOTON_TIMEOUT_MS = 5000;

/**
 * Search address suggestions using Photon (Komoot).
 * No API key required. Results are cached in localStorage for 24 hours.
 *
 * @param {string} query - Free-form address or place name
 * @param {object} [options]
 * @param {number} [options.limit=5] - Max suggestions to return
 * @param {string} [options.lang='en'] - Language for results
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 * @returns {Promise<Array<{id: string, displayName: string, lat: number, lng: number, context: string}>>}
 */
export async function searchAddressSuggestions(query, options = {}) {
  const { limit = 5, lang = 'en', signal } = options;
  const normalized = String(query || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!normalized || normalized.length < 3) return [];

  const cacheKey = `${GEOCODE_CACHE_PREFIX}suggest:${normalized.toLowerCase()}`;
  const cached = getCachedGeocode(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
  const abortSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const url = new URL(PHOTON_BASE_URL);
    url.searchParams.set('q', normalized);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('lang', lang);

    const contactEmail = import.meta.env.VITE_SUPPORT_EMAIL || null;

    const response = await fetch(url.toString(), {
      signal: abortSignal,
      headers: {
        Accept: 'application/json',
        'User-Agent': `RideRadar/2.0${contactEmail ? ` (${contactEmail})` : ''}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Photon search failed with ${response.status}`);
    }

    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    const suggestions = features
      .map((feature, index) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates;
        const lng = Array.isArray(coords) ? Number(coords[0]) : NaN;
        const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
        if (!isValidCoordinate(lat, lng)) return null;

        const parts = [
          props.name,
          props.street,
          props.housenumber,
          props.city,
          props.state,
          props.country,
        ].filter(Boolean);

        const displayName = parts.length > 0 ? parts.join(', ') : normalized;
        const context = [props.city, props.state].filter(Boolean).join(', ');

        return {
          id: `${props.osm_id || index}-${props.osm_type || 'node'}`,
          displayName,
          lat,
          lng,
          context: context || undefined,
        };
      })
      .filter(Boolean);

    setCachedGeocode(cacheKey, suggestions);
    return suggestions;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

// ------------------------------------------------------------------
// Nominatim geocode
// ------------------------------------------------------------------

/**
 * Geocode a free-text address using Nominatim.
 * Results are cached in localStorage for 24 hours.
 *
 * @param {string} address - Free-form address or place name
 * @returns {Promise<{lat: number, lng: number, displayName: string}|null>}
 */
export async function geocodeAddress(address) {
  const query = String(address || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (!query || query.length < 3) return null;

  const cacheKey = `${GEOCODE_CACHE_PREFIX}${query.toLowerCase()}`;
  const cached = getCachedGeocode(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 7000);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('q', query);

    const contactEmail = import.meta.env.VITE_SUPPORT_EMAIL || null;

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': `RideRadar/2.0${contactEmail ? ` (${contactEmail})` : ''}`,
      },
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
    };

    setCachedGeocode(cacheKey, result);
    return result;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

/**
 * Reverse-geocode coordinates to a human-readable address string using Nominatim.
 * Results are cached in localStorage for 24 hours.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
export async function reverseGeocodeCoords(lat, lng) {
  if (!isValidCoordinate(lat, lng)) return null;

  const cacheKey = `${GEOCODE_CACHE_PREFIX}reverse:${Number(lat).toFixed(5)}:${Number(lng).toFixed(5)}`;
  const cached = getCachedGeocode(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 7000);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('zoom', '16');
    url.searchParams.set('addressdetails', '1');

    const contactEmail = import.meta.env.VITE_SUPPORT_EMAIL || null;

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': `RideRadar/2.0${contactEmail ? ` (${contactEmail})` : ''}`,
      },
    });

    if (!response.ok) throw new Error(`Reverse geocode failed with ${response.status}`);

    const data = await response.json();
    const addr = data?.address || {};

    const parts = [
      addr.amenity || addr.leisure || addr.tourism || addr.shop,
      addr.road || addr.pedestrian || addr.path,
      addr.city || addr.town || addr.village || addr.hamlet,
      addr.state,
    ].filter(Boolean);

    const name = parts.length > 0 ? parts.join(', ') : (data.display_name || null);
    if (!name) return null;

    setCachedGeocode(cacheKey, name);
    return name;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

/**
 * Return deterministically fuzzed coordinates within ~1.5 miles of the original.
 * The same seed always produces the same offset, preserving privacy while
 * keeping the result stable across renders.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} [seed] - Optional seed for deterministic fuzzing
 * @returns {{lat: number, lng: number, approximateRadiusMiles: number}|null}
 */
export function approximateLocation(lat, lng, seed) {
  if (!isValidCoordinate(lat, lng)) return null;

  const numericLat = Number(lat);
  const numericLng = Number(lng);
  const radiusMiles = DEFAULT_FUZZ_RADIUS_MILES;
  const resolvedSeed = String(
    seed || `${numericLat.toFixed(3)}:${numericLng.toFixed(3)}`
  );

  const angle = seededUnit(resolvedSeed, 'angle') * Math.PI * 2;
  const distanceMiles = radiusMiles * (0.45 + seededUnit(resolvedSeed, 'distance') * 0.55);

  const approxLat = numericLat + Math.sin(angle) * milesToLatDegrees(distanceMiles);
  const approxLng = numericLng + Math.cos(angle) * milesToLngDegrees(distanceMiles, numericLat);

  return {
    lat: Number(Math.max(-90, Math.min(90, approxLat)).toFixed(6)),
    lng: Number(Math.max(-180, Math.min(180, approxLng)).toFixed(6)),
    approximateRadiusMiles: Number(radiusMiles.toFixed(2)),
  };
}

/**
 * Normalize location precision to a valid value.
 * @param {string|null} value
 * @returns {'approximate'|'precise'}
 */
export function normalizePrecision(value) {
  return value === LOCATION_PRECISION.PRECISE
    ? LOCATION_PRECISION.PRECISE
    : LOCATION_PRECISION.APPROXIMATE;
}

/**
 * Build a presence location object for the given coordinates and precision.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} [precision] - 'precise' or 'approximate'
 * @returns {{lat: number, lng: number, locationPrecision: string, approximateRadiusMiles: number|null}|null}
 */
export function buildPresenceLocation(lat, lng, precision) {
  if (!isValidCoordinate(lat, lng)) return null;

  const normalizedPrecision =
    precision === LOCATION_PRECISION.PRECISE
      ? LOCATION_PRECISION.PRECISE
      : LOCATION_PRECISION.APPROXIMATE;

  if (normalizedPrecision === LOCATION_PRECISION.PRECISE) {
    return {
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      locationPrecision: LOCATION_PRECISION.PRECISE,
      approximateRadiusMiles: null,
    };
  }

  const hourBucket = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
  const approx = approximateLocation(lat, lng, `${hourBucket}:${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`);

  return {
    ...approx,
    locationPrecision: LOCATION_PRECISION.APPROXIMATE,
  };
}
