import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Standardized 44px touch-target icon button.
 *
 * @param {object} props
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {() => void} props.onClick - Click handler
 * @param {string} props.ariaLabel - Accessibility label
 * @param {boolean} [props.active=false] - Active state styling
 * @param {string} [props.className] - Additional classes
 */
export const IconButton = memo(function IconButton({
  icon: Icon,
  onClick,
  ariaLabel,
  active = false,
  className,
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'h-11 w-11 min-h-[44px] min-w-[44px]',
        'rounded-full',
        'transition-all duration-150',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
});
