import { useState, useEffect, useCallback } from 'react';
import { preloadTilesAround } from '@/lib/tileCache.js';
import { logger } from '@/lib/logger';

const RADAR_LOCATION_CACHE_KEY = 'rr:last-radar-location';
const RADAR_LOCATION_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

const US_CENTER = { lat: 39.8283, lng: -98.5795 };

const emptyRadarLocation = { lat: null, lng: null, accuracyMeters: null, source: 'none' };

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

  const hasUserLocation = userLoc.lat != null && userLoc.lng != null;
  const effectiveLoc = hasUserLocation ? userLoc : US_CENTER;

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
        setUserLoc(next);
        cacheRadarLocation(next);
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
  }, []);

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
        setUserLoc(next);
        cacheRadarLocation(next);
      },
      (err) => logger.warn('[Radar] Geolocation watch error:', err.message),
      { maximumAge: 15000, timeout: 12000, enableHighAccuracy: true }
    );
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, [hasUserLocation]);

  // Preload map tiles around user location for offline use
  useEffect(() => {
    if (!hasUserLocation) return;
    const timer = setTimeout(() => {
      preloadTilesAround(effectiveLoc.lat, effectiveLoc.lng, [10, 11, 12, 13, 14], 2);
    }, 2500);
    return () => clearTimeout(timer);
  }, [hasUserLocation, effectiveLoc.lat, effectiveLoc.lng]);

  return { userLoc, hasUserLocation, geoError, locating, requestLocation, effectiveLoc };
}
