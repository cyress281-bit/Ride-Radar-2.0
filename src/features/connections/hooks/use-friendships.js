/**
 * @fileoverview TanStack Query hooks for friendships.
 */

import { useEffect, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';
import { getFriendships, getFriendshipBetween, removeFriendship } from '@/features/connections/api/connections-api.js';

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
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const query = useQuery({
    queryKey: friendshipKeys.list(user?.id),
    queryFn: async () => {
      const { data, error } = await getFriendships(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`friendships-${user.id}-${instanceId}`)
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
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[useFriendships] Realtime subscription disconnected (expected reconnect)', {
              status,
              name: err?.name,
              code: err?.code,
              message: err?.message,
            });
        } else {
            logger.error('[useFriendships] Realtime subscription error:', err);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, instanceId]);

  return query;
}

/**
 * Hook to check if the current user is friends with a given user.
 * @param {string|null} userId
 * @returns {{ isFriend: boolean, isLoading: boolean }}
 */
export function useIsFriend(userId) {
  const { user } = useAuthState();
  const { data: friendship, isLoading, isSuccess, isError } = useQuery({
    queryKey: [...friendshipKeys.detail(user?.id, userId), 'between'],
    queryFn: async () => {
      const { data, error } = await getFriendshipBetween(user.id, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return { isFriend: !!friendship, friendship, isLoading };
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
      toast.success('Friend removed');
    },
    onError: (error) => {
      toast.error('Failed to remove friend', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}
