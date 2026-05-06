import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';

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
    console.log('[SupabaseAuth] Initializing...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[SupabaseAuth] Initial session:', session?.user?.id || 'none');
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
        console.log('[SupabaseAuth] Auth event:', event, session?.user?.id || 'none');
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
      console.log('[SupabaseAuth] Loading profile for user:', userId);

      // First check if user exists in users table
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // If user doesn't exist, create them
      if (userError && userError.code === 'PGRST116') {
        console.log('[SupabaseAuth] Creating new user record');
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

        if (createError) {
          console.error('[SupabaseAuth] Error creating user:', createError);
        } else {
          userData = newUser;
        }
      }

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[SupabaseAuth] Error loading profile:', profileError);
      }

      setProfile(profileData || null);
      setIsLoading(false);
    } catch (error) {
      console.error('[SupabaseAuth] Error in loadUserProfile:', error);
      setIsLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
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
    console.log('[SupabaseAuth] Signing out');
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
