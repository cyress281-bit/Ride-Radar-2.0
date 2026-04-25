import { Link } from 'react-router-dom';
import { Clock, Wrench, MapPin, Calendar, Bike } from 'lucide-react';
import SignalIcon from '@/components/brand/SignalIcon';
import AlertPhotoGrid from '@/components/broadcast/AlertPhotoGrid';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';

const typeStyles = {
  alert: {
    card: 'rr-surface border-alert/40 hover:border-alert/70 shadow-[0_16px_55px_-20px_hsl(var(--alert)/0.5)] hover:shadow-[0_22px_70px_-22px_hsl(var(--alert)/0.5)]',
    badge: 'bg-alert text-alert-foreground',
    icon: 'bg-alert/10 text-alert shadow-[0_0_15px_hsl(var(--alert)/0.3)]',
    labelColor: 'text-alert',
  },
  solo_ride: {
    card: 'rr-surface hover:border-solo/50 hover:shadow-[0_22px_70px_-24px_hsl(var(--solo)/0.35)]',
    badge: 'bg-solo text-solo-foreground',
    icon: 'bg-solo/10 text-solo shadow-[0_0_15px_hsl(var(--solo)/0.3)]',
    labelColor: 'text-solo',
  },
  iso: {
    card: 'rr-surface hover:border-iso/50 hover:shadow-[0_22px_70px_-24px_hsl(var(--iso)/0.32)]',
    badge: 'bg-iso text-iso-foreground',
    icon: 'bg-iso/10 text-iso shadow-[0_0_15px_hsl(var(--iso)/0.3)]',
    labelColor: 'text-iso',
  },
  event: {
    card: 'rr-surface hover:border-event/50 hover:shadow-[0_22px_70px_-24px_hsl(var(--event)/0.32)]',
    badge: 'bg-event text-event-foreground',
    icon: 'bg-event/10 text-event shadow-[0_0_15px_hsl(var(--event)/0.3)]',
    labelColor: 'text-event',
  },
};

export default function BroadcastCard({ broadcast, author, userLat, userLng, prominentSoloAvatar = false }) {
  const meta = BROADCAST_META[broadcast.type];
  const isAlert = broadcast.type === 'alert';
  const isProminentSolo = prominentSoloAvatar && broadcast.type === 'solo_ride';
  const styles = typeStyles[broadcast.type] || typeStyles.solo_ride;

  const distance =
    (broadcast.type === 'solo_ride' || broadcast.type === 'iso') && userLat != null && broadcast.frozenLat != null
      ? formatDistance(haversineMiles(userLat, userLng, broadcast.frozenLat, broadcast.frozenLng))
      : null;

  const isoSubLabel =
    broadcast.isoSubtype === 'mechanic' ? 'Mechanic' : broadcast.isoSubtype === 'bike_crew' ? 'Bike Crew' : null;

  const content = (
    <div className={cn('relative rounded-[1.15rem] overflow-hidden transition-all duration-300 rr-scanline', styles.card)}>
      {/* Alert top bar */}
      {isAlert && <div className="absolute top-0 left-0 right-0 h-[2px] bg-alert animate-pulse-alert" />}

      {/* ISO green top accent */}
      {broadcast.type === 'iso' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/70" />}

      <div className="p-4 md:p-5">
        {broadcast.type === 'event' && broadcast.eventImage && (
          <div className="mb-4 flex max-h-80 items-center justify-center overflow-hidden rounded-2xl border border-event/25 bg-black/45 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]">
            <img src={broadcast.eventImage} className="max-h-72 w-full object-contain" alt="Event poster" />
          </div>
        )}
        {broadcast.type === 'alert' && <AlertPhotoGrid images={broadcast.alertImages} />}
        <div className={cn('flex items-start', isProminentSolo ? 'gap-4' : 'gap-3')}>
          {isProminentSolo ? (
            <div className="relative shrink-0">
              {author?.avatar ? (
                <img src={author.avatar} className="h-16 w-16 rounded-2xl border border-solo/45 object-cover shadow-[0_0_26px_hsl(var(--solo)/0.18),0_12px_30px_rgba(0,0,0,0.45)]" alt={author.displayName || 'Rider'} />
              ) : (
                <div className="h-16 w-16 rounded-2xl border border-solo/35 bg-solo/10 flex items-center justify-center text-solo shadow-[0_0_24px_hsl(var(--solo)/0.14)]">
                  <Bike className="h-7 w-7 drop-shadow-[0_0_6px_currentColor]" />
                </div>
              )}
              <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl border border-solo/45 bg-black/90 flex items-center justify-center text-solo shadow-[0_0_14px_hsl(var(--solo)/0.22)]">
                <Bike className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <SignalIcon type={broadcast.type} size="md" />
          )}

          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-widest', styles.labelColor)}>
                {meta.label}{isoSubLabel && ` · ${isoSubLabel}`}
              </span>
              <span className="text-muted-foreground text-xs">· {timeAgo(broadcast.created_date)}</span>
            </div>

            <h3 className="font-semibold text-[15px] leading-tight mb-1 line-clamp-2 text-foreground">
              {broadcast.title}
            </h3>

            {broadcast.body && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{broadcast.body}</p>
            )}

            {/* Footer meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-2">
              {author && !isProminentSolo && (
                <span className="flex items-center gap-1.5">
                  {author.avatar ? (
                    <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-secondary border border-border" />
                  )}
                  {author.displayName}
                </span>
              )}
              {author && isProminentSolo && (
                <span className="flex items-center gap-1.5 font-semibold text-foreground/90">
                  {author.displayName}
                  {author.bike && <span className="text-muted-foreground font-medium">· {author.bike}</span>}
                </span>
              )}
              {distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />~{distance}
                </span>
              )}
              {(broadcast.type === 'event' || isAlert) && broadcast.exactLocationText && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{broadcast.exactLocationText}
                </span>
              )}
              {broadcast.type === 'event' && broadcast.eventDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(broadcast.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
              {broadcast.isoSubtype === 'mechanic' && <Wrench className="w-3 h-3" />}
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />{timeUntilExpiry(broadcast.expiresAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isAlert) return content;
  return <Link to={`/broadcast/${broadcast.id}`}>{content}</Link>;
}