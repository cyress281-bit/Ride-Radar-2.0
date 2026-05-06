import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Shared hook for fetching common admin data across all admin pages.
 * Eliminates duplicate queries and ensures consistent caching strategy.
 *
 * All queries use 60s stale time to reduce unnecessary refetches while
 * maintaining reasonably fresh data for admin operations.
 */
export function useAdminData() {
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    staleTime: 60000,
  });

  const broadcasts = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => base44.entities.Broadcast.list('-created_date', 1000),
    staleTime: 60000,
  });

  const profiles = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => base44.entities.UserProfile.list('-updated_date', 1000),
    staleTime: 60000,
  });

  const reports = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => base44.entities.Report.list('-created_date', 500),
    staleTime: 60000,
  });

  const notifications = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 500),
    staleTime: 60000,
  });

  const blocks = useQuery({
    queryKey: ['admin-blocks'],
    queryFn: () => base44.entities.Block.list('-created_date', 500),
    staleTime: 60000,
  });

  const deletionRequests = useQuery({
    queryKey: ['admin-deletion-requests'],
    queryFn: () => base44.entities.AccountDeletionRequest.list('-created_date', 500),
    staleTime: 60000,
  });

  return {
    users,
    broadcasts,
    profiles,
    reports,
    notifications,
    blocks,
    deletionRequests,
    // Convenience flag for loading state
    isLoading: users.isLoading || broadcasts.isLoading || profiles.isLoading,
  };
}
