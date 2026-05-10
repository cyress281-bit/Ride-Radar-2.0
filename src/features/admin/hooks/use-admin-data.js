import { useQueries } from '@tanstack/react-query';
import {
  getUsers,
  getBroadcasts,
  getProfiles,
  getReports,
  getBlocks,
  getNotifications,
  getDeletionRequests,
  getConversations,
} from '@/features/admin/api/admin-api.js';

/**
 * @typedef {Object} AdminQueryResult
 * @property {Array|object|null} data
 * @property {boolean} isLoading
 * @property {boolean} isError
 * @property {Error|null} error
 * @property {Function} refetch
 */

/**
 * Fetches all 8 admin datasets in parallel using useQueries.
 *
 * @returns {{
 *   users: AdminQueryResult,
 *   broadcasts: AdminQueryResult,
 *   profiles: AdminQueryResult,
 *   reports: AdminQueryResult,
 *   blocks: AdminQueryResult,
 *   notifications: AdminQueryResult,
 *   deletionRequests: AdminQueryResult,
 *   conversations: AdminQueryResult,
 *   isLoading: boolean,
 *   isError: boolean,
 * }}
 */
export function useAdminData() {
  const [
    users,
    broadcasts,
    profiles,
    reports,
    blocks,
    notifications,
    deletionRequests,
    conversations,
  ] = useQueries({
    queries: [
      {
        queryKey: ['admin', 'users'],
        queryFn: getUsers,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'broadcasts'],
        queryFn: getBroadcasts,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'profiles'],
        queryFn: getProfiles,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'reports'],
        queryFn: getReports,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'blocks'],
        queryFn: getBlocks,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'notifications'],
        queryFn: getNotifications,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'deletion-requests'],
        queryFn: getDeletionRequests,
        staleTime: 30000,
        refetchInterval: 30000,
      },
      {
        queryKey: ['admin', 'conversations'],
        queryFn: getConversations,
        staleTime: 30000,
        refetchInterval: 30000,
      },
    ],
  });

  const isLoading =
    users.isLoading ||
    broadcasts.isLoading ||
    profiles.isLoading ||
    reports.isLoading ||
    blocks.isLoading ||
    notifications.isLoading ||
    deletionRequests.isLoading ||
    conversations.isLoading;

  const isError =
    users.isError ||
    broadcasts.isError ||
    profiles.isError ||
    reports.isError ||
    blocks.isError ||
    notifications.isError ||
    deletionRequests.isError ||
    conversations.isError;

  return {
    users,
    broadcasts,
    profiles,
    reports,
    blocks,
    notifications,
    deletionRequests,
    conversations,
    isLoading,
    isError,
  };
}
