/**
 * @fileoverview Main auth hook for Ride Radar 2.0.
 *
 * Provides `useSupabaseAuth()` which returns the current user, profile,
 * loading state, and auth actions. Uses React Context + Provider pattern.
 *
 * On mount: restores session, validates it, then loads the user's profile
 * from `public.users` and `public.user_profiles`. Auto-creates missing rows.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { queryClient } from '@/lib/query-client.js';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signOut as apiSignOut,
  getSession,
  onAuthStateChange,
  updatePassword as apiUpdatePassword,
} from '@/features/auth/api/auth-api.js';

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------

/** @type {React.Context<ReturnType<typeof useAuthProvider>|null>} */
const AuthContext = createContext(null);

// ------------------------------------------------------------------
// Provider hook
// ------------------------------------------------------------------

/**
 * Hook that encapsulates all auth state and side-effects.
 * Intended to be called once inside `<AuthProvider>`.
 * @returns {{
 *   user: object|null,
 *   profile: object|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   signIn: (email: string, password: string) => Promise<object>,
 *   signUp: (email: string, password: string) => Promise<object>,
 *   signInWithProvider: (provider: string) => Promise<object>,
 *   signOut: () => Promise<void>,
 *   updatePassword: (newPassword: string) => Promise<object>,
 *   refreshProfile: () => Promise<void>,
 * }}
 */
export function useAuthProvider() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileLoadSeq = useRef(0);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canCommit = useCallback(
    (seq, expectedUserId) => {
      return (
        isMountedRef.current &&
        profileLoadSeq.current === seq &&
        (!expectedUserId || user?.id === expectedUserId)
      );
    },
    [user?.id]
  );

  // Race-safe timeout wrapper
  const withTimeout = useCallback((promise, label, timeoutMs = 8000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)),
          timeoutMs
        );
      }),
    ]);
  }, []);

  // Load or create the user row in public.users
  const ensureUserRow = useCallback(
    async (userId, authUser) => {
      const { data: userData, error: userError } = await withTimeout(
        supabase.from('users').select('*').eq('id', userId).single(),
        'Users query'
      );

      if (userData) return userData;

      if (userError && userError.code === 'PGRST116') {
        logger.debug('[AuthProvider] Creating new user record');
        const { data: newUser, error: createError } = await withTimeout(
          supabase
            .from('users')
            .insert({
              id: userId,
              email: authUser?.email,
              full_name: authUser?.user_metadata?.full_name,
            })
            .select()
            .single(),
          'Create user record'
        );

        if (createError && createError.code !== '23505') {
          logger.error('[AuthProvider] Error creating user:', createError);
          return null;
        }
        return newUser;
      }

      if (userError) {
        logger.error('[AuthProvider] Unexpected users query error:', userError);
      }
      return null;
    },
    [withTimeout]
  );

  // Load or create the profile row in public.user_profiles
  const ensureProfileRow = useCallback(
    async (userId, authUser, seq) => {
      let { data: profileData, error: profileError } = await withTimeout(
        supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
        'User profile query'
      );

      if (profileData) return profileData;

      if (profileError && profileError.code === 'PGRST116') {
        logger.debug('[AuthProvider] Creating new user_profiles record');
        const { data: newProfile, error: profileCreateError } = await withTimeout(
          supabase
            .from('user_profiles')
            .insert({
              user_id: userId,
              display_name:
                authUser?.user_metadata?.full_name ||
                authUser?.email?.split('@')[0] ||
                'Rider',
              is_public: true,
            })
            .select()
            .single(),
          'Create user profile'
        );

        if (profileCreateError?.code === '23505') {
          const { data: refetchProfile } = await withTimeout(
            supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
            'Refetch user profile after conflict'
          );
          return refetchProfile || null;
        }

        if (profileCreateError) {
          logger.error('[AuthProvider] Error creating profile:', profileCreateError);
          return null;
        }

        return newProfile;
      }

      if (profileError) {
        logger.error('[AuthProvider] Error loading profile:', profileError);
      }
      return null;
    },
    [withTimeout]
  );

  // Main profile loader
  const loadUserProfile = useCallback(
    async (userId, session, seq) => {
      try {
        logger.debug('[AuthProvider] Loading profile...');

        if (!session?.user) {
          if (canCommit(seq)) setIsLoading(false);
          return;
        }

        await ensureUserRow(userId, session.user);
        const profileData = await ensureProfileRow(userId, session.user, seq);

        if (!canCommit(seq, userId)) return;
        setProfile(profileData || null);
        setIsLoading(false);
        logger.debug('[AuthProvider] Profile loaded.');
      } catch (error) {
        logger.error('[AuthProvider] Error in loadUserProfile:', error);
        if (canCommit(seq)) setIsLoading(false);
      }
    },
    [canCommit, ensureUserRow, ensureProfileRow]
  );

  // Handle a session object (called on mount and on auth state change)
  const handleSession = useCallback(
    (session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        const seq = profileLoadSeq.current + 1;
        profileLoadSeq.current = seq;
        setProfile(null);
        setIsLoading(true);
        // Defer to avoid blocking the auth callback
        window.setTimeout(() => {
          if (isMountedRef.current) {
            void loadUserProfile(authUser.id, session, seq);
          }
        }, 0);
      } else {
        profileLoadSeq.current += 1;
        setProfile(null);
        setIsLoading(false);
      }
    },
    [loadUserProfile]
  );

  // Validate cached session on mount
  const validateAndHandleSession = useCallback(
    async (session) => {
      if (!session) {
        handleSession(null);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        logger.warn('[AuthProvider] Cached session invalid; clearing state', error);
        await supabase.auth.signOut({ scope: 'local' });
        profileLoadSeq.current += 1;
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      handleSession({ ...session, user: data.user });
    },
    [handleSession]
  );

  // Mount effect: get initial session
  useEffect(() => {
    let isMounted = true;

    getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        void validateAndHandleSession(session);
      })
      .catch((error) => {
        logger.error('[AuthProvider] Error getting initial session:', error);
        if (isMounted) {
          profileLoadSeq.current += 1;
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      });

    const subscription = onAuthStateChange((_event, session) => {
      logger.debug('[AuthProvider] Auth event:', _event);
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession, validateAndHandleSession]);

  const isAuthenticated = !!user;

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const signIn = useCallback(
    async (email, password) => {
      const { data, error } = await signInWithEmail(email, password);
      if (error) throw error;
      return data;
    },
    []
  );

  const signUp = useCallback(
    async (email, password) => {
      const { data, error } = await signUpWithEmail(email, password);
      if (error) throw error;
      return data;
    },
    []
  );

  const signInWithProvider = useCallback(
    async (provider) => {
      const { data, error } = await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const signOutUser = useCallback(async () => {
    logger.debug('[AuthProvider] Signing out');
    const { error } = await apiSignOut();
    if (error) throw error;
    // Clear cached queries that depend on auth
    queryClient.removeQueries({ queryKey: ['admin-role'] });
  }, []);

  const updateUserPassword = useCallback(async (newPassword) => {
    const { data, error } = await apiUpdatePassword(newPassword);
    if (error) throw error;
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const { data: { session } } = await supabase.auth.getSession();
      const seq = profileLoadSeq.current + 1;
      profileLoadSeq.current = seq;
      await loadUserProfile(user.id, session, seq);
    }
  }, [user?.id, loadUserProfile]);

  return {
    user,
    profile,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signInWithProvider,
    signOut: signOutUser,
    updatePassword: updateUserPassword,
    refreshProfile,
  };
}

// ------------------------------------------------------------------
// Consumer hook
// ------------------------------------------------------------------

/**
 * Consume the auth context.
 * @returns {ReturnType<typeof useAuthProvider>}
 */
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within AuthProvider');
  }
  return context;
}

// Export the context so AuthProvider.jsx can use it
export { AuthContext };
