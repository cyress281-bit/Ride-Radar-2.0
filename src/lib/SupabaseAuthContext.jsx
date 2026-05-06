import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';
import { logger } from './logger';
import { prefetchHomeData } from './query-client';

const SupabaseAuthContext = createContext();

/**
 * Supabase Auth Provider
 *
 * Replaces Base44 auth with Supabase auth.
 * Key improvements:
 * - Session persists across browser restarts (localStorage)
 * - Automatic token refresh
 * - Simpler API
 */
export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    logger.debug('[SupabaseAuth] Initializing...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.debug('[SupabaseAuth] Initial session:', session?.user?.id ? 'found' : 'none');
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);

      // Load user profile if authenticated
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('[SupabaseAuth] Auth event:', event);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Load user profile from database
   */
  const loadUserProfile = async (userId) => {
    try {
      logger.debug('[SupabaseAuth] Loading profile...');

      // Get current session to ensure we have auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session) {
        logger.error('[SupabaseAuth] No session available');
        setIsLoading(false);
        return;
      }

      // First check if user exists in users table
      const usersQuery = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      let userData, userError;
      try {
        const result = await Promise.race([
          usersQuery,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout after 5s')), 5000))
        ]);
        userData = result.data;
        userError = result.error;
      } catch (err) {
        logger.error('[SupabaseAuth] Query failed or timed out:', err);
        userError = err;
      }

      // If user doesn't exist, create them
      if (userError && userError.code === 'PGRST116') {
        logger.debug('[SupabaseAuth] Creating new user record');
        const { data: authUser } = await supabase.auth.getUser();

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser?.user?.email,
            full_name: authUser?.user?.user_metadata?.full_name,
          })
          .select()
          .single();

        if (createError && createError.code !== '23505') {
          // Ignore unique constraint violations (race condition)
          logger.error('[SupabaseAuth] Error creating user:', createError);
        } else {
          userData = newUser;
        }
      } else if (userError) {
        logger.error('[SupabaseAuth] Unexpected users query error:', userError);
      }

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // CRITICAL FIX: Create user_profiles row if it doesn't exist
      if (profileError && profileError.code === 'PGRST116') {
        logger.debug('[SupabaseAuth] Creating new user_profiles record');
        const { data: authUser } = await supabase.auth.getUser();

        const { data: newProfile, error: profileCreateError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            display_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.email?.split('@')[0] || 'Rider',
            is_public: true,
          })
          .select()
          .single();

        if (profileCreateError && profileCreateError.code !== '23505') {
          // Ignore unique constraint violations (race condition)
          logger.error('[SupabaseAuth] Error creating profile:', profileCreateError);
        } else if (newProfile) {
          setProfile(newProfile);
          setIsLoading(false);
          return;
        }
      } else if (profileError) {
        logger.error('[SupabaseAuth] Error loading profile:', profileError);
      }

      setProfile(profileData || null);
      setIsLoading(false);
    } catch (error) {
      logger.error('[SupabaseAuth] Error in loadUserProfile:', error);
      setIsLoading(false);
    }
  };

  /**
   * Sign in with email and password
   * On success, prefetches Home page data (conversations, notifications)
   * so the first page load is instant.
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Prefetch key data in background while auth state propagates
    if (data?.user?.id) {
      prefetchHomeData(data.user.id);
    }

    return data;
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    logger.debug('[SupabaseAuth] Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Update user password
   */
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  };

  /**
   * Refresh user profile (after profile updates)
   */
  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
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
