import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Clock } from 'lucide-react';
import { cn, formatDistance, timeAgo } from '@/lib/utils';
import { haversineMiles, timeUntilExpiry } from '@/lib/broadcastUtils';
import { AspectRatio } from '@/components/ui/primitives/AspectRatio';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from './Badge';
import { withRoutePreload, preloadBroadcastDetail } from '@/lib/routePreload';
import { prefetchBroadcastDetail } from '@/lib/query-client';
import ReportButton from '@/features/safety/components/ReportButton';

/**
 * Media-rich broadcast card for Ride Radar 2.0 — Electric Neon edition.
 *
 * @param {object} props
 * @param {object} [props.broadcast] - Broadcast data object
 * @param {object} [props.author] - Author profile object
 * @param {number} [props.userLat] - User latitude for distance calc
 * @param {number} [props.userLng] - User longitude for distance calc
 * @param {() => void} [props.onPress] - Card press handler
 * @param {string} [props.to] - Router link destination (alternative to onPress)
 * @param {boolean} [props.compactNoMedia=false] - Use compact text-first layout when no media is present
 */
export const RideCard = memo(
  function RideCard({ broadcast, author, userLat, userLng, onPress, to, compactNoMedia = false }) {
    const qc = useQueryClient();
    const distance = useMemo(() => {
      if (
        !broadcast ||
        (broadcast.type !== 'solo_ride' && broadcast.type !== 'iso') ||
        userLat == null ||
        userLng == null ||
        broadcast.frozen_lat == null ||
        broadcast.frozen_lng == null
      ) {
        return null;
      }
      const raw = haversineMiles(userLat, userLng, broadcast.frozen_lat, broadcast.frozen_lng);
      return Number.isFinite(raw) && raw >= 0 ? formatDistance(raw) : null;
    }, [broadcast, userLat, userLng]);

    if (!broadcast) {
      return (
        <div className="surface-card overflow-hidden animate-fade-in">
          <AspectRatio ratio={16 / 9}>
            <div className="absolute inset-0 bg-muted animate-pulse" />
          </AspectRatio>
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-full bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            <HStack align="center" gap={3} className="pt-2">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </HStack>
          </div>
        </div>
      );
    }

    const mediaUrl =
      broadcast.event_image_url ||
      broadcast.alert_photos?.[0] ||
      broadcast.alert_image_urls?.[0] ||
      broadcast.media_url;

    const isVideo = mediaUrl && /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaUrl);
    const isOfficialEvent = broadcast.type === 'event' && broadcast.is_official === true;
    const isBikeDown = broadcast.type === 'alert' && broadcast.alert_type === 'bike_down';
    const useCompactNoMedia = compactNoMedia && !mediaUrl;

    // Type-specific neon glow for cards
    const typeGlowClass =
      broadcast.type === 'alert'
        ? broadcast.alert_type === 'bike_down'
          ? 'hover:shadow-[0_0_20px_hsl(var(--destructive)/0.15)] hover:border-destructive/20'
          : 'hover:shadow-[0_0_20px_hsl(var(--alert)/0.15)] hover:border-alert/20'
        : {
            solo_ride: 'hover:shadow-[0_0_20px_hsl(var(--primary)/0.12)] hover:border-primary/20',
            iso: 'hover:shadow-[0_0_20px_hsl(var(--iso)/0.12)] hover:border-iso/20',
            event: 'hover:shadow-[0_0_20px_hsl(var(--event)/0.12)] hover:border-event/20',
          }[broadcast.type] || '';

    const compactLabel = isBikeDown ? 'Bike Down' : broadcast.title || 'Signal';

    const cardContent = (
      <>
        {useCompactNoMedia || (broadcast.type === 'alert' && !mediaUrl) ? (
          <div className="p-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge type={broadcast.type} alertType={broadcast.alert_type} />
              {broadcast.type === 'iso' && broadcast.iso_subtype && (
                <span className="inline-flex items-center rounded-full border border-iso/25 bg-iso/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-iso">
                  {broadcast.iso_subtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}
                </span>
              )}
              {isOfficialEvent && (
                <span className="inline-flex items-center rounded-full border border-event/30 bg-event/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-event-foreground backdrop-blur-md">
                  Official
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Text as="h3" variant="h3" className="line-clamp-2 font-bold">
                {compactLabel}
              </Text>
              {broadcast.title && broadcast.title !== compactLabel && (
                <Text variant="bodySm" color="muted" className="line-clamp-2">
                  {broadcast.title}
                </Text>
              )}
              {broadcast.body && (
                <Text
                  variant="bodySm"
                  color="muted"
                  className={broadcast.type === 'alert' ? 'line-clamp-3' : 'line-clamp-2'}
                >
                  {broadcast.body}
                </Text>
              )}
            </div>

            {(broadcast.location_name || broadcast.type === 'event' || isBikeDown) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                {broadcast.location_name && (
                  <HStack align="center" gap={1} className="text-muted-foreground">
                    <MapPin className="w-3 h-3 text-primary" />
                    <Text variant="micro" color="muted">{broadcast.location_name}</Text>
                  </HStack>
                )}
                {broadcast.type === 'event' && broadcast.event_date && (
                  <HStack align="center" gap={1} className="text-muted-foreground">
                    <Clock className="w-3 h-3 text-primary" />
                    <Text variant="micro" color="muted">
                      {new Date(broadcast.event_date).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </HStack>
                )}
                {isBikeDown && broadcast.expires_at && (
                  <HStack align="center" gap={1} className="text-muted-foreground">
                    <Clock className="w-3 h-3 text-primary" />
                    <Text variant="micro" color="muted">{timeUntilExpiry(broadcast.expires_at)}</Text>
                  </HStack>
                )}
              </div>
            )}
          </div>
        ) : (
          <AspectRatio ratio={16 / 9}>
            {mediaUrl ? (
              isVideo ? (
                <video
                  src={mediaUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={broadcast.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              )
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated to-background" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
              <Badge type={broadcast.type} alertType={broadcast.alert_type} />
              {isOfficialEvent && (
                <span className="inline-flex items-center rounded-full border border-event/30 bg-event/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-event-foreground backdrop-blur-md">
                  Official
                </span>
              )}
            </div>

            {/* Title & body overlaid */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <Text as="h3" variant="h3" color="white" className="line-clamp-2 drop-shadow-lg font-bold">
                {broadcast.title}
              </Text>
              {broadcast.body && (
                <Text variant="bodySm" color="white" className="mt-1 line-clamp-2 opacity-90 drop-shadow-sm">
                  {broadcast.body}
                </Text>
              )}
            </div>
          </AspectRatio>
        )}

        {/* Author row */}
        <HStack align="center" justify="between" className="p-4">
          <HStack align="center" gap={3}>
            <Avatar
              src={author?.avatar_url}
              name={author?.display_name || 'Rider'}
              size="sm"
              status={author?.is_online ? 'online' : 'offline'}
              ring="none"
            />
            <VStack gap={0.5}>
              <Text variant="bodySm" color="default" className="font-semibold">
                {author?.display_name || 'Unknown Rider'}
              </Text>
              <HStack align="center" gap={2}>
                {distance && (
                  <HStack align="center" gap={1} className="text-muted-foreground">
                    <MapPin className="w-3 h-3 text-primary" />
                    <Text variant="micro" color="muted">{distance}</Text>
                  </HStack>
                )}
                <HStack align="center" gap={1} className="text-muted-foreground">
                  <Clock className="w-3 h-3 text-primary" />
                  <Text variant="micro" color="muted">{timeAgo(broadcast.created_at)}</Text>
                </HStack>
              </HStack>
            </VStack>
          </HStack>
          {broadcast?.id && broadcast?.author_id && (
            <ReportButton
              targetType="broadcast"
              targetId={broadcast.id}
              targetUserId={broadcast.author_id}
              size="sm"
            />
          )}
        </HStack>
      </>
    );

    const className = cn(
      'group relative w-full overflow-hidden surface-card pressable animate-fade-up transition-all duration-300',
      typeGlowClass,
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'bg-transparent border-0 p-0 text-left block'
    );

    if (to) {
      return (
        <Link
          to={to}
          className={className}
          aria-label={`${broadcast.type}: ${broadcast.title}`}
          {...withRoutePreload(preloadBroadcastDetail, () => prefetchBroadcastDetail(qc, broadcast.id))}
        >
          {cardContent}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={onPress}
        className={className}
        aria-label={`${broadcast.type}: ${broadcast.title}`}
      >
        {cardContent}
      </button>
    );
  },
  function rideCardAreEqual(prev, next) {
    return (
      prev.broadcast?.id === next.broadcast?.id &&
      prev.broadcast?.title === next.broadcast?.title &&
      prev.broadcast?.body === next.broadcast?.body &&
      prev.broadcast?.alert_type === next.broadcast?.alert_type &&
      prev.broadcast?.event_image_url === next.broadcast?.event_image_url &&
      prev.broadcast?.media_url === next.broadcast?.media_url &&
      prev.broadcast?.location_name === next.broadcast?.location_name &&
      prev.broadcast?.event_date === next.broadcast?.event_date &&
      prev.broadcast?.iso_subtype === next.broadcast?.iso_subtype &&
      prev.broadcast?.is_official === next.broadcast?.is_official &&
      prev.broadcast?.alert_photos === next.broadcast?.alert_photos &&
      prev.broadcast?.alert_image_urls === next.broadcast?.alert_image_urls &&
      prev.broadcast?.expires_at === next.broadcast?.expires_at &&
      prev.broadcast?.created_at === next.broadcast?.created_at &&
      prev.compactNoMedia === next.compactNoMedia &&
      prev.author === next.author &&
      prev.userLat === next.userLat &&
      prev.userLng === next.userLng
    );
  }
);
