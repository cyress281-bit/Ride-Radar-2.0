import { useAdminRole } from '@/features/auth/hooks/use-admin-role.js';

/**
 * AdminPageShell — Eliminates the copy-pasted guard logic from every admin page.
 *
 * Handles:
 * - Role loading skeleton state
 * - Access-denied fallback
 *
 * @param {Object} props
 * @param {React.ReactNode} props.skeleton — Skeleton UI shown while role is loading
 * @param {React.ReactNode} props.children — Actual page content (must wrap itself in AdminLayout)
 */
export default function AdminPageShell({ skeleton, children }) {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();

  if (roleLoading) {
    return skeleton;
  }

  if (!isAdmin) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Admin access required.
      </div>
    );
  }

  return children;
}
