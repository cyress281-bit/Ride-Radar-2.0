import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable decorative page header.
 *
 * Replaces the copy-pasted header block found in SettingsPage,
 * NotificationsPage, ProfilePage, and RiderProfilePage.
 *
 * @param {object} props
 * @param {string} props.title - Main heading text
 * @param {string} [props.subtitle] - Optional subtitle/description
 * @param {React.ComponentType} [props.icon] - Optional Lucide icon component
 * @param {React.ReactNode} [props.children] - Optional action buttons or extra content
 * @param {string} [props.className] - Additional classes
 */
export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        'rr-surface-strong relative mb-5 overflow-hidden rounded-[1.25rem] p-5',
        className
      )}
    >
      {/* Decorative circle top-right */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />

      {/* Gradient line at bottom */}
      <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative z-10">
        {Icon && (
          <div className="rr-chip mb-3">
            <Icon className="h-3.5 w-3.5" /> {title}
          </div>
        )}

        <div className="flex items-center gap-3 mb-2">
          {Icon ? (
            <h1 className="rr-heading text-4xl">{title}</h1>
          ) : (
            <h1 className="rr-heading text-4xl">{title}</h1>
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}

        {children}
      </div>
    </div>
  );
});
