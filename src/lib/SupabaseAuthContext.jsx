import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { setRememberDevicePreference } from './supabase';
import { logger } from './logger';
import { prefetchHomeData } from './query-client';

const SupabaseAuthContext = createContext();

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const profileLoadSeq = useRef(0);

  useEffect(() => {
    let isMounted = true;

    logger.debug('[SupabaseAuth] Initializing...');

    const clearAuthState = () => {
      if (!isMounted) return;
      profileLoadSeq.current += 1;
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    const handleSession = (session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);

      if (session?.user) {
        const loadSeq = profileLoadSeq.current + 1;
        profileLoadSeq.current = loadSeq;
        setProfile(null);
        setIsLoading(true);
        // Supabase warns against awaiting Supabase calls inside auth callbacks.
        window.setTimeout(() => {
          if (isMounted) {
            void loadUserProfile(session.user.id, session, loadSeq);
          }
        }, 0);
      } else {
        profileLoadSeq.current += 1;
        setProfile(null);
        setIsLoading(false);
      }
    };

    const validateAndHandleSession = async (session) => {
      if (!session) {
        handleSession(null);
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        logger.warn('[SupabaseAuth] Cached session is invalid; clearing local auth state', error);
        await supabase.auth.signOut({ scope: 'local' });
        clearAuthState();
        return;
      }

      handleSession({ ...session, user: data.user });
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        logger.debug('[SupabaseAuth] Initial session:', session?.user?.id ? 'found' : 'none');
        void validateAndHandleSession(session);
      })
      .catch((error) => {
        logger.error('[SupabaseAuth] Error getting initial session:', error);
        clearAuthState();
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('[SupabaseAuth] Auth event:', event);
        handleSession(session);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const withTimeout = (promise, label, timeoutMs = 8000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
      }),
    ]);
  };

  const loadUserProfile = async (userId, session, loadSeq = profileLoadSeq.current) => {
    const canCommit = () => profileLoadSeq.current === loadSeq && session?.user?.id === userId;

    try {
      logger.debug('[SupabaseAuth] Loading profile...');
      logger.debug('[SupabaseAuth] Step 1: Checking session...');

      if (!session) {
        logger.error('[SupabaseAuth] No session available');
        if (canCommit()) setIsLoading(false);
        return;
      }

      logger.debug('[SupabaseAuth] Step 2: Querying users table...');

      let userData, userError;
      try {
        const result = await withTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single(),
          'Users query'
        );
        userData = result.data;
        userError = result.error;
      } catch (err) {
        logger.error('[SupabaseAuth] Query failed or timed out:', err);
        userError = err;
      }

      logger.debug('[SupabaseAuth] Step 2 done. userData:', userData ? 'found' : 'not found', 'userError:', userError?.message);

      if (userError && userError.code === 'PGRST116') {
        logger.debug('[SupabaseAuth] Creating new user record');
        const { data: authUser } = await withTimeout(supabase.auth.getUser(), 'Get auth user');

        const { data: newUser, error: createError } = await withTimeout(
          supabase
            .from('users')
            .insert({
              id: userId,
              email: authUser?.user?.email,
              full_name: authUser?.user?.user_metadata?.full_name,
            })
            .select()
            .single(),
          'Create user record'
        );

        if (createError && createError.code !== '23505') {
          logger.error('[SupabaseAuth] Error creating user:', createError);
        } else {
          userData = newUser;
        }
      } else if (userError) {
        logger.error('[SupabaseAuth] Unexpected users query error:', userError);
      }

      logger.debug('[SupabaseAuth] Step 3: Querying user_profiles table...');

      let { data: profileData, error: profileError } = await withTimeout(
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        'User profile query'
      );

      logger.debug('[SupabaseAuth] Step 3 done. profileData:', profileData ? 'found' : 'not found', 'profileError:', profileError?.message);

      if (profileError && profileError.code === 'PGRST116') {
        logger.debug('[SupabaseAuth] Creating new user_profiles record');
        const { data: authUser } = await withTimeout(supabase.auth.getUser(), 'Get auth user for profile');

        const { data: newProfile, error: profileCreateError } = await withTimeout(
          supabase
            .from('user_profiles')
            .insert({
              user_id: userId,
              display_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.email?.split('@')[0] || 'Rider',
              is_public: true,
            })
            .select()
            .single(),
          'Create user profile'
        );

        if (profileCreateError?.code === '23505') {
          const result = await withTimeout(
            supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', userId)
              .single(),
            'Refetch user profile after conflict'
          );

          profileData = result.data;
          profileError = result.error;
        } else if (profileCreateError) {
          logger.error('[SupabaseAuth] Error creating profile:', profileCreateError);
        } else if (newProfile) {
          if (!canCommit()) return;
          setProfile(newProfile);
          setIsLoading(false);
          return;
        }
      } else if (profileError) {
        logger.error('[SupabaseAuth] Error loading profile:', profileError);
      }

      logger.debug('[SupabaseAuth] Step 4: Setting profile and finishing...');
      if (!canCommit()) return;
      setProfile(profileData || null);
      setIsLoading(false);
      logger.debug('[SupabaseAuth] Done! isLoading set to false.');
    } catch (error) {
      logger.error('[SupabaseAuth] Error in loadUserProfile:', error);
      if (canCommit()) setIsLoading(false);
    }
  };

  const signIn = async (email, password, { rememberDevice = true } = {}) => {
    setRememberDevicePreference(rememberDevice);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.user?.id) prefetchHomeData(data.user.id);
    return data;
  };

  const signUp = async (email, password, metadata = {}, { rememberDevice = true } = {}) => {
    setRememberDevicePreference(rememberDevice);
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const signInWithProvider = async (provider, redirectTo = `${window.location.origin}/login`, { rememberDevice = true } = {}) => {
    setRememberDevicePreference(rememberDevice);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    logger.debug('[SupabaseAuth] Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const { data: { session } } = await supabase.auth.getSession();
      const loadSeq = profileLoadSeq.current + 1;
      profileLoadSeq.current = loadSeq;
      await loadUserProfile(user.id, session, loadSeq);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user, profile, isLoading, isAuthenticated,
        signIn, signUp, signInWithProvider, signOut, updatePassword, refreshProfile,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};
