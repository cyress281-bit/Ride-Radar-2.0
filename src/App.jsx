import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Landing from '@/pages/Landing';
import Onboarding from '@/pages/Onboarding';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Broadcast from '@/pages/Broadcast';
import BroadcastDetail from '@/pages/BroadcastDetail';
import Messages from '@/pages/Messages';
import ConversationView from '@/pages/ConversationView';
import Profile from '@/pages/Profile';
import RiderProfile from '@/pages/RiderProfile';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminBroadcasts from '@/pages/admin/AdminBroadcasts';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import ThemePreview from '@/pages/ThemePreview';

import { useMyProfile } from '@/lib/useCurrentUser';

const ProfileGate = ({ children }) => {
  const { data: profile, isLoading } = useMyProfile();
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/onboarding" replace />;
  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/preview" element={<ThemePreview />} />
      <Route element={<ProfileGate><Layout /></ProfileGate>}>
        <Route path="/home" element={<Home />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/broadcast/:id" element={<BroadcastDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<ConversationView />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<RiderProfile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App