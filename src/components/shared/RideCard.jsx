import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { cn, formatDistance, timeAgo } from '@/lib/utils';
import { haversineMiles } from '@/lib/broadcastUtils';
import { AspectRatio } from '@/components/ui/primitives/AspectRatio';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from './Badge';

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
 */
export const RideCard = memo(
  function RideCard({ broadcast, author, userLat, userLng, onPress, to }) {
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

    const cardContent = (
      <>
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
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <Badge type={broadcast.type} />
          </div>

          {/* Title & body overlaid */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <Text as="h3" variant="h3" color="white" className="line-clamp-2 drop-shadow-md">
              {broadcast.title}
            </Text>
            {broadcast.body && (
              <Text variant="bodySm" color="white" className="mt-1 line-clamp-2 opacity-90 drop-shadow-sm">
                {broadcast.body}
              </Text>
            )}
          </div>
        </AspectRatio>

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
                    <MapPin className="w-3 h-3" />
                    <Text variant="micro" color="muted">{distance}</Text>
                  </HStack>
                )}
                <HStack align="center" gap={1} className="text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <Text variant="micro" color="muted">{timeAgo(broadcast.created_at)}</Text>
                </HStack>
              </HStack>
            </VStack>
          </HStack>
        </HStack>
      </>
    );

    const className = cn(
      'group relative w-full overflow-hidden surface-card pressable animate-fade-up',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'bg-transparent border-0 p-0 text-left block'
    );

    if (to) {
      return (
        <Link
          to={to}
          className={className}
          aria-label={`${broadcast.type}: ${broadcast.title}`}
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
      prev.broadcast?.expires_at === next.broadcast?.expires_at &&
      prev.broadcast?.created_at === next.broadcast?.created_at &&
      prev.author === next.author &&
      prev.userLat === next.userLat &&
      prev.userLng === next.userLng
    );
  }
);
