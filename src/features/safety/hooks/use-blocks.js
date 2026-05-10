/**
 * @fileoverview TanStack Query hooks for user blocks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
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
  const { user } = useSupabaseAuth();
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
 * Hook to get a Set of blocked user IDs for quick lookup.
 * @returns {{ blockedIds: Set<string>, isLoading: boolean }}
 */
export function useBlockedIds() {
  const { data: blocks = [], isLoading } = useBlocks();
  const blockedIds = useMemo(
    () => new Set(blocks.map((b) => b.blocked_user_id)),
    [blocks]
  );
  return { blockedIds, isLoading };
}

/**
 * Hook to check if the current user has blocked a specific user.
 * @param {string|null} userId
 * @returns {import('@tanstack/react-query').UseQueryResult<boolean>}
 */
export function useIsBlocked(userId) {
  const { user } = useSupabaseAuth();
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
  return useMutation({
    mutationFn: async (blockData) => {
      const { data, error } = await createBlock(blockData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.all });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
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
    },
  });
}
