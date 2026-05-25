import { useState, useEffect, useCallback, useRef } from 'react';
import { preloadTilesAround } from '@/lib/tileCache.js';
import { RADAR_LOCATION_CACHE_KEY, RADAR_LOCATION_CACHE_MAX_AGE_MS } from '@/lib/locationCache.js';
import { logger } from '@/lib/logger';

const ACTIVE_LOCATION_MIN_DISTANCE_METERS = 25;
const PASSIVE_LOCATION_MIN_DISTANCE_METERS = 75;
const ACTIVE_LOCATION_MAX_STALE_MS = 30 * 1000;
const PASSIVE_LOCATION_MAX_STALE_MS = 90 * 1000;

const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const emptyRadarLocation = { lat: null, lng: null, accuracyMeters: null, source: 'none' };

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

function readCachedRadarLocation() {
  try {
    const raw = window.localStorage.getItem(RADAR_LOCATION_CACHE_KEY);
    if (!raw) return emptyRadarLocation;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(Number(parsed.cachedAt)) || Date.now() - Number(parsed.cachedAt) > RADAR_LOCATION_CACHE_MAX_AGE_MS) {
      return emptyRadarLocation;
    }
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return emptyRadarLocation;
    return { lat, lng, accuracyMeters: parsed.accuracyMeters, source: 'cached' };
  } catch {
    return emptyRadarLocation;
  }
}

function cacheRadarLocation(location) {
  if (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return;
  window.localStorage.setItem(
    RADAR_LOCATION_CACHE_KEY,
    JSON.stringify({ lat: location.lat, lng: location.lng, accuracyMeters: location.accuracyMeters, cachedAt: Date.now() })
  );
}

/**
 * Hook to manage user geolocation for the radar view.
 *
 * @returns {{
 *   userLoc: {lat: number|null, lng: number|null, accuracyMeters: number|null, source: string},
 *   hasUserLocation: boolean,
 *   geoError: boolean,
 *   locating: boolean,
 *   requestLocation: () => void,
 *   effectiveLoc: {lat: number, lng: number}
 * }}
 */
export function useRadarLocation() {
  const [userLoc, setUserLoc] = useState(readCachedRadarLocation);
  const [geoError, setGeoError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [highAccuracyMode, setHighAccuracyMode] = useState(false);
  const lastAcceptedLocationRef = useRef(null);

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const effectiveLoc = hasUserLocation ? userLoc : US_CENTER;

  const acceptLocation = useCallback((next, { force = false } = {}) => {
    const previous = lastAcceptedLocationRef.current;
    const now = Date.now();
    const minDistance = highAccuracyMode
      ? ACTIVE_LOCATION_MIN_DISTANCE_METERS
      : PASSIVE_LOCATION_MIN_DISTANCE_METERS;
    const maxStaleMs = highAccuracyMode
      ? ACTIVE_LOCATION_MAX_STALE_MS
      : PASSIVE_LOCATION_MAX_STALE_MS;
    const movedMeters = distanceMeters(previous, next);
    const stale = !previous?.acceptedAt || now - previous.acceptedAt >= maxStaleMs;

    if (!force && previous && movedMeters < minDistance && !stale) return;

    const accepted = { ...next, acceptedAt: now };
    lastAcceptedLocationRef.current = accepted;
    setUserLoc(next);
    cacheRadarLocation(next);
  }, [highAccuracyMode]);

  // Request location — user-initiated only
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    setGeoError(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          source: 'live',
        };
        acceptLocation(next, { force: true });
        setGeoError(false);
        setLocating(false);
      },
      (err) => {
        logger.warn('[Radar] Geolocation error:', err.message);
        setGeoError(true);
        setLocating(false);
      },
      { maximumAge: 30000, timeout: 9000, enableHighAccuracy: true }
    );
  }, [acceptLocation]);

  // Watch location once granted
  useEffect(() => {
    if (!hasUserLocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          source: 'live',
        };
        acceptLocation(next);
      },
      (err) => logger.warn('[Radar] Geolocation watch error:', err.message),
      highAccuracyMode
        ? { maximumAge: 10000, timeout: 12000, enableHighAccuracy: true }
        : { maximumAge: 30000, timeout: 15000, enableHighAccuracy: false }
    );
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [acceptLocation, hasUserLocation, highAccuracyMode]);

  // Auto-refresh GPS on mount ONLY if permission was previously granted.
  // Never trigger the permission dialog without a user gesture.
  // iOS Safari ≤15 lacks navigator.permissions — falls through silently;
  // the extended TTL covers same-day reopen for those browsers.
  useEffect(() => {
    if (!navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') requestLocation();
      })
      .catch(() => {
        // permissions API not supported — do nothing, wait for user gesture
      });
    return () => { cancelled = true; };
  }, [requestLocation]);

  // Preload map tiles around user location for offline use
  useEffect(() => {
    if (!hasUserLocation) return;
    const timer = setTimeout(() => {
      preloadTilesAround(effectiveLoc.lat, effectiveLoc.lng, [10, 11, 12, 13, 14], 2);
    }, 2500);
    return () => clearTimeout(timer);
  }, [hasUserLocation, effectiveLoc.lat, effectiveLoc.lng]);

  return {
    userLoc,
    hasUserLocation,
    geoError,
    locating,
    requestLocation,
    effectiveLoc,
    highAccuracyMode,
    setHighAccuracyMode,
  };
}
