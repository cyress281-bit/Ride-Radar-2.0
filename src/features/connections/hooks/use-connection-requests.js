/**
 * @fileoverview TanStack Query hooks for connection requests.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';
import {
  markRealtimeSurfaceSubscribed,
  markRealtimeSurfaceReconnecting,
  markRealtimeSurfaceError,
} from '@/lib/realtimeHealthRegistry.js';
import {
  getConnectionRequests,
  getSentRequests,
  getConnectionRequestBetween,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
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
  const queryClient = useQueryClient();
  const instanceId = useRef(crypto.randomUUID());

  const query = useQuery({
    queryKey: connectionRequestKeys.incoming(user?.id),
    queryFn: async () => {
      const { data, error } = await getConnectionRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      markRealtimeSurfaceSubscribed('connection-requests');
    } else if (query.isError) {
      markRealtimeSurfaceError('connection-requests');
    }
  }, [query.isError, query.isSuccess]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`connection-requests-incoming-${user.id}-${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: connectionRequestKeys.incoming(user.id) });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[useConnectionRequests] Incoming subscription disconnected (expected reconnect)', {
              status,
              name: err?.name,
              code: err?.code,
              message: err?.message,
            });
            markRealtimeSurfaceReconnecting('connection-requests');
          } else {
            logger.error('[useConnectionRequests] Incoming subscription error:', err);
            markRealtimeSurfaceError('connection-requests');
          }
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('connection-requests');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('connection-requests');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

/**
 * Hook to fetch sent connection requests for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult<object[]>}
 */
export function useSentRequests() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const instanceId = useRef(crypto.randomUUID());

  const query = useQuery({
    queryKey: connectionRequestKeys.sent(user?.id),
    queryFn: async () => {
      const { data, error } = await getSentRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      markRealtimeSurfaceSubscribed('connection-requests');
    } else if (query.isError) {
      markRealtimeSurfaceError('connection-requests');
    }
  }, [query.isError, query.isSuccess]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`connection-requests-sent-${user.id}-${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `from_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: connectionRequestKeys.sent(user.id) });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[useConnectionRequests] Sent subscription disconnected (expected reconnect)', {
              status,
              name: err?.name,
              code: err?.code,
              message: err?.message,
            });
            markRealtimeSurfaceReconnecting('connection-requests');
          } else {
            logger.error('[useConnectionRequests] Sent subscription error:', err);
            markRealtimeSurfaceError('connection-requests');
          }
        } else if (status && status !== 'SUBSCRIBED') {
          markRealtimeSurfaceReconnecting('connection-requests');
        } else if (status === 'SUBSCRIBED') {
          markRealtimeSurfaceSubscribed('connection-requests');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

/**
 * Hook to check for a pending connection request between current user and another user.
 * @param {string|null} userId
 * @returns {import('@tanstack/react-query').UseQueryResult<object|null>}
 */
export function useConnectionRequestWith(userId) {
  const { user } = useAuthState();
  const query = useQuery({
    queryKey: [...connectionRequestKeys.all, 'between', user?.id, userId],
    queryFn: async () => {
      const { data, error } = await getConnectionRequestBetween(user.id, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      markRealtimeSurfaceSubscribed('connection-requests');
    } else if (query.isError) {
      markRealtimeSurfaceError('connection-requests');
    }
  }, [query.isError, query.isSuccess]);

  return query;
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
      toast.success('Connection request sent');
    },
    onError: (error) => {
      toast.error('Failed to send request', {
        description: error?.message || 'Please try again.',
      });
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
      toast.success('Connection accepted');
    },
    onError: (error) => {
      toast.error('Failed to accept request', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}

/**
 * Mutation hook to cancel an outgoing connection request.
 * Optimistically removes the row from the sent list.
 * @returns {import('@tanstack/react-query').UseMutationResult<null, Error, string>}
 */
export function useCancelConnectionRequest() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId) => {
      const { data, error } = await cancelConnectionRequest(requestId);
      if (error) throw error;
      return data;
    },
    onMutate: async (requestId) => {
      const sentKey = connectionRequestKeys.sent(user?.id);
      await queryClient.cancelQueries({ queryKey: sentKey });
      const previous = queryClient.getQueryData(sentKey);
      queryClient.setQueryData(sentKey, (old = []) =>
        old.filter((r) => r.id !== requestId)
      );
      return { previous, sentKey };
    },
    onError: (_error, _requestId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.sentKey, context.previous);
      }
      toast.error('Failed to cancel request', {
        description: 'Please try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
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
      toast.success('Connection declined');
    },
    onError: (error) => {
      toast.error('Failed to decline request', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}
