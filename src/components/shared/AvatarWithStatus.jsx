import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const STATUS_COLORS = {
  online: 'bg-green-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-muted-foreground',
};

const SIZE_MAP = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const DOT_SIZE_MAP = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

/**
 * Avatar with standardized status indicator.
 *
 * @param {object} props
 * @param {string} [props.url] - Avatar image URL
 * @param {string} props.name - Display name for fallback initials
 * @param {'online'|'away'|'busy'|'offline'} [props.status] - Status dot color. Omit
 *   to render no dot (the app has no real presence system, so callers leave it off).
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Avatar size
 * @param {string} [props.className] - Additional classes for the wrapper
 */
export const AvatarWithStatus = memo(function AvatarWithStatus({
  url,
  name,
  status,
  size = 'md',
  className,
}) {
  const initial = name?.[0]?.toUpperCase() || '?';
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const dotSizeClass = DOT_SIZE_MAP[size] || DOT_SIZE_MAP.md;
  const statusColor = STATUS_COLORS[status];

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={cn(sizeClass, 'border border-primary/[0.12]')}>
        {url && <AvatarImage src={url} alt={name || 'Avatar'} />}
        <AvatarFallback className="bg-muted text-primary font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>

      {/* Status dot — only when a real status is provided (no presence system yet) */}
      {statusColor && (
        <span
          className={cn(
            'absolute bottom-0 right-0',
            'rounded-full border-2 border-background',
            dotSizeClass,
            statusColor
          )}
        />
      )}
    </div>
  );
});
