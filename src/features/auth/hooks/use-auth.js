/**
 * @fileoverview Main auth hook for Ride Radar 2.0.
 *
 * Provides split contexts to minimize re-renders:
 * - useAuthState()   → { user, profile, isAuthenticated, isLoading }
 * - useAuthActions() → { signIn, signUp, signInWithProvider, signOut, updatePassword, refreshProfile }
 * - useSupabaseAuth() → combines both (legacy compatibility)
 *
 * On mount: restores session, validates it, then loads the user's profile
 * from public.users and public.user_profiles. Auto-creates missing rows.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { captureError } from '@/lib/sentry.js';
import { clearLocalLocationCaches } from '@/lib/locationCache.js';
import { useQueryClient } from '@tanstack/react-query';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  signOut as apiSignOut,
  getSession,
  onAuthStateChange,
  updatePassword as apiUpdatePassword,
  resetPassword as apiResetPassword,
  updateEmail as apiUpdateEmail,
} from '@/features/auth/api/auth-api.js';

// ------------------------------------------------------------------
// Contexts
// ------------------------------------------------------------------

/** @type {React.Context<{user:object|null,profile:object|null,isAuthenticated:boolean,isLoading:boolean}|null>} */
const AuthStateContext = createContext(null);

/** @type {React.Context<{signIn:Function,signUp:Function,signInWithProvider:Function,signOut:Function,updatePassword:Function,refreshProfile:Function}>} */
const AuthActionsContext = createContext(null);

// ------------------------------------------------------------------
// Provider hook
// ------------------------------------------------------------------

/**
 * Hook that encapsulates all auth state and side-effects.
 * Intended to be called once inside `<AuthProvider>`.
 * @returns {{ state: object, actions: object }}
 */
export function useAuthProvider() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // KNOWN ISSUE: authEvent is in the state context and triggers re-renders on every
  // token refresh. Do NOT remove it from the context as it may break the password
  // recovery flow. Components that don't need authEvent should use useAuthActions().
  const [authEvent, setAuthEvent] = useState(null);
  const profileLoadSeq = useRef(0);
  const profileTimeoutRef = useRef(null);

  const isMountedRef = useRef(true);
  const userRef = useRef(user);
  userRef.current = user;

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
        (!expectedUserId || userRef.current?.id === expectedUserId)
      );
    },
    []
  );

  // Race-safe timeout wrapper
  const withTimeout = useCallback((promise, label, timeoutMs = 8000) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = window.setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)),
        timeoutMs
      );
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) window.clearTimeout(timer);
    });
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

        if (createError?.code === '23505') {
          const { data: refetchUser } = await withTimeout(
            supabase.from('users').select('*').eq('id', userId).single(),
            'Refetch user record after conflict'
          );
          return refetchUser || null;
        }

        if (createError) {
          logger.error('[AuthProvider] Error creating user:', createError);
          captureError(createError, { context: 'ensureUserRow', userId });
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
    async (userId, authUser, _seq) => {
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
          captureError(profileCreateError, { context: 'ensureProfileRow', userId });
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
        // Clear any previous deferred load to avoid stale runs
        if (profileTimeoutRef.current) {
          clearTimeout(profileTimeoutRef.current);
        }
        // Defer to avoid blocking the auth callback
        profileTimeoutRef.current = window.setTimeout(() => {
          profileTimeoutRef.current = null;
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

      try {
        const { data, error } = await Promise.race([
          supabase.auth.getUser(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Session validation timed out')), 10000)),
        ]);
        if (error || !data?.user) {
          logger.warn('[AuthProvider] Cached session invalid; clearing state', error);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          handleSession(null);
          return;
        }

        handleSession({ ...session, user: data.user });
      } catch (err) {
        logger.error('[AuthProvider] Error validating session:', err);
        captureError(err, { context: 'validateCachedSession' });
        handleSession(null);
      }
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
      setAuthEvent(_event);

      if (_event === 'TOKEN_REFRESHED') {
        // Only update the user object; don't trigger a full profile reload
        setUser(session?.user ?? null);
        return;
      }

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
    async (email, password, options = {}) => {
      const { data, error } = await signInWithEmail(email, password, options);
      if (error) throw error;
      return data;
    },
    []
  );

  const signUp = useCallback(
    async (email, password, options = {}) => {
      const { data, error } = await signUpWithEmail(email, password, options);
      if (error) throw error;
      return data;
    },
    []
  );

  const signInWithProvider = useCallback(
    async (provider, options = {}) => {
      const { data, error } = await signInWithOAuth(provider, {
        redirectTo: options.redirectTo || `${window.location.origin}/login`,
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const signOutUser = useCallback(async () => {
    logger.debug('[AuthProvider] Signing out');
    const { error } = await apiSignOut();
    // Optimistically clear local state so UI updates immediately even if the
    // network request fails or onAuthStateChange fires late.
    profileLoadSeq.current += 1;
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    setAuthEvent(null);
    // Purge all cached queries to prevent stale auth-dependent data from leaking
    queryClient.clear();
    clearLocalLocationCaches();
    if (error) throw error;
  }, [queryClient]);

  const updateUserPassword = useCallback(async (newPassword) => {
    const { data, error } = await apiUpdatePassword(newPassword);
    if (error) throw error;
    return data;
  }, []);

  const resetUserPassword = useCallback(async (email) => {
    const { data, error } = await apiResetPassword(email);
    if (error) throw error;
    return data;
  }, []);

  const updateUserEmail = useCallback(async (email) => {
    const { data, error } = await apiUpdateEmail(email);
    if (error) throw error;
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    let session;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch (err) {
      logger.error('[AuthProvider] getSession failed in refreshProfile:', err);
      return;
    }
    const seq = profileLoadSeq.current + 1;
    profileLoadSeq.current = seq;
    await loadUserProfile(user.id, session, seq);
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  }, [user?.id, loadUserProfile]);

  // ------------------------------------------------------------------
  // Memoized value objects for contexts
  // ------------------------------------------------------------------

  const state = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated,
      isLoading,
      authEvent,
    }),
    [user, profile, isAuthenticated, isLoading, authEvent]
  );

  const actions = useMemo(
    () => ({
      signIn,
      signUp,
      signInWithProvider,
      signOut: signOutUser,
      updatePassword: updateUserPassword,
      resetPassword: resetUserPassword,
      updateEmail: updateUserEmail,
      refreshProfile,
    }),
    [signIn, signUp, signInWithProvider, signOutUser, updateUserPassword, resetUserPassword, updateUserEmail, refreshProfile]
  );

  return { state, actions };
}

// ------------------------------------------------------------------
// Consumer hooks
// ------------------------------------------------------------------

/**
 * Consume the auth state context (lightweight; does not trigger on action changes).
 * @returns {{ user: object|null, profile: object|null, isAuthenticated: boolean, isLoading: boolean }}
 */
export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthProvider');
  }
  return context;
}

/**
 * Consume the auth actions context (stable; does not trigger on state changes).
 * @returns {{ signIn: Function, signUp: Function, signInWithProvider: Function, signOut: Function, updatePassword: Function, resetPassword: Function, updateEmail: Function, refreshProfile: Function }}
 */
export function useAuthActions() {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within AuthProvider');
  }
  return context;
}

/**
 * Consume the full auth context (state + actions).
 * Prefer useAuthState or useAuthActions to avoid unnecessary re-renders.
 * @returns {ReturnType<typeof useAuthState> & ReturnType<typeof useAuthActions>}
 */
export function useSupabaseAuth() {
  const state = useAuthState();
  const actions = useAuthActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

// Export contexts so AuthProvider.jsx can use them
export { AuthStateContext, AuthActionsContext };
