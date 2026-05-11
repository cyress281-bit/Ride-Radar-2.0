/**
 * @fileoverview TanStack Query hooks for friendships.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { getFriendships, removeFriendship } from '@/features/connections/api/connections-api.js';

/** Query key factory for friendships. */
export const friendshipKeys = {
  all: ['friendships'],
  list: (userId) => [...friendshipKeys.all, 'list', userId],
  detail: (userA, userB) => [...friendshipKeys.all, 'detail', userA, userB],
};

/**
 * Hook to fetch active friendships for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useFriendships() {
  const { user } = useAuthState();
  return useQuery({
    queryKey: friendshipKeys.list(user?.id),
    queryFn: async () => {
      const { data, error } = await getFriendships(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

/**
 * Hook to check if the current user is friends with a given user.
 * @param {string|null} userId
 * @returns {{ isFriend: boolean, isLoading: boolean }}
 */
export function useIsFriend(userId) {
  const { user } = useAuthState();
  const { data: friendships = [], isLoading } = useQuery({
    queryKey: friendshipKeys.detail(user?.id, userId),
    queryFn: async () => {
      const { data, error } = await getFriendships(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
    staleTime: 60_000,
  });

  const isFriend = useMemo(
    () =>
      friendships.some(
        (f) =>
          (f.user_a_id === user?.id && f.user_b_id === userId) ||
          (f.user_a_id === userId && f.user_b_id === user?.id)
      ),
    [friendships, user?.id, userId]
  );

  return { isFriend, isLoading };
}

/**
 * Mutation hook to remove a friendship.
 * @returns {import('@tanstack/react-query').UseMutationResult<null, Error, string>}
 */
export function useRemoveFriendship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendshipId) => {
      const { data, error } = await removeFriendship(friendshipId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
    },
  });
}
