import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useCurrentUser() {
  const { user, isLoadingAuth } = useAuth();
  return { 
    data: user, 
    isLoading: isLoadingAuth,
    isPending: isLoadingAuth
  };
}

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['myProfile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const res = await base44.functions.invoke('getMyProfile', {});
      return res.data?.profile || null;
    },
  });
}