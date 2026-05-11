import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Glassmorphism variant of Panel.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] - Additional classes
 */
export const GlassPanel = memo(function GlassPanel({ children, className }) {
  return (
    <div
      className={cn(
        'bg-surface/80 backdrop-blur-xl border border-white/[0.08]',
        'rounded-[1rem] p-5',
        className
      )}
    >
      {children}
    </div>
  );
});
