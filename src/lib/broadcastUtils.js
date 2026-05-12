// Expiry windows in minutes
export const EXPIRY_MINUTES = {
  solo_ride: 90,
  alert: 240,
  iso_mechanic: 720,
  iso_bike_crew: 1440,
};

export const BROADCAST_META = {
  solo_ride: { label: 'Solo Ride', color: 'solo', rank: 2 },
  iso: { label: 'In Search Of', color: 'iso', rank: 3 },
  event: { label: 'Event', color: 'event', rank: 4 },
  alert: { label: 'Alert', color: 'alert', rank: 1 },
};

export function computeExpiresAt(broadcast) {
  const now = Date.now();
  if (broadcast.type === 'solo_ride') {
    return new Date(now + EXPIRY_MINUTES.solo_ride * 60 * 1000).toISOString();
  }
  if (broadcast.type === 'alert') {
    return new Date(now + EXPIRY_MINUTES.alert * 60 * 1000).toISOString();
  }
  if (broadcast.type === 'iso') {
    const mins = broadcast.isoSubtype === 'mechanic'
      ? EXPIRY_MINUTES.iso_mechanic
      : EXPIRY_MINUTES.iso_bike_crew;
    return new Date(now + mins * 60 * 1000).toISOString();
  }
  if (broadcast.type === 'event' && broadcast.eventEndTime) {
    return new Date(new Date(broadcast.eventEndTime).getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

export function isExpired(broadcast) {
  const expiresAt = broadcast.expires_at;
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// Fuzz location by ~0.5-1.5 mile radius
export function fuzzLocation(lat, lng) {
  const fuzz = 0.015;
  const dLat = (Math.random() - 0.5) * fuzz * 2;
  const dLng = (Math.random() - 0.5) * fuzz * 2;
  return { lat: lat + dLat, lng: lng + dLng };
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Re-export canonical implementations from utils.js to avoid duplication
export { formatDistance, timeAgo } from './utils.js';

export function timeUntilExpiry(iso) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'expired';
  if (diff < 60) return `<1m left`;
  if (diff < 7200) {
    // Under 2 hours: show hours + minutes
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    if (h === 0) return `${m}m left`;
    return `${h}h ${m}m left`;
  }
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.floor(diff / 86400)}d left`;
}

export function rankBroadcasts(broadcasts, userLat, userLng) {
  // Precompute distances once per item to avoid O(n log n) haversine calls during sort
  const shouldComputeDistance = userLat != null && userLng != null;
  const withDistances = broadcasts.map((b) => ({
    ...b,
    _distance:
      shouldComputeDistance && (b.type === 'solo_ride' || b.type === 'iso')
        ? haversineMiles(userLat, userLng, b.frozen_lat || b.frozenLat, b.frozen_lng || b.frozenLng) ?? 999
        : 999,
  }));

  return withDistances.sort((a, b) => {
    const rankA = BROADCAST_META[a.type]?.rank ?? 99;
    const rankB = BROADCAST_META[b.type]?.rank ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    // Events rank by upcoming eventDate
    if (a.type === 'event' && b.type === 'event') {
      const eA = new Date(a.event_date || a.eventDate || Number.MAX_SAFE_INTEGER).getTime();
      const eB = new Date(b.event_date || b.eventDate || Number.MAX_SAFE_INTEGER).getTime();
      if (eA !== eB) return eA - eB;
    }

    // Within type: recency first
    const tA = new Date(a.created_at || a.created_date || 0).getTime();
    const tB = new Date(b.created_at || b.created_date || 0).getTime();
    if (tB !== tA) return tB - tA;

    // Distance secondary for solo/iso
    return a._distance - b._distance;
  });
}