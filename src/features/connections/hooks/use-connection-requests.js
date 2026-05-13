/**
 * @fileoverview TanStack Query hooks for connection requests.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger.js';
import {
  getConnectionRequests,
  getSentRequests,
  getConnectionRequestBetween,
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: connectionRequestKeys.incoming(user?.id),
    queryFn: async () => {
      const { data, error } = await getConnectionRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`connection-requests-incoming-${user.id}`)
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
          logger.error('[useConnectionRequests] Incoming subscription error:', err);
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

  const query = useQuery({
    queryKey: connectionRequestKeys.sent(user?.id),
    queryFn: async () => {
      const { data, error } = await getSentRequests(user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`connection-requests-sent-${user.id}`)
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
          logger.error('[useConnectionRequests] Sent subscription error:', err);
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
  return useQuery({
    queryKey: [...connectionRequestKeys.all, 'between', user?.id, userId],
    queryFn: async () => {
      const { data, error } = await getConnectionRequestBetween(user.id, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!userId,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to send a connection request.
 * @returns {import('@tanstack/react-query').UseMutationResult<object, Error, {from_user_id: string, to_user_id: string}>}
 */
export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  const lastRunRef = useRef(0);

  return useMutation({
    mutationFn: async ({ from_user_id, to_user_id }) => {
      const now = Date.now();
      if (now - lastRunRef.current < 10_000) {
        throw new Error('Please wait a moment before trying again.');
      }
      lastRunRef.current = now;
      const { data, error } = await sendConnectionRequest({ from_user_id, to_user_id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionRequestKeys.all });
      toast({ title: 'Connection request sent' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
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
      toast({ title: 'Connection accepted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to accept request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
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
      toast({ title: 'Connection declined' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to decline request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
