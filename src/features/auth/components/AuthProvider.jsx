/**
 * @fileoverview AuthProvider - Root authentication context provider.
 *
 * Wraps the application with auth state, session management,
 * and auto-profile creation via `useAuthProvider`.
 */

import React from 'react';
import { AuthContext, useAuthProvider } from '@/features/auth/hooks/use-auth.js';

/**
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const value = useAuthProvider();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
