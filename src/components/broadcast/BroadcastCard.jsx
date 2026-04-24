import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Users, Calendar, Clock, Wrench } from 'lucide-react';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';

const iconMap = {
  solo_ride: MapPin,
  iso: Users,
  event: Calendar,
  alert: AlertTriangle,
};

const typeStyles = {
  alert: {
    card: 'bg-card border-alert/40 hover:border-alert/70 hover:shadow-[0_0_20px_hsl(var(--alert)/0.15)]',
    badge: 'bg-alert text-alert-foreground',
    icon: 'bg-alert/10 text-alert',
    labelColor: 'text-alert',
  },
  solo_ride: {
    card: 'bg-card border-border hover:border-solo/50 hover:shadow-[0_0_20px_hsl(var(--solo)/0.15)]',
    badge: 'bg-solo text-solo-foreground',
    icon: 'bg-solo/10 text-solo',
    labelColor: 'text-solo',
  },
  iso: {
    card: 'bg-card border-border hover:border-iso/50 hover:shadow-[0_0_20px_hsl(var(--iso)/0.15)]',
    badge: 'bg-iso text-iso-foreground',
    icon: 'bg-iso/10 text-iso',
    labelColor: 'text-iso',
  },
  event: {
    card: 'bg-card border-border hover:border-event/50 hover:shadow-[0_0_20px_hsl(var(--event)/0.15)]',
    badge: 'bg-event text-event-foreground',
    icon: 'bg-event/10 text-event',
    labelColor: 'text-event',
  },
};

export default function BroadcastCard({ broadcast, author, userLat, userLng }) {
  const meta = BROADCAST_META[broadcast.type];
  const Icon = iconMap[broadcast.type];
  const isAlert = broadcast.type === 'alert';
  const styles = typeStyles[broadcast.type] || typeStyles.solo_ride;

  const distance =
    (broadcast.type === 'solo_ride' || broadcast.type === 'iso') && userLat != null && broadcast.frozenLat != null
      ? formatDistance(haversineMiles(userLat, userLng, broadcast.frozenLat, broadcast.frozenLng))
      : null;

  const isoSubLabel =
    broadcast.isoSubtype === 'mechanic' ? 'Mechanic' : broadcast.isoSubtype === 'bike_crew' ? 'Bike Crew' : null;

  const content = (
    <div className={cn('relative rounded-2xl border overflow-hidden transition-all duration-200', styles.card)}>
      {/* Alert top bar */}
      {isAlert && <div className="absolute top-0 left-0 right-0 h-[2px] bg-alert animate-pulse-alert" />}

      {/* ISO green top accent */}
      {broadcast.type === 'iso' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/70" />}

      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-current/20', styles.icon)}>
            <Icon className="w-6 h-6" strokeWidth={2} />
          </div>

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

            {broadcast.type === 'event' && broadcast.eventImage && (
              <img src={broadcast.eventImage} className="w-full h-36 object-cover rounded-lg mt-2 mb-2" alt="" />
            )}

            {/* Footer meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-2">
              {author && (
                <span className="flex items-center gap-1.5">
                  {author.avatar ? (
                    <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-secondary border border-border" />
                  )}
                  @{author.username}
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