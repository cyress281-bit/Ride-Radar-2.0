/**
 * TanStack Query hooks for profile server state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth';
import {
  getProfileByUserId,
  updateProfile,
  checkUsernameAvailability,
} from '@/features/profile/api/profile-api';

const PROFILE_KEY = 'profile';
const USERNAME_KEY = 'username-availability';

/**
 * Query hook for a single profile by userId.
 * @param {string|null} userId
 * @param {object} [options]
 */
export function useProfile(userId, options = {}) {
  return useQuery({
    queryKey: [PROFILE_KEY, userId],
    queryFn: async () => {
      const { data, error } = await getProfileByUserId(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Query hook for the currently authenticated user's profile.
 */
export function useMyProfile(options = {}) {
  const { user } = useSupabaseAuth();
  return useProfile(user?.id, {
    ...options,
    enabled: !!user?.id && options.enabled !== false,
  });
}

/**
 * Mutation hook to update a profile.
 * Invalidates the profile cache on success.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }) => {
      const { data, error } = await updateProfile(userId, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [PROFILE_KEY, variables.userId] });
    },
  });
}

/**
 * Query hook for username availability (debounced by the caller).
 * @param {string} username
 * @param {object} [options]
 */
export function useUsernameAvailability(username, options = {}) {
  const trimmed = String(username || '').trim();
  return useQuery({
    queryKey: [USERNAME_KEY, trimmed],
    queryFn: async () => {
      const { data, error } = await checkUsernameAvailability(trimmed);
      if (error) throw error;
      return data;
    },
    enabled: trimmed.length >= 3 && options.enabled !== false,
    staleTime: 30 * 1000,
    ...options,
  });
}
