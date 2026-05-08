import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import PageLoadingSpinner from '@/components/PageLoadingSpinner';
import { OfflineBanner } from '@/components/OfflineBanner';
import SplashScreen from '@/components/SplashScreen';
import { AnimatePresence } from 'framer-motion';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useAdminRole } from '@/hooks/useAdminRole';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';
import { getSafeAuthRedirectFromSearch } from '@/lib/authRedirect';

// --- Eagerly loaded (needed immediately for auth flow) ---
import SupabaseLogin from '@/pages/SupabaseLogin';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';

// Public pages
const Landing = lazy(() => import('@/pages/Landing'));
const AccountDeletion = lazy(() => import('@/pages/AccountDeletion'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Support = lazy(() => import('@/pages/Support'));

// Core authenticated pages
const Broadcast = lazy(() => import('@/pages/Broadcast'));
const BroadcastDetail = lazy(() => import('@/pages/BroadcastDetail'));
const Messages = lazy(() => import('@/pages/Messages'));
const ConversationView = lazy(() => import('@/pages/ConversationView'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profile = lazy(() => import('@/pages/Profile'));
const RiderProfile = lazy(() => import('@/pages/RiderProfile'));

// Less frequently visited pages
const Settings = lazy(() => import('@/pages/Settings'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const ReviewReadiness = lazy(() => import('@/pages/ReviewReadiness'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'));
const AdminBroadcasts = lazy(() => import('@/pages/admin/AdminBroadcasts'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminBlocks = lazy(() => import('@/pages/admin/AdminBlocks'));
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminDeletionRequests = lazy(() => import('@/pages/admin/AdminDeletionRequests'));
const AdminAnalyticsAudit = lazy(() => import('@/pages/admin/AdminAnalyticsAudit'));
const AdminCompliance = lazy(() => import('@/pages/admin/AdminCompliance'));
const AdminMonitoring = lazy(() => import('@/pages/admin/AdminMonitoring'));

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.22)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}

function AdminRoute() {
  const { isAdmin, isLoading } = useAdminRole();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.22)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function isProfileComplete(profile) {
  return !!profile;
}

function SupabaseAppContent({ splashVisible = false }) {
  const { isAuthenticated, isLoading, user, profile } = useSupabaseAuth();
  const location = useLocation();

  usePageTracking();

  useEffect(() => {
    if (isAuthenticated && user && profile) {
      setSentryUser(user, profile);
    } else {
      clearSentryUser();
    }
  }, [isAuthenticated, user, profile]);

  if (splashVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border border-primary/50 shadow-[0_0_22px_hsl(var(--primary)/0.22)]" />
          <p className="text-sm text-muted-foreground">Loading Supabase auth...</p>
        </div>
      </div>
    );
  }

  const onboardingExemptPaths = new Set(['/landing', '/login', '/account-deletion', '/privacy-policy', '/support', '/profile']);

  if (isAuthenticated && !isProfileComplete(profile) && location.pathname !== '/onboarding' && !onboardingExemptPaths.has(location.pathname)) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <OfflineBanner />
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<Landing />} />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to={getSafeAuthRedirectFromSearch(location.search)} replace /> : <SupabaseLogin />}
            />
            <Route path="/account-deletion" element={<AccountDeletion />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/support" element={<Support />} />

            {/* Onboarding */}
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
              <Route path="/live-map" element={<Navigate to="/home" replace />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/broadcast/:id" element={<BroadcastDetail />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:id" element={<ConversationView />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<RiderProfile />} />
              <Route path="/review-readiness" element={<ReviewReadiness />} />

              {/* Admin routes */}
              <Route element={<AdminRoute />}>
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
            </Route>

            {/* Default redirects */}
            <Route
              path="/"
              element={<Navigate to="/home" replace />}
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
      <Toaster />
    </>
  );
}

function SupabaseAppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { isLoading } = useSupabaseAuth();

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      <SupabaseAppContent splashVisible={showSplash} />
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            isReady={!isLoading}
            onComplete={handleSplashComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function SupabaseApp() {
  return (
    <ErrorBoundary>
      <Router>
        <SupabaseAuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <SupabaseAppShell />
          </QueryClientProvider>
        </SupabaseAuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
