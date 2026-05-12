import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const VARIANT_STYLES = {
  h1: 'text-[28px] font-extrabold tracking-tight leading-[0.94]',
  h2: 'text-[22px] font-bold tracking-tight leading-tight',
  h3: 'text-lg font-bold tracking-tight leading-snug',
  body: 'text-[15px] font-normal leading-relaxed',
  bodySm: 'text-[13px] font-normal leading-relaxed',
  caption: 'text-xs font-medium leading-snug',
  micro: 'text-[11px] font-semibold uppercase tracking-[0.12em] leading-none',
  mono: 'text-xs font-mono leading-snug',
};

const COLOR_STYLES = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  destructive: 'text-destructive',
  brandYamaha: 'text-brand-yamaha',
  brandHonda: 'text-brand-honda',
  brandDucati: 'text-brand-ducati',
  white: 'text-white',
};

/**
 * Text — Typography primitive with variant and color props.
 *
 * @example
 * <Text variant="h1" color="default">Ride Radar</Text>
 * <Text variant="body" color="muted">Discover riders near you</Text>
 * <Text variant="micro" color="primary">LIVE</Text>
 */
export const Text = forwardRef(function Text(
  {
    as: Component = 'span',
    variant = 'body',
    color = 'default',
    align,
    truncate,
    balance,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <Component
      ref={ref}
      className={cn(
        VARIANT_STYLES[variant],
        COLOR_STYLES[color],
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        truncate === true && 'truncate',
        truncate === 'multi' && 'line-clamp-2',
        balance && 'text-balance',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
