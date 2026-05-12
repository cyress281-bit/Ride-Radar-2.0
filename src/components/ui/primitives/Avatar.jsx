import { forwardRef, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const STATUS_COLORS = {
  online: 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]',
  away: 'bg-amber shadow-[0_0_6px_hsl(var(--amber)/0.5)]',
  offline: 'bg-muted-foreground',
  busy: 'bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.6)]',
};

/**
 * Avatar with status indicator, gradient rings, and fallback initials.
 * Electric neon edition.
 *
 * @param {object} props
 * @param {string} [props.src] - Avatar image URL
 * @param {string} [props.name] - Display name for fallback initials
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Avatar size
 * @param {'online'|'away'|'offline'|'busy'} [props.status] - Status indicator
 * @param {'none'|'primary'|'brand'} [props.ring='none'] - Ring style
 * @param {string} [props.className] - Additional classes
 */
export const Avatar = forwardRef(function Avatar(
  { src, name, size = 'md', status, ring = 'none', className },
  ref
) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const dim = SIZE_MAP[size] ?? SIZE_MAP.md;

  const initials = useMemo(() => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  const showImg = src && !error;
  const isLoading = showImg && !loaded;
  const wrapperSize = ring !== 'none' ? dim + 6 : dim;

  return (
    <div
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-muted text-foreground font-semibold',
        isLoading && 'animate-pulse',
        ring === 'primary' && 'rr-avatar-ring',
        ring === 'brand' &&
          'p-[3px] bg-gradient-to-br from-primary/40 to-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.15)]',
        className
      )}
      style={{ width: wrapperSize, height: wrapperSize }}
    >
      {showImg && (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn('w-full h-full object-cover rounded-full', !loaded && 'opacity-0')}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}
      {(!showImg || !loaded) && (
        <span style={{ fontSize: dim * 0.4 }} className="leading-none select-none">
          {initials}
        </span>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            STATUS_COLORS[status] || STATUS_COLORS.offline
          )}
          style={{ width: Math.max(8, dim * 0.28), height: Math.max(8, dim * 0.28) }}
        />
      )}
    </div>
  );
});
