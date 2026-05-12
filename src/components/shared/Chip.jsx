import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Filter / selectable chip.
 *
 * @param {object} props
 * @param {string} props.label - Chip text
 * @param {boolean} [props.isActive=false]
 * @param {() => void} [props.onClick]
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} [props.className]
 */
export const Chip = memo(function Chip({ label, isActive, onClick, icon: Icon, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isActive
          ? 'bg-primary text-primary-foreground border border-primary'
          : 'bg-transparent text-foreground border border-border hover:bg-surface',
        className
      )}
      aria-pressed={isActive}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </button>
  );
});
