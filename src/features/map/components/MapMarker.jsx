import { memo } from 'react';
import { divIcon } from 'leaflet';

const markerIconCache = new Map();
const riderMarkerIconCache = new Map();
let selfMarkerIcon = null;

const markerClassMap = {
  alert: 'rr-map-marker-alert',
  solo_ride: 'rr-map-marker-solo',
  iso: 'rr-map-marker-iso',
  event: 'rr-map-marker-event',
  rider_presence: 'rr-map-marker-rider',
  self: 'rr-map-marker-self',
};

/**
 * Get a cached divIcon for broadcast/presence types.
 *
 * @param {string} type
 * @returns {import('leaflet').DivIcon}
 */
export function getMarkerIcon(type) {
  const markerClass = markerClassMap[type] || markerClassMap.solo_ride;
  if (!markerIconCache.has(type)) {
    markerIconCache.set(
      type,
      divIcon({
        className: 'rr-map-marker-wrapper',
        html: `<span class="rr-map-marker ${markerClass}" aria-hidden="true"><span></span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      })
    );
  }
  return markerIconCache.get(type);
}

/**
 * Get a cached divIcon for rider presence with initial label.
 *
 * @param {object} presence
 * @returns {import('leaflet').DivIcon}
 */
export function getRiderMarkerIcon(presence) {
  const displayName = String(presence.display_name || 'Rider').trim();
  const label = displayName.charAt(0).toUpperCase() || 'R';
  const cacheKey = `${presence.user_id}:${presence.location_precision}:${label}`;

  if (!riderMarkerIconCache.has(cacheKey)) {
    riderMarkerIconCache.set(
      cacheKey,
      divIcon({
        className: 'rr-map-marker-wrapper',
        html: `<span class="rr-map-marker rr-map-marker-rider" aria-hidden="true"><span>${label}</span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      })
    );
  }
  return riderMarkerIconCache.get(cacheKey);
}

/**
 * Get the self-location marker icon.
 *
 * @returns {import('leaflet').DivIcon}
 */
export function getSelfMarkerIcon() {
  if (!selfMarkerIcon) {
    selfMarkerIcon = divIcon({
      className: 'rr-map-marker-wrapper',
      html: '<span class="rr-map-marker rr-map-marker-self" aria-hidden="true"><span></span></span>',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -22],
    });
  }
  return selfMarkerIcon;
}

/**
 * Pure data component for marker metadata.
 * Actual rendering is handled by Leaflet Marker in LiveMap.
 */
const MapMarker = memo(function MapMarker({ item: _item }) {
  // This component is a no-op render; it's used for type documentation
  // and potential future React-based marker rendering.
  return null;
});

export default MapMarker;
