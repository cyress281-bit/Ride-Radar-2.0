import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Box — Primitive layout container.
 *
 * A polymorphic box that accepts spacing, sizing, and styling props.
 * Use as the foundation for all layout composition.
 *
 * @example
 * <Box p={4} bg="surface" rounded="xl" className="border">
 *   Content
 * </Box>
 */
export const Box = forwardRef(function Box(
  {
    as: Component = 'div',
    p,
    px,
    py,
    pt,
    pr,
    pb,
    pl,
    m,
    mx,
    my,
    mt,
    mr,
    mb,
    ml,
    gap,
    w,
    h,
    minW,
    minH,
    maxW,
    maxH,
    display,
    position,
    inset,
    top,
    right,
    bottom,
    left,
    z,
    overflow,
    bg,
    rounded,
    border,
    shadow,
    className,
    children,
    ...props
  },
  ref
) {
  const spacing = (val) => (val != null ? `${val * 0.25}rem` : undefined);

  const style = {
    padding: spacing(p),
    paddingInline: spacing(px),
    paddingBlock: spacing(py),
    paddingTop: spacing(pt),
    paddingRight: spacing(pr),
    paddingBottom: spacing(pb),
    paddingLeft: spacing(pl),
    margin: spacing(m),
    marginInline: spacing(mx),
    marginBlock: spacing(my),
    marginTop: spacing(mt),
    marginRight: spacing(mr),
    marginBottom: spacing(mb),
    marginLeft: spacing(ml),
    gap: spacing(gap),
    width: w,
    height: h,
    minWidth: minW,
    minHeight: minH,
    maxWidth: maxW,
    maxHeight: maxH,
    display,
    position,
    inset,
    top,
    right,
    bottom,
    left,
    zIndex: z,
    overflow,
    backgroundColor: bg ? `hsl(var(--${bg}))` : undefined,
    borderRadius: rounded != null ? (typeof rounded === 'number' ? `${rounded * 0.25}rem` : rounded) : undefined,
    boxShadow: shadow,
  };

  // Remove undefined values
  const cleanStyle = Object.fromEntries(Object.entries(style).filter(([, v]) => v != null));

  return (
    <Component ref={ref} className={className} style={Object.keys(cleanStyle).length ? cleanStyle : undefined} {...props}>
      {children}
    </Component>
  );
});
