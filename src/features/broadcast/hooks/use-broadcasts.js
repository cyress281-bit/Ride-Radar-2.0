/**
 * Broadcast query hooks using TanStack Query v5.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBroadcasts,
  getBroadcastById,
  getBroadcastsByAuthor,
  removeBroadcast,
  resolveBroadcast,
  updateBroadcast,
} from '@/features/broadcast/api/broadcast-api.js';
import { toast } from '@/components/ui/use-toast';

/**
 * Query key factory for broadcasts.
 */
export const broadcastKeys = {
  all: ['broadcasts'],
  lists: () => [...broadcastKeys.all, 'list'],
  list: (filters) => [...broadcastKeys.lists(), filters],
  details: () => [...broadcastKeys.all, 'detail'],
  detail: (id) => [...broadcastKeys.details(), id],
  author: (authorId) => [...broadcastKeys.all, 'author', authorId],
};

/**
 * Hook to fetch a list of broadcasts with optional filters.
 *
 * @param {object} [filters]
 * @param {string} [filters.type]
 * @param {string} [filters.status]
 */
export function useBroadcasts(filters = {}) {
  return useQuery({
    queryKey: broadcastKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await getBroadcasts(filters);
      if (error) throw error;
      return data || [];
    },
    select: (data) => data.filter((b) => !b.expires_at || new Date(b.expires_at) > new Date()),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a single broadcast by ID.
 *
 * @param {string|null} id
 */
export function useBroadcast(id) {
  return useQuery({
    queryKey: broadcastKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await getBroadcastById(id);
      if (error) throw error;
      if (!data) return null;
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch all broadcasts by a given author.
 *
 * @param {string|null} authorId
 */
export function useBroadcastsByAuthor(authorId) {
  return useQuery({
    queryKey: broadcastKeys.author(authorId),
    queryFn: async () => {
      const { data, error } = await getBroadcastsByAuthor(authorId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!authorId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to update a broadcast's title and/or body.
 * Only the owner can call this (enforced by RLS: auth.uid() = author_id).
 */
export function useUpdateBroadcast() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields }) => updateBroadcast(id, fields),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: broadcastKeys.all });
      qc.invalidateQueries({ queryKey: broadcastKeys.detail(id) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update signal',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to soft-remove a broadcast (set status='expired').
 * Invalidates all broadcast caches on success.
 * Navigation after removal is handled by the caller.
 */
export function useRemoveBroadcast() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await removeBroadcast(id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: broadcastKeys.all });
      qc.invalidateQueries({ queryKey: broadcastKeys.detail(id) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove signal',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to resolve a Bike Down signal (rider found safe).
 * Sets status='expired' + resolved_at so the detail page can show "Rider found safe."
 * Invalidates the same cache keys as useRemoveBroadcast.
 * Navigation after resolution is handled by the caller.
 */
export function useResolveBroadcast() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }) => {
      const { error } = await resolveBroadcast(id, note);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: broadcastKeys.all });
      qc.invalidateQueries({ queryKey: broadcastKeys.detail(id) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to resolve signal',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
