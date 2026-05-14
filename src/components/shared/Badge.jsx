import { memo } from 'react';
import { cn } from '@/lib/utils';

const TYPE_MAP = {
  alert: { bg: 'bg-alert', text: 'text-alert-foreground' },
  solo_ride: { bg: 'bg-solo', text: 'text-solo-foreground' },
  iso: { bg: 'bg-iso', text: 'text-iso-foreground' },
  event: { bg: 'bg-event', text: 'text-event-foreground' },
};

const DEFAULT_LABELS = {
  alert: 'Road Warning',
  solo_ride: 'Ride Now',
  iso: 'Need Help',
  event: 'Plan a Meetup',
};

/**
 * Type badge for broadcasts.
 *
 * @param {object} props
 * @param {'alert'|'solo_ride'|'iso'|'event'} props.type - Broadcast type
 * @param {string} [props.label] - Override badge label
 * @param {string} [props.className]
 */
export const Badge = memo(function Badge({ type, label, className }) {
  const config = TYPE_MAP[type] || TYPE_MAP.solo_ride;
  const displayLabel = label || DEFAULT_LABELS[type] || 'Broadcast';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
        config.bg,
        config.text,
        className
      )}
    >
      {displayLabel}
    </span>
  );
});
