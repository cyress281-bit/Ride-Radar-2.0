/**
 * @fileoverview TanStack Query hooks for reports.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { getReports, createReport } from '@/features/safety/api/safety-api.js';

/** Query key factory for reports. */
export const reportKeys = {
  all: ['reports'],
  list: (userId) => [...reportKeys.all, 'list', userId],
};

/**
 * Hook to fetch reports created by the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useReports() {
  const { user } = useAuthState();
  return useQuery({
    queryKey: reportKeys.list(user?.id),
    queryFn: async () => {
      const { data, error } = await getReports(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

/**
 * Mutation hook to create a report.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, object>}
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportData) => {
      const { data, error } = await createReport(reportData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
