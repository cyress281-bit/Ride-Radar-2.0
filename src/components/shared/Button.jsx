import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const VARIANT_CLASSES = {
  primary:
    'bg-primary text-primary-foreground rounded-full hover:bg-primary/90',
  secondary:
    'bg-surface text-foreground rounded-full border border-border hover:bg-surface-elevated',
  ghost:
    'bg-transparent text-foreground hover:bg-surface',
  outline:
    'bg-transparent border border-border text-foreground rounded-full hover:bg-surface',
  destructive:
    'bg-destructive text-white rounded-full hover:bg-destructive/90',
};

const SIZE_CLASSES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-14 px-8 text-lg w-full md:w-auto',
};

/**
 * Comprehensive button system with variants, sizes, and loading state.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'outline'|'destructive'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ComponentType} [props.leftIcon] - Icon component to render left of label
 * @param {React.ComponentType} [props.rightIcon] - Icon component to render right of label
 * @param {string} [props.className]
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    children,
    className,
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'active:scale-[0.96]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {!isLoading && LeftIcon && <LeftIcon className="h-4 w-4" aria-hidden="true" />}
      {children}
      {!isLoading && RightIcon && <RightIcon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
});
