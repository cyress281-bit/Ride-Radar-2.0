/**
 * @fileoverview TanStack Query hooks for friendships.
 */

import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from '@/components/ui/use-toast';
import { getFriendships, removeFriendship } from '@/features/connections/api/connections-api.js';
import { connectionRequestKeys } from '@/features/connections/hooks/use-connection-requests.js';

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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: friendshipKeys.list(user?.id),
    queryFn: async () => {
      const { data, error } = await getFriendships(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`friendships-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_a_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_b_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: friendshipKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
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
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
      toast({ title: 'Friend removed' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove friend',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
