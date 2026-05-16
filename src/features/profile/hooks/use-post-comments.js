import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPostComments,
  addPostComment,
  deletePostComment,
} from '@/features/profile/api/comments-api.js';
import { toast } from 'sonner';

const COMMENTS_KEY = 'post-comments';

/**
 * Query hook to fetch comments for a post.
 * @param {string|null} postId
 */
export function usePostComments(postId) {
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
      const { data } = await addPostComment(postId, body);
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
