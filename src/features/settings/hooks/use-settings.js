/**
 * Settings query hooks using TanStack Query v5.
 *
 * Properly exposes `error`, `isError`, and `refetch` from the underlying query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrCreateSettings,
  updateSettings,
} from '@/features/settings/api/settings-api.js';

/**
 * Query key factory for settings.
 */
export const settingsKeys = {
  all: ['settings'],
  detail: (userId) => [...settingsKeys.all, userId],
};

/**
 * Hook to fetch (or create default) settings for the current user.
 *
 * @param {string|null} userId
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useSettings(userId) {
  return useQuery({
    queryKey: settingsKeys.detail(userId),
    queryFn: async () => {
      const { data, error } = await getOrCreateSettings(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mutation hook to update user settings.
 *
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, {userId: string, updates: object}>}
 */
export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }) => {
      const { data, error } = await updateSettings(userId, updates);
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, updates }) => {
      const queryKey = settingsKeys.detail(userId);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old) => (old ? { ...old, ...updates } : old));

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      qc.invalidateQueries({ queryKey: settingsKeys.detail(userId) });
    },
  });
}
