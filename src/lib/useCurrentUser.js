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

      // 1. Primary lookup by stable identity (email)
      if (user.email) {
        const profiles = await base44.entities.UserProfile.filter({ email: user.email });
        const activeProfile = profiles.find((profile) => profile.isDeleted !== true);
        if (activeProfile) {
          return activeProfile;
        }
      }
      
      // 2. Fallback check for older profiles by legacy userId
      const legacyProfiles = await base44.entities.UserProfile.filter({ userId: user.id });
      if (legacyProfiles && legacyProfiles.length > 0) {
        const profile = legacyProfiles.find((item) => item.isDeleted !== true);
        if (!profile) return null;
        
        // SELF-HEALING: Backfill email if missing for future stable lookups
        if (user.email && !profile.email) {
          await base44.entities.UserProfile.update(profile.id, { email: user.email });
          profile.email = user.email;
        }
        return profile;
      }
      
      return null;
    },
  });
}