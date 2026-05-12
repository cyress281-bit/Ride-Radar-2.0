import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * AspectRatio — Container that maintains a fixed aspect ratio.
 *
 * @example
 * <AspectRatio ratio={16 / 9}>
 *   <img src="..." className="object-cover w-full h-full" />
 * </AspectRatio>
 *
 * <AspectRatio ratio={1} className="rounded-2xl overflow-hidden">
 *   <AvatarImage src="..." />
 * </AspectRatio>
 */
export const AspectRatio = forwardRef(function AspectRatio(
  { ratio = 1, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
      {...props}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
});
