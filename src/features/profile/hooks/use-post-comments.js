import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPostComments,
  addPostComment,
  deletePostComment,
} from '@/features/profile/api/comments-api.js';
import { supabase } from '@/lib/supabase.js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';

const COMMENTS_KEY = 'post-comments';

/**
 * Query hook to fetch comments for a post, with realtime INSERT/UPDATE/DELETE sync.
 * @param {string|null} postId
 */
export function usePostComments(postId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        () => { qc.invalidateQueries({ queryKey: [COMMENTS_KEY, postId] }); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        () => { qc.invalidateQueries({ queryKey: [COMMENTS_KEY, postId] }); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        () => { qc.invalidateQueries({ queryKey: [COMMENTS_KEY, postId] }); }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[usePostComments] Realtime disconnected (expected reconnect)', { status });
          } else {
            logger.error('[usePostComments] Realtime subscription error:', err);
          }
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [postId, qc]);

  return useQuery({
    queryKey: [COMMENTS_KEY, postId],
    queryFn: async () => {
      const { data, error } = await getPostComments(postId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!postId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to add a comment to a post.
 * Expects: { postId, body }
 * Invalidates the post's comment cache on success.
 */
export function useAddPostComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, body }) => {
      const { data, error } = await addPostComment(postId, body);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY, variables.postId] });
    },
    onError: (error) => {
      toast.error('Failed to post comment', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}

/**
 * Mutation hook to delete a comment.
 * Expects: { commentId, postId }
 * Invalidates the post's comment cache on success.
 */
export function useDeletePostComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId }) => {
      await deletePostComment(commentId);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [COMMENTS_KEY, variables.postId] });
    },
    onError: (error) => {
      toast.error('Failed to delete comment', {
        description: error?.message || 'Please try again.',
      });
    },
  });
}
