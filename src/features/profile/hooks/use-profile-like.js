import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase.js';
import { useAuthState } from '@/features/auth/hooks/use-auth';

const likeKeys = {
  count: (userId) => ['profile-likes', 'count', userId],
  isLiked: (userId, currentUserId) => ['profile-likes', 'is-liked', userId, currentUserId],
};

export function useProfileLike(targetUserId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const enabled = !!targetUserId;

  const { data: likeCount = 0, isLoading: countLoading } = useQuery({
    queryKey: likeKeys.count(targetUserId),
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profile_likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_user_id', targetUserId);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30000,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: likeKeys.isLiked(targetUserId, currentUserId),
    enabled: enabled && !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_likes')
        .select('id')
        .eq('liker_id', currentUserId)
        .eq('liked_user_id', targetUserId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 30000,
  });

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: async () => {
      if (isLiked) {
        const { error } = await supabase
          .from('profile_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_user_id', targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_likes')
          .insert({ liker_id: currentUserId, liked_user_id: targetUserId });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: likeKeys.count(targetUserId) });
      await queryClient.cancelQueries({ queryKey: likeKeys.isLiked(targetUserId, currentUserId) });
      const prevCount = queryClient.getQueryData(likeKeys.count(targetUserId));
      const prevIsLiked = queryClient.getQueryData(likeKeys.isLiked(targetUserId, currentUserId));
      queryClient.setQueryData(likeKeys.count(targetUserId), (c) => (isLiked ? Math.max(0, (c ?? 0) - 1) : (c ?? 0) + 1));
      queryClient.setQueryData(likeKeys.isLiked(targetUserId, currentUserId), !isLiked);
      return { prevCount, prevIsLiked };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(likeKeys.count(targetUserId), ctx.prevCount);
      queryClient.setQueryData(likeKeys.isLiked(targetUserId, currentUserId), ctx.prevIsLiked);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: likeKeys.count(targetUserId) });
      queryClient.invalidateQueries({ queryKey: likeKeys.isLiked(targetUserId, currentUserId) });
    },
  });

  // Real-time count updates when anyone likes/unlikes this profile
  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`profile-likes-${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_likes', filter: `liked_user_id=eq.${targetUserId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: likeKeys.count(targetUserId) });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [targetUserId, queryClient]);

  return {
    likeCount,
    isLiked,
    toggleLike,
    isPending,
    canLike: !!currentUserId && currentUserId !== targetUserId,
  };
}
