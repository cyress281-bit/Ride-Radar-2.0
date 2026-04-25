import React, { useState } from 'react';
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
import SplashScreen from '@/components/SplashScreen';
import { AnimatePresence } from 'framer-motion';

import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';

const AdminGate = ({ children }) => {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  if (user?.role !== 'admin') return <Navigate to="/home" replace />;
  return children;
};

const RouteErrorState = ({ title = 'Unable to load', message = 'Please refresh and try again.' }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
    <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
      <h1 className="font-display text-xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

const ProfileGate = ({ children }) => {
  const { data: profile, isLoading, isPending, isError, error } = useMyProfile();
  
  if (isLoading || isPending) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return <RouteErrorState title="Profile failed to load" message={error?.message || 'Your rider profile could not be loaded.'} />;
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

  if (authError && authError.type !== 'auth_required') {
    return <RouteErrorState title="App failed to start" message={authError.message || 'Configuration or authentication setup failed.'} />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/preview" element={<ThemePreview />} />
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
        <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
        <Route path="/admin/users" element={<AdminGate><AdminUsers /></AdminGate>} />
        <Route path="/admin/broadcasts" element={<AdminGate><AdminBroadcasts /></AdminGate>} />
        <Route path="/admin/notifications" element={<AdminGate><AdminNotifications /></AdminGate>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  const [splashComplete, setSplashComplete] = useState(false);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AnimatePresence>
            {!splashComplete && (
              <SplashScreen onComplete={() => setSplashComplete(true)} />
            )}
          </AnimatePresence>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App