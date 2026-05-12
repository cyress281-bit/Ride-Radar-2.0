import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/primitives/AspectRatio';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { Avatar } from '@/components/ui/primitives/Avatar';
import { Badge } from './Badge';

/**
 * Event-specific card variant with electric neon accents.
 *
 * @param {object} props
 * @param {object} [props.broadcast] - Event broadcast data
 * @param {object} [props.author] - Author profile
 * @param {() => void} [props.onPress]
 * @param {string} [props.to]
 */
export const EventCard = memo(function EventCard({
  broadcast,
  author,
  onPress,
  to,
}) {
  if (!broadcast) {
    return (
      <div className="surface-card overflow-hidden animate-fade-in">
        <AspectRatio ratio={16 / 9}>
          <div className="absolute inset-0 bg-muted animate-pulse" />
        </AspectRatio>
        <div className="p-4 space-y-3">
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const mediaUrl = broadcast.event_image_url || broadcast.media_url;
  const attendeeCount = broadcast.attendee_count ?? broadcast.attendee_ids?.length ?? 0;

  const cardContent = (
    <>
      <AspectRatio ratio={16 / 9}>
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={broadcast.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 to-background" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute top-3 left-3">
          <Badge type="event" />
        </div>

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

      <div className="p-4 space-y-3">
        <HStack align="center" gap={3} className="flex-wrap">
          {broadcast.event_date && (
            <HStack align="center" gap={1} className="text-amber">
              <Calendar className="w-3.5 h-3.5" />
              <Text variant="micro" color="default" className="text-amber">
                {new Date(broadcast.event_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </HStack>
          )}
          {broadcast.event_location && (
            <HStack align="center" gap={1} className="text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <Text variant="micro" color="muted">{broadcast.event_location}</Text>
            </HStack>
          )}
          <HStack align="center" gap={1} className="text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <Text variant="micro" color="muted">{attendeeCount} going</Text>
          </HStack>
          <HStack align="center" gap={1} className="text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <Text variant="micro" color="muted">{timeAgo(broadcast.created_at)}</Text>
          </HStack>
        </HStack>

        <HStack align="center" gap={3}>
          <Avatar
            src={author?.avatar_url}
            name={author?.display_name || 'Rider'}
            size="sm"
            status={author?.is_online ? 'online' : 'offline'}
            ring="none"
          />
          <Text variant="bodySm" color="default" className="font-semibold">
            {author?.display_name || 'Unknown Rider'}
          </Text>
        </HStack>
      </div>
    </>
  );

  const className = cn(
    'group relative w-full overflow-hidden surface-card pressable animate-fade-up',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'bg-transparent border-0 p-0 text-left block'
  );

  if (to) {
    return (
      <Link to={to} className={className} aria-label={`Event: ${broadcast.title}`}>
        {cardContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onPress}
      className={className}
      aria-label={`Event: ${broadcast.title}`}
    >
      {cardContent}
    </button>
  );
});
