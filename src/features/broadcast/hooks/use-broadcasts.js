/**
 * Broadcast query hooks using TanStack Query v5.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getBroadcasts,
  getBroadcastById,
  getBroadcastsByAuthor,
} from '@/features/broadcast/api/broadcast-api.js';

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
    refetchOnWindowFocus: false,
  });
}
