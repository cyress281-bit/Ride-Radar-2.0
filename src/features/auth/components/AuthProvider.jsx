/**
 * @fileoverview AuthProvider - Root authentication context provider.
 *
 * Wraps the application with split auth contexts to minimize re-renders:
 * - AuthStateContext: user, profile, isAuthenticated, isLoading
 * - AuthActionsContext: signIn, signUp, signInWithProvider, signOut, updatePassword, refreshProfile
 */

import React from 'react';
import { AuthStateContext, AuthActionsContext, useAuthProvider } from '@/features/auth/hooks/use-auth.js';

/**
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const { state, actions } = useAuthProvider();
  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}
