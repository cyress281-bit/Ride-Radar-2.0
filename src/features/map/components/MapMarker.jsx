import { memo } from 'react';

const markerClassMap = {
  alert: 'rr-map-marker-alert',
  bike_down: 'rr-map-marker-bike-down',
  solo_ride: 'rr-map-marker-solo',
  iso: 'rr-map-marker-iso',
  event: 'rr-map-marker-event',
  rider_presence: 'rr-map-marker-rider',
  self: 'rr-map-marker-self',
};

/**
 * Create a DOM element for a broadcast/presence marker.
 * Used by MapLibre Marker({ element }).
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
 * Actual rendering is handled by MapLibre Marker in LiveMapMapLibre.
 */
const MapMarker = memo(function MapMarker({ item: _item }) {
  // This component is a no-op render; it's used for type documentation
  // and potential future React-based marker rendering.
  return null;
});

export default MapMarker;
