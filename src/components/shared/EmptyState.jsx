import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Consistent empty state with icon, title, description, and optional action.
 *
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} props.title - Title text
 * @param {string} [props.description] - Description text
 * @param {{ label: string, onClick: () => void, variant?: string }} [props.action] - Optional action button config
 * @param {string} [props.className] - Additional classes
 */
export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[1rem] p-5',
        'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}

      <h3 className="font-semibold text-lg text-foreground">{title}</h3>

      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'outline'}
          className="mt-4 rounded-full"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
});
