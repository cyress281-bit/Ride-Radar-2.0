import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBroadcastComments,
  addBroadcastComment,
  deleteBroadcastComment,
} from '@/features/broadcast/api/comments-api.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from 'sonner';

const COMMENTS_KEY = 'broadcast-comments';

/**
 * Query hook to fetch comments for a broadcast, with realtime sync.
 * Subscribes to all changes on broadcast_comments filtered by broadcastId.
 *
 * @param {string|null} broadcastId
 */
export function useBroadcastComments(broadcastId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!broadcastId) return;

    const channel = supabase
      .channel(`broadcast-comments-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_comments',
          filter: `broadcast_id=eq.${broadcastId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: [COMMENTS_KEY, broadcastId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broadcastId, qc]);

  return useQuery({
    queryKey: [COMMENTS_KEY, broadcastId],
    queryFn: async () => {
      const { data, error } = await getBroadcastComments(broadcastId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!broadcastId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to add a comment to a broadcast.
 * Expects: { broadcastId, body }
 */
export function useAddBroadcastComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ broadcastId, body }) => {
      const { data } = await addBroadcastComment(broadcastId, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY, variables.broadcastId] });
    },
    onError: (error) => {
      toast.error('Failed to post comment', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}

/**
 * Mutation hook to delete a broadcast comment.
 * Expects: { commentId, broadcastId }
 */
export function useDeleteBroadcastComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId }) => {
      await deleteBroadcastComment(commentId);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY, variables.broadcastId] });
    },
    onError: (error) => {
      toast.error('Failed to delete comment', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}
