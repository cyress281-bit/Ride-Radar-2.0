import AdminBackLink from './AdminBackLink';

/**
 * Consistent layout wrapper for all admin pages.
 * Provides standard header structure with back link, title, and description.
 */
export default function AdminLayout({ title, description, children }) {
  return (
    <div className="px-5 pt-5">
      <AdminBackLink />
      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
