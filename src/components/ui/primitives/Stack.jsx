import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Stack — Vertical or horizontal flex container.
 *
 * @example
 * <Stack gap={4} align="center">
 *   <Item />
 *   <Item />
 * </Stack>
 *
 * <Stack direction="row" gap={2} justify="between">
 *   <Item />
 *   <Item />
 * </Stack>
 */
export const Stack = forwardRef(function Stack(
  {
    direction = 'column',
    gap = 0,
    align,
    justify,
    wrap,
    flex,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        align === 'start' && 'items-start',
        align === 'center' && 'items-center',
        align === 'end' && 'items-end',
        align === 'stretch' && 'items-stretch',
        justify === 'start' && 'justify-start',
        justify === 'center' && 'justify-center',
        justify === 'end' && 'justify-end',
        justify === 'between' && 'justify-between',
        justify === 'around' && 'justify-around',
        justify === 'evenly' && 'justify-evenly',
        wrap === true && 'flex-wrap',
        wrap === false && 'flex-nowrap',
        flex != null && (typeof flex === 'boolean' ? 'flex-1' : `flex-[${flex}]`),
        className
      )}
      style={{ gap: gap != null ? `${gap * 0.25}rem` : undefined }}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * HStack — Horizontal stack shorthand.
 */
export const HStack = forwardRef(function HStack(props, ref) {
  return <Stack ref={ref} direction="row" {...props} />;
});

/**
 * VStack — Vertical stack shorthand.
 */
export const VStack = forwardRef(function VStack(props, ref) {
  return <Stack ref={ref} direction="column" {...props} />;
});
