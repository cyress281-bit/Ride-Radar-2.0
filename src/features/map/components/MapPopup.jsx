import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { BROADCAST_META, formatDistance, haversineMiles, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';

const typeConfig = {
  alert: { label: 'Road Warning', text: 'text-alert', leftStripe: 'bg-alert' },
  solo_ride: { label: 'Rider', text: 'text-solo', leftStripe: 'bg-solo' },
  iso: { label: 'Help', text: 'text-iso', leftStripe: 'bg-iso' },
  event: { label: 'Event', text: 'text-event', leftStripe: 'bg-event' },
  rider_presence: { label: 'Rider', text: 'text-cyan', leftStripe: 'bg-cyan' },
};

/**
 * Popup content for map markers.
 *
 * @param {object} props
 * @param {object} props.item
 * @param {number|null} props.userLat
 * @param {number|null} props.userLng
 */
const MapPopup = memo(function MapPopup({ item, userLat, userLng }) {
  const config = typeConfig[item.type] || typeConfig.solo_ride;
  const hasCoords = userLat != null && userLng != null;
  const distance = hasCoords ? formatDistance(haversineMiles(userLat, userLng, item.lat, item.lng)) : null;
  const signalAge = item.created_at ? timeAgo(item.created_at) : 'live';
  const isPresence = item.type === 'rider_presence';
  const title = isPresence ? item.display_name || 'Live rider' : item.title || BROADCAST_META[item.type]?.label || 'Signal';
  const detail = isPresence ? item.vehicle_label || null : item.location_name || null;
  const riderPrecision = isPresence ? item.location_precision || 'approximate' : null;

  return (
    <div className="min-w-56 max-w-72 rounded-lg bg-background p-3 text-foreground shadow-lg">
      <div className={cn('h-[2px] w-full rounded-full', config.leftStripe, isPresence ? 'opacity-60' : 'opacity-80')} />
      <div className="mt-2.5">
        <div className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', config.text)}>
          {config.label}
          {!isPresence && item.author?.display_name ? ` / ${item.author.display_name}` : ''}
        </div>
        <div className="mt-1 break-words font-display text-base font-bold leading-tight">{title}</div>
        {!isPresence && item.body && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
        )}
        {detail && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
            <span className="truncate">{detail}</span>
          </div>
        )}
        {riderPrecision && (
          <div className="mt-2 inline-flex rounded-full border border-border/50 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {riderPrecision} location
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono tracking-tight">
          {distance && <span className="tabular-nums">{distance}</span>}
          <span className="tabular-nums">{signalAge}</span>
          {item.expires_at && <span className="tabular-nums">{timeUntilExpiry(item.expires_at)}</span>}
        </div>
        <Link
          to={isPresence ? `/profile/${item.user_id}` : `/broadcast/${item.id}`}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
        >
          {isPresence ? 'Open profile' : 'Open signal'}
        </Link>
      </div>
    </div>
  );
});

export default MapPopup;
