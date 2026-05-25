import { memo } from 'react';
import { divIcon } from 'leaflet';

const markerIconCache = new Map();
const riderMarkerIconCache = new Map();
let selfMarkerIcon = null;
let selfMarkerIconLive = null;

const markerClassMap = {
  alert: 'rr-map-marker-alert',
  bike_down: 'rr-map-marker-bike-down',
  solo_ride: 'rr-map-marker-solo',
  iso: 'rr-map-marker-iso',
  event: 'rr-map-marker-event',
  rider_presence: 'rr-map-marker-rider',
  self: 'rr-map-marker-self',
};

function isBikeDownItem(item) {
  return item?.signalType === 'alert' && item?.alertType === 'bike_down';
}

/**
 * Get a cached divIcon for broadcast/presence types.
 *
 * @param {string} type
 * @returns {import('leaflet').DivIcon}
 */
export function getMarkerIcon(type) {
  const markerClass = markerClassMap[type] || markerClassMap.solo_ride;
  if (!markerIconCache.has(type)) {
    const isBikeDown = type === 'bike_down';
    const size = isBikeDown ? 44 : 34;
    const anchor = isBikeDown ? 22 : 17;
    const popupOffset = isBikeDown ? -23 : -18;
    const arriveClass = isBikeDown ? ' rr-arrive' : '';
    markerIconCache.set(
      type,
      divIcon({
        className: 'rr-map-marker-wrapper',
        html: `<span class="rr-map-marker ${markerClass}${arriveClass}" aria-hidden="true"><span></span></span>`,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
        popupAnchor: [0, popupOffset],
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
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  }
  return selfMarkerIcon;
}

export function getSelfMarkerIconLive() {
  if (!selfMarkerIconLive) {
    selfMarkerIconLive = divIcon({
      className: 'rr-map-marker-wrapper',
      html: '<span class="rr-map-marker rr-map-marker-self" aria-hidden="true"><span></span></span>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  }
  return selfMarkerIconLive;
}

/**
 * Get a cached divIcon for broadcast clusters.
 *
 * Clusters are broadcast-only in Radar. Styling is driven by child marker
 * options so Bike Down clusters can remain visually dominant.
 *
 * @param {import('leaflet').MarkerCluster} cluster
 * @returns {import('leaflet').DivIcon}
 */
export function getBroadcastClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  const count = cluster.getChildCount();
  const hasBikeDown = childMarkers.some((marker) => marker?.options?.isBikeDown || isBikeDownItem(marker?.options));
  const hasWarningOrHelp = childMarkers.some((marker) => {
    const signalType = marker?.options?.signalType;
    const alertType = marker?.options?.alertType;
    return signalType === 'alert' || signalType === 'iso' || alertType === 'bike_down';
  });

  const toneClass = hasBikeDown
    ? 'rr-map-cluster-bike-down'
    : hasWarningOrHelp
      ? 'rr-map-cluster-warning'
      : 'rr-map-cluster-normal';
  const hint = hasBikeDown ? '!' : '';

  const size = count >= 100 ? 50 : count >= 10 ? 46 : 42;
  const iconAnchor = Math.round(size / 2);

  return divIcon({
    className: 'rr-map-cluster-wrapper',
    html: `
      <span class="rr-map-cluster ${toneClass}" aria-hidden="true" data-count="${count}">
        <span class="rr-map-cluster-count">${count}</span>
        ${hint ? `<span class="rr-map-cluster-hint">${hint}</span>` : ''}
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [iconAnchor, iconAnchor],
  });
}

/**
 * Create a DOM element for a broadcast/presence marker.
 * Used by MapLibre Marker({ element }) — replaces divIcon for MapLibre.
 * CSS classes are identical to the Leaflet divIcon HTML so styling is preserved.
 * @param {string} type
 * @returns {HTMLElement}
 */
export function getMarkerElement(type) {
  const markerClass = markerClassMap[type] || markerClassMap.solo_ride;
  const isBikeDown = type === 'bike_down';
  const size = isBikeDown ? 44 : 34;
  const el = document.createElement('div');
  el.className = 'rr-map-marker-wrapper';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const inner = document.createElement('span');
  inner.className = `rr-map-marker ${markerClass}${isBikeDown ? ' rr-arrive' : ''}`;
  inner.setAttribute('aria-hidden', 'true');
  const innerInner = document.createElement('span');
  inner.appendChild(innerInner);
  el.appendChild(inner);
  return el;
}

/**
 * Create a DOM element for a rider presence marker.
 * @param {object} presence
 * @returns {HTMLElement}
 */
export function getRiderMarkerElement(presence) {
  const displayName = String(presence.display_name || 'Rider').trim();
  const label = displayName.charAt(0).toUpperCase() || 'R';
  const el = document.createElement('div');
  el.className = 'rr-map-marker-wrapper';
  el.style.width = '34px';
  el.style.height = '34px';
  const inner = document.createElement('span');
  inner.className = 'rr-map-marker rr-map-marker-rider';
  inner.setAttribute('aria-hidden', 'true');
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  inner.appendChild(labelSpan);
  el.appendChild(inner);
  return el;
}

/**
 * Create a DOM element for the self-location marker.
 * @param {boolean} isLive
 * @returns {HTMLElement}
 */
export function getSelfMarkerElement(isLive = false) {
  const el = document.createElement('div');
  el.className = 'rr-map-marker-wrapper';
  el.style.width = '32px';
  el.style.height = '32px';
  const inner = document.createElement('span');
  inner.className = 'rr-map-marker rr-map-marker-self';
  inner.setAttribute('aria-hidden', 'true');
  const innerInner = document.createElement('span');
  inner.appendChild(innerInner);
  el.appendChild(inner);
  return el;
}

/**
 * Create a DOM element for a broadcast cluster.
 * Replaces getBroadcastClusterIcon for MapLibre (no cluster.getAllChildMarkers()).
 * @param {number} count
 * @param {boolean} hasBikeDown
 * @param {boolean} hasWarningOrHelp
 * @returns {HTMLElement}
 */
export function getClusterElement(count, hasBikeDown, hasWarningOrHelp) {
  const toneClass = hasBikeDown
    ? 'rr-map-cluster-bike-down'
    : hasWarningOrHelp
      ? 'rr-map-cluster-warning'
      : 'rr-map-cluster-normal';
  const hint = hasBikeDown ? '!' : '';
  const size = count >= 100 ? 50 : count >= 10 ? 46 : 42;
  const el = document.createElement('div');
  el.className = 'rr-map-cluster-wrapper';
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const inner = document.createElement('span');
  inner.className = `rr-map-cluster ${toneClass}`;
  inner.setAttribute('aria-hidden', 'true');
  inner.setAttribute('data-count', String(count));
  const countSpan = document.createElement('span');
  countSpan.className = 'rr-map-cluster-count';
  countSpan.textContent = String(count);
  inner.appendChild(countSpan);
  if (hint) {
    const hintSpan = document.createElement('span');
    hintSpan.className = 'rr-map-cluster-hint';
    hintSpan.textContent = hint;
    inner.appendChild(hintSpan);
  }
  el.appendChild(inner);
  return el;
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
