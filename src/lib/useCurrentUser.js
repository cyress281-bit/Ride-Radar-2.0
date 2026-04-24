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
    queryKey: ['myProfile', user?.email],
    enabled: !!user,
    queryFn: async () => {
      // Use email as the stable identity field across logins
      let profiles = await base44.entities.UserProfile.filter({ email: user.email });
      
      // Fallback for older profiles that only had userId
      if (!profiles || profiles.length === 0) {
        profiles = await base44.entities.UserProfile.filter({ userId: user.id });
      }
      return profiles?.[0] || null;
    },
  });
}