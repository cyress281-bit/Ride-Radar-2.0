import { cn } from '@/lib/utils.js';
import AdminBackLink from './AdminBackLink.jsx';

/**
 * Admin page shell with back link to /home and "Command Center" branding.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function AdminLayout({ children, className }) {
  return (
    <div className={cn('mx-auto max-w-5xl px-4 py-5 sm:px-5 sm:py-6', className)}>
      <AdminBackLink />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Moderation, compliance, operations, and platform management.
        </p>
      </div>
      {children}
    </div>
  );
}
