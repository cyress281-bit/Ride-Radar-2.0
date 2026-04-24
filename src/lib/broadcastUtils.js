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
  if (broadcast.type === 'solo_ride') return new Date(now + 90 * 60 * 1000).toISOString();
  if (broadcast.type === 'alert') return new Date(now + 240 * 60 * 1000).toISOString();
  if (broadcast.type === 'iso') {
    const mins = broadcast.isoSubtype === 'mechanic' ? 720 : 1440;
    return new Date(now + mins * 60 * 1000).toISOString();
  }
  if (broadcast.type === 'event' && broadcast.eventEndTime) {
    return new Date(new Date(broadcast.eventEndTime).getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

export function isExpired(broadcast) {
  if (!broadcast.expiresAt) return false;
  return new Date(broadcast.expiresAt).getTime() < Date.now();
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

export function formatDistance(miles) {
  if (miles == null) return null;
  if (miles > 50) return '50+ mi';
  if (miles < 10) return `${Math.max(1, Math.round(miles))} mi`;
  if (miles < 25) return `${Math.round(miles / 2) * 2} mi`;
  return `${Math.round(miles / 5) * 5} mi`;
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function timeUntilExpiry(iso) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'expired';
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.floor(diff / 86400)}d left`;
}

export function rankBroadcasts(broadcasts, userLat, userLng) {
  return [...broadcasts].sort((a, b) => {
    const rankA = BROADCAST_META[a.type]?.rank ?? 99;
    const rankB = BROADCAST_META[b.type]?.rank ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    // Within type: recency first
    const tA = new Date(a.created_date || 0).getTime();
    const tB = new Date(b.created_date || 0).getTime();
    if (tB !== tA) return tB - tA;
    // Distance secondary for solo/iso
    if ((a.type === 'solo_ride' || a.type === 'iso') && userLat != null && userLng != null) {
      const dA = haversineMiles(userLat, userLng, a.frozenLat, a.frozenLng) ?? 999;
      const dB = haversineMiles(userLat, userLng, b.frozenLat, b.frozenLng) ?? 999;
      return dA - dB;
    }
    return 0;
  });
}