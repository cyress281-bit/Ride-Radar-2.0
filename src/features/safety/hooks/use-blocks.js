/**
 * @fileoverview TanStack Query hooks for user blocks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { toast } from 'sonner';
import {
  getBlocks,
  createBlock,
  removeBlock,
  isBlocked as checkIsBlocked,
} from '@/features/safety/api/safety-api.js';

/** Query key factory for blocks. */
export const blockKeys = {
  all: ['blocks'],
  list: (userId) => [...blockKeys.all, 'list', userId],
  check: (userId, targetId) => [...blockKeys.all, 'check', userId, targetId],
};

/**
 * Hook to fetch blocks created by the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useBlocks() {
  const { user } = useAuthState();
  return useQuery({
    queryKey: blockKeys.list(user?.id),
    queryFn: async () => {
      const { data, error } = await getBlocks(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

/**
 * Hook to check if the current user has blocked a specific user.
 * @param {string|null} userId
 * @returns {import('@tanstack/react-query').UseQueryResult<boolean>}
 */
export function useIsBlocked(userId) {
  const { user } = useAuthState();
  return useQuery({
    queryKey: blockKeys.check(user?.id, userId),
    queryFn: async () => {
      const { data, error } = await checkIsBlocked(user.id, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to create a block.
 * Invalidates blocks, conversations, and broadcasts queries.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, object>}
 */
export function useCreateBlock() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  return useMutation({
    mutationFn: async (blockData) => {
      const { data, error } = await createBlock(blockData);
      if (error) throw error;
      return data;
    },
    onMutate: async (blockData) => {
      await queryClient.cancelQueries({ queryKey: blockKeys.all });
      const previousBlocks = queryClient.getQueryData(blockKeys.list(user?.id));
      queryClient.setQueryData(blockKeys.list(user?.id), (old = []) => [
        ...(old || []),
        {
          id: `optimistic-${Date.now()}`,
          blocker_user_id: user?.id,
          blocked_user_id: blockData.blocked_user_id,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previousBlocks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.all });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('User blocked');
    },
    onError: (error, _variables, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(blockKeys.list(user?.id), context.previousBlocks);
      }
      toast.error('Failed to block user', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}

/**
 * Mutation hook to remove a block.
 * @returns {import('@tanstack/react-query').UseMutationResult<null, Error, string>}
 */
export function useRemoveBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockId) => {
      const { data, error } = await removeBlock(blockId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.all });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('User unblocked');
    },
    onError: (error) => {
      toast.error('Failed to unblock user', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}


