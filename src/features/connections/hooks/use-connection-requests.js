/**
 * @fileoverview TanStack Query hooks for connection requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import {
  getConnectionRequests,
  getSentRequests,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
} from '@/features/connections/api/connections-api.js';

/** Query key factory for connection requests. */
export const connectionRequestKeys = {
  all: ['connection-requests'],
  incoming: (userId) => [...connectionRequestKeys.all, 'incoming', userId],
  sent: (userId) => [...connectionRequestKeys.all, 'sent', userId],
};

/**
 * Hook to fetch pending connection requests for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useConnectionRequests() {
  const { user } = useAuthState();
  return useQuery({
    queryKey: connectionRequestKeys.incoming(user?.id),
    queryFn: async () => {
      const { data, error } = await getConnectionRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

/**
 * Hook to fetch sent connection requests for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useSentRequests() {
  const { user } = useAuthState();
  return useQuery({
    queryKey: connectionRequestKeys.sent(user?.id),
    queryFn: async () => {
      const { data, error } = await getSentRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to send a connection request.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, {from_user_id: string, to_user_id: string}>}
 */
export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ from_user_id, to_user_id }) => {
      const { data, error } = await sendConnectionRequest({ from_user_id, to_user_id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
    },
  });
}

/**
 * Mutation hook to accept a connection request.
 * Also creates a friendship and a conversation.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, string>}
 */
export function useAcceptConnectionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId) => {
      const { data, error } = await acceptConnectionRequest(requestId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Mutation hook to decline a connection request.
 * @returns {import('@tanstack/react-query').UseMutationResult<null, Error, string>}
 */
export function useDeclineConnectionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId) => {
      const { data, error } = await declineConnectionRequest(requestId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
    },
  });
}
