import React from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SupabaseLogin from '@/pages/SupabaseLogin';

// Import your existing pages
import Home from '@/pages/Home';
import Messages from '@/pages/Messages';
import Profile from '@/pages/Profile';
import Broadcast from '@/pages/Broadcast';

/**
 * Protected route wrapper for Supabase auth
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Main app with Supabase routes
 */
function SupabaseAppContent() {
  const { isAuthenticated, isLoading, user } = useSupabaseAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-secondary border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Supabase auth...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <SupabaseLogin />}
        />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/broadcast"
          element={
            <ProtectedRoute>
              <Broadcast />
            </ProtectedRoute>
          }
        />

        {/* Default redirects */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

/**
 * Supabase-powered app wrapper
 *
 * This is a test version of your app using Supabase instead of Base44.
 * Once we verify everything works, we'll replace the main App.jsx.
 */
export default function SupabaseApp() {
  return (
    <ErrorBoundary>
      <SupabaseAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <SupabaseAppContent />
        </QueryClientProvider>
      </SupabaseAuthProvider>
    </ErrorBoundary>
  );
}
