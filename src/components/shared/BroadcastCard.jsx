import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Wrench, MapPin, Calendar } from 'lucide-react';
import SignalIcon from '@/components/brand/SignalIcon';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import AlertPhotoGrid from '@/components/shared/AlertPhotoGrid';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';
import SafetyActions from '@/components/safety/SafetyActions';

const typeStyles = {
  alert: {
    card: 'rr-surface border-l-[3px] border-l-alert border-alert/20 hover:border-alert/60 shadow-[0_16px_55px_-20px_hsl(var(--alert)/0.45)] hover:shadow-[0_22px_70px_-22px_hsl(var(--alert)/0.55)]',
    badge: 'bg-alert text-white',
    icon: 'bg-alert/10 text-alert shadow-[0_0_15px_hsl(var(--alert)/0.3)]',
    labelColor: 'text-alert',
    leftGlow: 'shadow-[-4px_0_14px_hsl(var(--alert)/0.35)]',
  },
  solo_ride: {
    card: 'rr-surface border-l-[3px] border-l-solo border-solo/15 hover:border-solo/50 shadow-[0_16px_55px_-20px_hsl(var(--solo)/0.3)] hover:shadow-[0_22px_70px_-24px_hsl(var(--solo)/0.45)]',
    badge: 'bg-solo text-white',
    icon: 'bg-solo/10 text-solo shadow-[0_0_15px_hsl(var(--solo)/0.3)]',
    labelColor: 'text-solo',
    leftGlow: 'shadow-[-4px_0_14px_hsl(var(--solo)/0.3)]',
  },
  iso: {
    card: 'rr-surface border-l-[3px] border-l-iso border-iso/15 hover:border-iso/50 shadow-[0_16px_55px_-20px_hsl(var(--iso)/0.28)] hover:shadow-[0_22px_70px_-24px_hsl(var(--iso)/0.42)]',
    badge: 'bg-iso text-white',
    icon: 'bg-iso/10 text-iso shadow-[0_0_15px_hsl(var(--iso)/0.3)]',
    labelColor: 'text-iso',
    leftGlow: 'shadow-[-4px_0_14px_hsl(var(--iso)/0.3)]',
  },
  event: {
    card: 'rr-surface border-l-[3px] border-l-event border-event/15 hover:border-event/50 shadow-[0_16px_55px_-20px_hsl(var(--event)/0.28)] hover:shadow-[0_22px_70px_-24px_hsl(var(--event)/0.42)]',
    badge: 'bg-event text-white',
    icon: 'bg-event/10 text-event shadow-[0_0_15px_hsl(var(--event)/0.3)]',
    labelColor: 'text-event',
    leftGlow: 'shadow-[-4px_0_14px_hsl(var(--event)/0.3)]',
  },
};

const BroadcastCard = memo(
  function BroadcastCard({ broadcast, author, userLat, userLng, prominentSoloAvatar = false }) {
    const meta = BROADCAST_META[broadcast.type];
    const isAlert = broadcast.type === 'alert';
    const isProminentSolo = prominentSoloAvatar && broadcast.type === 'solo_ride';
    const styles = typeStyles[broadcast.type] || typeStyles.solo_ride;

    const rawDistance =
      (broadcast.type === 'solo_ride' || broadcast.type === 'iso') &&
      userLat != null &&
      userLng != null &&
      broadcast.frozen_lat != null &&
      broadcast.frozen_lng != null
        ? haversineMiles(userLat, userLng, broadcast.frozen_lat, broadcast.frozen_lng)
        : null;
    const distance = Number.isFinite(rawDistance) && rawDistance >= 0 ? formatDistance(rawDistance) : null;

    const isoSubLabel =
      broadcast.iso_subtype === 'mechanic'
        ? 'Mechanic'
        : broadcast.iso_subtype === 'bike_crew'
          ? 'Bike Crew'
          : null;

    const content = (
      <div
        className={cn(
          'relative rounded-[20px] overflow-hidden transition-all duration-300 rr-scanline active:scale-[0.98] active:opacity-95 will-change-transform',
          styles.card,
          'hover:' + styles.leftGlow,
          'hover:shadow-lg'
        )}
      >
        {isAlert && <div className="absolute top-0 left-0 right-0 h-[2px] bg-alert animate-pulse-alert" />}
        {broadcast.type === 'iso' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan/60" />}

        <div
          className={cn(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            broadcast.type === 'alert' && 'bg-alert/[0.025]',
            broadcast.type === 'solo_ride' && 'bg-solo/[0.02]',
            broadcast.type === 'iso' && 'bg-iso/[0.02]',
            broadcast.type === 'event' && 'bg-event/[0.02]'
          )}
        />

        <div className="relative p-4 md:p-5">
          {broadcast.type === 'event' && broadcast.event_image_url && (
            <div className="mb-4 flex max-h-80 items-center justify-center overflow-hidden rounded-[20px] border border-event/25 bg-black/45 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]">
              <OptimizedImage
                src={broadcast.event_image_url}
                alt="Event poster"
                className="max-h-72 w-full"
                containerClassName="w-full"
                objectFit="contain"
                loading="lazy"
                showSkeleton
              />
            </div>
          )}
          {broadcast.type === 'alert' && <AlertPhotoGrid images={broadcast.alert_photos || broadcast.alert_image_urls} />}
          <div className={cn('flex items-start', isProminentSolo ? 'gap-4' : 'gap-3')}>
            {isProminentSolo ? (
              <div className="relative shrink-0">
                {author?.avatar_url ? (
                  <div className="relative">
                    <OptimizedImage
                      src={author.avatar_url}
                      alt={author.display_name || 'Rider'}
                      containerClassName="h-16 w-16 rounded-2xl border-2 border-solo/50 shadow-[0_0_26px_hsl(var(--solo)/0.22),0_12px_30px_rgba(0,0,0,0.45)]"
                      className="rounded-2xl"
                      objectFit="cover"
                      loading="eager"
                      fadeInDuration={200}
                    />
                    <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-solo shadow-[0_0_10px_hsl(var(--solo)/0.8)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <OfficialMotorcycleIcon frame className="h-16 w-16 rounded-2xl p-1.5" />
                    <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-solo shadow-[0_0_10px_hsl(var(--solo)/0.8)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                )}
                <OfficialMotorcycleIcon frame className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl p-0.5" />
              </div>
            ) : (
              <SignalIcon type={broadcast.type} size="md" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-[11px] font-bold uppercase tracking-widest', styles.labelColor)}>
                  {meta.label}
                  {isoSubLabel && ` · ${isoSubLabel}`}
                </span>
                <span className="text-muted-foreground text-xs">· {timeAgo(broadcast.created_at)}</span>
              </div>

              <h3 className="font-semibold text-[15px] leading-tight mb-1 line-clamp-2 text-foreground">
                {broadcast.title}
              </h3>

              {broadcast.body && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{broadcast.body}</p>}

              {isProminentSolo && author?.bike_photo_url && (
                <div className="mb-3 overflow-hidden rounded-[20px] border border-solo/20 bg-black/35 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
                  <OptimizedImage
                    src={author.bike_photo_url}
                    alt="Rider bike"
                    containerClassName="h-24 w-full"
                    objectFit="cover"
                    loading="lazy"
                    showSkeleton
                  />
                </div>
              )}

              <div className="mt-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <SafetyActions targetType="broadcast" targetId={broadcast.id} targetProfileId={broadcast.author_id} compact />
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap mt-2.5 font-mono tracking-tight">
                {author && !isProminentSolo && (
                  <span className="flex items-center gap-1.5 font-sans">
                    {author.avatar_url ? (
                      <div className="relative">
                        <OptimizedImage
                          src={author.avatar_url}
                          alt={author.display_name || 'Rider'}
                          containerClassName="w-4 h-4 rounded-full"
                          className="rounded-full"
                          objectFit="cover"
                          loading="lazy"
                          fadeInDuration={150}
                          showSkeleton
                        />
                        <span className="absolute -right-0.5 -bottom-0.5 h-1.5 w-1.5 rounded-full bg-solo shadow-[0_0_4px_hsl(var(--solo)/0.9)]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-secondary border border-border" />
                    )}
                    <span className="text-[11px] font-medium text-foreground/80">{author.display_name}</span>
                  </span>
                )}
                {author && isProminentSolo && (
                  <span className="flex items-center gap-1.5 font-sans font-semibold text-foreground/90">
                    {author.display_name}
                    {(author.bike_make || author.bike_model) && (
                      <span className="text-muted-foreground font-medium">
                        · {`${author.bike_year || ''} ${author.bike_make || ''} ${author.bike_model || ''}`.trim()}
                      </span>
                    )}
                  </span>
                )}
                {distance && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <MapPin className="w-3 h-3 opacity-60" />~{distance}
                  </span>
                )}
                {(broadcast.type === 'event' || isAlert) && broadcast.exact_location_text && (
                  <span className="inline-flex items-center gap-1 max-w-full break-words">
                    <MapPin className="w-3 h-3 opacity-60 shrink-0" />
                    <span className="truncate">{broadcast.exact_location_text}</span>
                  </span>
                )}
                {broadcast.type === 'event' && broadcast.event_date && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Calendar className="w-3 h-3 opacity-60" />
                    {new Date(broadcast.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {broadcast.iso_subtype === 'mechanic' && <Wrench className="w-3 h-3 opacity-60" />}
                <span className="inline-flex items-center gap-1 ml-auto tabular-nums">
                  <Clock className="w-3 h-3 opacity-60" />
                  {timeUntilExpiry(broadcast.expires_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <Link to={`/broadcast/${broadcast.id}`} className="group block">
        {content}
      </Link>
    );
  },
  function broadcastCardAreEqual(prevProps, nextProps) {
    return (
      prevProps.broadcast.id === nextProps.broadcast.id &&
      prevProps.broadcast.title === nextProps.broadcast.title &&
      prevProps.broadcast.body === nextProps.broadcast.body &&
      prevProps.broadcast.expires_at === nextProps.broadcast.expires_at &&
      prevProps.broadcast.created_at === nextProps.broadcast.created_at &&
      prevProps.author === nextProps.author &&
      prevProps.userLat === nextProps.userLat &&
      prevProps.userLng === nextProps.userLng &&
      prevProps.prominentSoloAvatar === nextProps.prominentSoloAvatar
    );
  }
);

export default BroadcastCard;
