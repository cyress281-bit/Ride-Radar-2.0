import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Standardized card/panel surface.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] - Additional classes
 * @param {boolean} [props.hover=false] - Enable hover elevation
 * @param {'normal'|'compact'|'loose'} [props.padding='normal'] - Padding size
 */
export const Panel = memo(function Panel({
  children,
  className,
  hover = false,
  padding = 'normal',
}) {
  const paddingMap = {
    normal: 'p-5',
    compact: 'p-4',
    loose: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[1rem]',
        paddingMap[padding] || paddingMap.normal,
        hover &&
          'hover:bg-surface-elevated transition-all duration-200 hover:shadow-[0_0_12px_hsl(var(--primary)/0.12),0_0_28px_hsl(var(--primary)/0.06)]',
        className
      )}
    >
      {children}
    </div>
  );
});
