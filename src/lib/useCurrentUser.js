import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) return null;
      return await base44.auth.me();
    },
    staleTime: 60000,
  });
}

export function useMyProfile() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ['myProfile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles?.[0] || null;
    },
  });
}