/**
 * TanStack Query hooks for profile posts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserPosts, createPost, deletePost } from '@/features/profile/api/posts-api';
import { toast } from '@/components/ui/use-toast';

const POSTS_KEY = 'user-posts';

/**
 * Query hook for a user's posts (with nested photos).
 * @param {string|null} userId
 * @param {object} [options]
 */
export function useUserPosts(userId, options = {}) {
  return useQuery({
    queryKey: [POSTS_KEY, userId],
    queryFn: async () => {
      const { data, error } = await getUserPosts(userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Mutation hook to create a new post.
 * Expects: { userId, caption?, photos: Array<File|{file: File}> }
 * Invalidates the user's posts cache on success.
 */
export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, caption, photos }) => {
      const { data, error } = await createPost(userId, { caption, photos });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY, variables.userId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create post',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation hook to delete a post and its storage objects.
 * Expects: { postId, userId }
 * Invalidates the user's posts cache on success.
 */
export function useDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }) => {
      const { error } = await deletePost(postId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [POSTS_KEY, variables.userId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete post',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
