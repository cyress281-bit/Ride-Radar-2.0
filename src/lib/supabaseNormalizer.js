/**
 * Normalizes Supabase snake_case fields to camelCase for compatibility
 * with existing component code.
 *
 * The Supabase database uses snake_case naming
 * (frozen_lat, author_id, created_at), but the
 * frontend code was written expecting camelCase (frozenLat, authorId, created_date).
 *
 * This utility provides backward compatibility while we gradually migrate
 * the frontend to use snake_case directly.
 */

/**
 * Normalizes a broadcast object from Supabase
 * @param {Object} broadcast - Raw broadcast from Supabase
 * @returns {Object} Normalized broadcast with both naming conventions
 */
export function normalizeBroadcast(broadcast) {
  if (!broadcast) return null;

  return {
    ...broadcast,
    // Provide camelCase aliases for snake_case fields
    frozenLat: broadcast.frozen_lat ?? broadcast.frozenLat,
    frozenLng: broadcast.frozen_lng ?? broadcast.frozenLng,
    authorId: broadcast.author_id ?? broadcast.authorId,
    createdAt: broadcast.created_at ?? broadcast.created_date ?? broadcast.createdDate ?? broadcast.createdAt,
    createdDate: broadcast.created_at ?? broadcast.created_date ?? broadcast.createdDate ?? broadcast.createdAt,
    expiresAt: broadcast.expires_at ?? broadcast.expiresAt,
    eventImage: broadcast.event_image_url ?? broadcast.eventImage,
    eventDate: broadcast.event_date ?? broadcast.eventDate,
    alertImages: broadcast.alert_photos ?? broadcast.alert_image_urls ?? broadcast.alertImages ?? [],
    exactLocationText: broadcast.exact_location_text ?? broadcast.exactLocationText,
    isoSubtype: broadcast.iso_subtype ?? broadcast.isoSubtype,
    locationPrivacy: broadcast.location_privacy ?? broadcast.locationPrivacy,
    locationGeocodedAt: broadcast.location_geocoded_at ?? broadcast.locationGeocodedAt,
    locationGeocodeProvider: broadcast.location_geocode_provider ?? broadcast.locationGeocodeProvider,
  };
}

/**
 * Normalizes a profile object from Supabase
 * @param {Object} profile - Raw profile from Supabase
 * @returns {Object} Normalized profile with both naming conventions
 */
export function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    // Provide camelCase aliases for snake_case fields
    displayName: profile.display_name ?? profile.displayName,
    avatar: profile.avatar_url ?? profile.avatar,
    bikePhoto: profile.bike_photo_url ?? profile.bikePhoto,
    bike: profile.bike_make || profile.bike_model
      ? `${profile.bike_year || ''} ${profile.bike_make || ''} ${profile.bike_model || ''}`.trim()
      : profile.bike,
  };
}

/**
 * Normalizes an array of broadcasts
 * @param {Array} broadcasts - Array of raw broadcasts from Supabase
 * @returns {Array} Normalized broadcasts
 */
export function normalizeBroadcasts(broadcasts) {
  if (!Array.isArray(broadcasts)) return [];
  return broadcasts.map(normalizeBroadcast);
}

/**
 * Normalizes an array of profiles
 * @param {Array} profiles - Array of raw profiles from Supabase
 * @returns {Array} Normalized profiles
 */
export function normalizeProfiles(profiles) {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(normalizeProfile);
}
