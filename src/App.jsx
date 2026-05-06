import React, { lazy, Suspense, useEffect } from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import PageLoadingSpinner from '@/components/PageLoadingSpinner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { usePageTracking } from '@/hooks/usePageTracking';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';
import { setAnalyticsOptIn } from '@/lib/analytics';

// --- Eagerly loaded (needed immediately for auth flow) ---
import SupabaseLogin from '@/pages/SupabaseLogin';
import Layout from '@/components/Layout';

// --- Lazy-loaded page routes (code-split into separate chunks) ---
// Each lazy() call creates a separate chunk that is only fetched when the route is visited.

// Public pages
const Landing = lazy(() => import('@/pages/Landing'));
const AccountDeletion = lazy(() => import('@/pages/AccountDeletion'));

// Core authenticated pages (most frequently visited)
const Home = lazy(() => import(/* webpackChunkName: "home" */ '@/pages/Home'));
const Broadcast = lazy(() => import(/* webpackChunkName: "broadcast" */ '@/pages/Broadcast'));
const BroadcastDetail = lazy(() => import(/* webpackChunkName: "broadcast-detail" */ '@/pages/BroadcastDetail'));
const Messages = lazy(() => import(/* webpackChunkName: "messages" */ '@/pages/Messages'));
const ConversationView = lazy(() => import(/* webpackChunkName: "conversation" */ '@/pages/ConversationView'));
const Notifications = lazy(() => import(/* webpackChunkName: "notifications" */ '@/pages/Notifications'));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ '@/pages/Profile'));
const RiderProfile = lazy(() => import(/* webpackChunkName: "rider-profile" */ '@/pages/RiderProfile'));

// Less frequently visited pages
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ '@/pages/Settings'));
const Onboarding = lazy(() => import(/* webpackChunkName: "onboarding" */ '@/pages/Onboarding'));
const ReviewReadiness = lazy(() => import(/* webpackChunkName: "review-readiness" */ '@/pages/ReviewReadiness'));

// Admin pages — grouped into a single chunk since they share dependencies
// and are only accessed by admin users (very small % of traffic)
const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminDashboard'));
const AdminReports = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminReports'));
const AdminBroadcasts = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminBroadcasts'));
const AdminUsers = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminUsers'));
const AdminBlocks = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminBlocks'));
const AdminNotifications = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminNotifications'));
const AdminDeletionRequests = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminDeletionRequests'));
const AdminAnalyticsAudit = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminAnalyticsAudit'));
const AdminCompliance = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminCompliance'));
const AdminMonitoring = lazy(() => import(/* webpackChunkName: "admin" */ '@/pages/admin/AdminMonitoring'));

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
  const { isAuthenticated, isLoading, user, profile } = useSupabaseAuth();

  // Track page views on route changes
  usePageTracking();

  // Set Sentry user context when authenticated
  useEffect(() => {
    if (isAuthenticated && user && profile) {
      setSentryUser(user, profile);
    } else {
      clearSentryUser();
    }
  }, [isAuthenticated, user, profile]);

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
      <OfflineBanner />
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<Landing />} />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/home" replace /> : <SupabaseLogin />}
            />
            <Route path="/account-deletion" element={<AccountDeletion />} />

            {/* Onboarding (semi-protected) */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected routes with Layout wrapper */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/broadcast/:id" element={<BroadcastDetail />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<ConversationView />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<RiderProfile />} />
              <Route path="/review-readiness" element={<ReviewReadiness />} />

              {/* Admin routes - role check is inside each page */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/blocks" element={<AdminBlocks />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/deletions" element={<AdminDeletionRequests />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsAudit />} />
              <Route path="/admin/compliance" element={<AdminCompliance />} />
              <Route path="/admin/monitoring" element={<AdminMonitoring />} />
            </Route>

            {/* Default redirects */}
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
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
