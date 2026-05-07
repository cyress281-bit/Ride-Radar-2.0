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
import { setAnalyticsOptIn } from '@/lib/analytics';

// --- Eagerly loaded (needed immediately for auth flow) ---
import SupabaseLogin from '@/pages/SupabaseLogin';
import Layout from '@/components/Layout';

// Public pages
const Landing = lazy(() => import('@/pages/Landing'));
const AccountDeletion = lazy(() => import('@/pages/AccountDeletion'));

// Core authenticated pages
const Home = lazy(() => import('@/pages/Home'));
const LiveMap = lazy(() => import('@/pages/LiveMap'));
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

function AdminRoute() {
  const { isAdmin, isLoading } = useAdminRole();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function isProfileComplete(profile) {
  if (!profile) return false;
  const hasDisplayName = !!String(profile.display_name || '').trim();
  const hasBio = !!String(profile.bio || '').trim();
  const hasAvatar = !!profile.avatar_url;
  const hasBike = !!String([profile.bike_year, profile.bike_make, profile.bike_model].filter(Boolean).join(' ')).trim();
  return hasDisplayName && hasBio && hasAvatar && hasBike;
}

function SupabaseAppContent() {
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

  if (isAuthenticated && !isProfileComplete(profile) && location.pathname !== '/onboarding') {
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
              element={isAuthenticated ? <Navigate to="/home" replace /> : <SupabaseLogin />}
            />
            <Route path="/account-deletion" element={<AccountDeletion />} />

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
              <Route path="/live-map" element={<LiveMap />} />
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
              element={
                isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>
      <Toaster />
    </>
  );
}

export default function SupabaseApp() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <SupabaseAuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <SupabaseAppContent />
            <AnimatePresence>
              {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            </AnimatePresence>
          </QueryClientProvider>
        </SupabaseAuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
