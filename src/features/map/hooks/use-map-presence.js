/**
 * Hooks for managing the current user's live map presence.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { getMyPresence, publishPresence, clearPresence } from '@/features/map/api/map-api.js';
import { logger } from '@/lib/logger.js';

export const presenceKeys = {
  all: ['live-map-presence'],
  me: (userId) => [...presenceKeys.all, 'me', userId],
};

/**
 * Hook to fetch the current user's presence record.
 */
export function useMyPresence() {
  const { user } = useSupabaseAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: presenceKeys.me(userId),
    queryFn: async () => {
      const { data, error } = await getMyPresence(userId);
      if (error) throw error;
      return data || null;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to publish presence.
 */
export function usePublishPresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await publishPresence(data);
      if (error) throw error;
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: presenceKeys.all });
      if (variables?.user_id) {
        queryClient.invalidateQueries({ queryKey: presenceKeys.me(variables.user_id) });
      }
    },
    onError: (error) => {
      logger.warn('[usePublishPresence] Failed:', error);
    },
  });
}

/**
 * Mutation hook to clear presence.
 */
export function useClearPresence() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await clearPresence(userId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presenceKeys.all });
      queryClient.invalidateQueries({ queryKey: presenceKeys.me(userId) });
    },
    onError: (error) => {
      logger.warn('[useClearPresence] Failed:', error);
    },
  });
}
