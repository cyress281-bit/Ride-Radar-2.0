import React, { lazy, Suspense, memo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import PageLoader from './components/shared/PageLoader';
import { useAuthState } from './features/auth/hooks/use-auth';
import { useAdminRole } from './features/auth/hooks/use-admin-role';
import { getSafeAuthRedirectFromSearch } from './lib/auth-redirect';
import { isValidUuid } from './lib/utils';

// ------------------------------------------------------------------
// Eagerly loaded (shell components needed immediately)
// ------------------------------------------------------------------
// AppLayout is eagerly loaded; all pages are lazy loaded below.

// ------------------------------------------------------------------
// Public pages
// ------------------------------------------------------------------
const LandingPage = lazy(() => import('./features/auth/pages/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const AccountDeletionPage = lazy(() => import('./features/settings/pages/AccountDeletionPage'));
const PrivacyPolicyPage = lazy(() => import('./features/settings/pages/PrivacyPolicyPage'));
const SupportPage = lazy(() => import('./features/settings/pages/SupportPage'));

// ------------------------------------------------------------------
// Core authenticated pages
// ------------------------------------------------------------------
const BroadcastFeedPage = lazy(() => import('./features/broadcast/pages/BroadcastFeedPage'));
const BroadcastCreatePage = lazy(() => import('./features/broadcast/pages/BroadcastCreatePage'));
const BroadcastDetailPage = lazy(() => import('./features/broadcast/pages/BroadcastDetailPage'));
const ConversationsPage = lazy(() => import('./features/chat/pages/ConversationsPage'));
const ConversationPage = lazy(() => import('./features/chat/pages/ConversationPage'));
const NotificationsPage = lazy(() => import('./features/notifications/pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage'));
const ProfilePage = lazy(() => import('./features/profile/pages/ProfilePage'));
const RiderProfilePage = lazy(() => import('./features/profile/pages/RiderProfilePage'));
const OnboardingPage = lazy(() => import('./features/auth/pages/OnboardingPage'));
const ReviewReadinessPage = lazy(() => import('./features/safety/pages/ReviewReadinessPage'));

// ------------------------------------------------------------------
// Admin pages
// ------------------------------------------------------------------
const AdminDashboardPage = lazy(() => import('./features/admin/pages/AdminDashboardPage'));
const AdminReportsPage = lazy(() => import('./features/admin/pages/AdminReportsPage'));
const AdminBroadcastsPage = lazy(() => import('./features/admin/pages/AdminBroadcastsPage'));
const AdminUsersPage = lazy(() => import('./features/admin/pages/AdminUsersPage'));
const AdminBlocksPage = lazy(() => import('./features/admin/pages/AdminBlocksPage'));
const AdminNotificationsPage = lazy(() => import('./features/admin/pages/AdminNotificationsPage'));
const AdminDeletionRequestsPage = lazy(() => import('./features/admin/pages/AdminDeletionRequestsPage'));
const AdminAnalyticsPage = lazy(() => import('./features/admin/pages/AdminAnalyticsPage'));
const AdminCompliancePage = lazy(() => import('./features/admin/pages/AdminCompliancePage'));
const AdminMonitoringPage = lazy(() => import('./features/admin/pages/AdminMonitoringPage'));
const AdminHealthPage = lazy(() => import('./features/admin/pages/AdminHealthPage'));

// ------------------------------------------------------------------
// Route guards
// ------------------------------------------------------------------

/**
 * ProtectedRoute - Ensures only authenticated users can access wrapped routes.
 * Redirects to /login with a ?redirect= parameter preserving the original location.
 *
 * @param {{ children: React.ReactNode }} props
 */
const ProtectedRoute = memo(function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthState();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.22)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(
      `${location.pathname}${location.search}${location.hash}`
    );
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
});

/**
 * AdminRoute - Ensures only admin users can access wrapped routes.
 * Redirects non-admins to /home.
 */
const AdminRoute = memo(function AdminRoute() {
  const { isAdmin, isLoading } = useAdminRole();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.22)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
});

/**
 * OnboardingGuard - Redirects authenticated users without a completed profile
 * to /onboarding, except for exempt paths.
 *
 * @param {{ children: React.ReactNode }} props
 */
const OnboardingGuard = memo(function OnboardingGuard({ children }) {
  const { isAuthenticated, profile, isLoading } = useAuthState();
  const location = useLocation();

  const onboardingExemptPaths = new Set([
    '/landing',
    '/login',
    '/account-deletion',
    '/privacy-policy',
    '/support',
    '/profile',
    '/onboarding',
  ]);

  const isExempt =
    onboardingExemptPaths.has(location.pathname) ||
    location.pathname.startsWith('/profile/');

  // Don't redirect while profile is still loading; otherwise a cross-tab
  // sign-in or profile refresh that temporarily clears profile would loop.
  if (isLoading) {
    return children;
  }

  if (isAuthenticated && !profile && !isExempt) {
    return (
      <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
    );
  }

  return children;
});

// ------------------------------------------------------------------
// Scroll restoration
// ------------------------------------------------------------------

const ScrollToTop = memo(function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
});

// ------------------------------------------------------------------
// Route param validation
// ------------------------------------------------------------------

function ValidateUUIDParam({ param, children }) {
  const params = useParams();
  const value = params[param];
  if (value && !isValidUuid(value)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

// ------------------------------------------------------------------
// 404 fallback
// ------------------------------------------------------------------

const NotFoundPage = memo(function NotFoundPage() {
  return <Navigate to="/home" replace />;
});

// ------------------------------------------------------------------
// Error boundary wrapper that resets on navigation
// ------------------------------------------------------------------

const ErrorBoundaryWithReset = memo(function ErrorBoundaryWithReset({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname + location.search}>
      {children}
    </ErrorBoundary>
  );
});

/**
 * LoginRoute - Handles auth redirect for /login so AppContent
 * doesn't need to subscribe to auth state.
 */
const LoginRoute = memo(function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuthState();
  const location = useLocation();

  if (!isLoading && isAuthenticated) {
    return <Navigate to={getSafeAuthRedirectFromSearch(location.search)} replace />;
  }
  return <LoginPage />;
});

// ------------------------------------------------------------------
// Granular suspense wrappers for heavy route groups
// ------------------------------------------------------------------

const AdminPageLoader = memo(function AdminPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
});

const AdminLayout = memo(function AdminLayout() {
  return (
    <Suspense fallback={<AdminPageLoader />}>
      <Outlet />
    </Suspense>
  );
});

// ------------------------------------------------------------------
// App content
// ------------------------------------------------------------------

/**
 * AppContent - Router content wrapped in guards and suspense.
 *
 * Public routes are unguarded. Protected routes require authentication
 * and are wrapped in AppLayout. Admin routes add an additional role check.
 */
const AppContent = memo(function AppContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/account-deletion" element={<AccountDeletionPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Onboarding (protected) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected routes with AppLayout wrapper */}
        <Route
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <AppLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<BroadcastFeedPage />} />
          <Route path="/broadcast" element={<BroadcastCreatePage />} />
          <Route path="/broadcast/:id" element={<ValidateUUIDParam param="id"><BroadcastDetailPage /></ValidateUUIDParam>} />
          <Route path="/messages" element={<ConversationsPage />} />
          <Route path="/messages/:id" element={<ValidateUUIDParam param="id"><ConversationPage /></ValidateUUIDParam>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ValidateUUIDParam param="userId"><RiderProfilePage /></ValidateUUIDParam>} />
          <Route path="/review-readiness" element={<ReviewReadinessPage />} />
          <Route path="/live-map" element={<Navigate to="/home" replace />} />

          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/broadcasts" element={<AdminBroadcastsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/blocks" element={<AdminBlocksPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/deletions" element={<AdminDeletionRequestsPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/compliance" element={<AdminCompliancePage />} />
              <Route path="/admin/monitoring" element={<AdminMonitoringPage />} />
              <Route path="/admin/health" element={<AdminHealthPage />} />
            </Route>
          </Route>
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
});

// ------------------------------------------------------------------
// Root export
// ------------------------------------------------------------------

/**
 * App - Root application component.
 *
 * Wraps everything in an error boundary, browser router, and
 * the full provider stack.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundaryWithReset>
        <AppProviders>
          <AppContent />
        </AppProviders>
      </ErrorBoundaryWithReset>
    </BrowserRouter>
  );
}
