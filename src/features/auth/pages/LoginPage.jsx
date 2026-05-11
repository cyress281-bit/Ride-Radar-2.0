/**
 * @fileoverview LoginPage - Full login page with branding.
 *
 * Wraps LoginForm with Ride Radar branding, background effects,
 * and redirect handling after successful authentication.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import LoginForm from '@/features/auth/components/LoginForm.jsx';
import RRLogo from '@/components/RRLogo';
import { getSafeAuthRedirectFromSearch } from '@/lib/auth-redirect.js';
import { preloadCoreRoutes } from '@/lib/routePreload.js';
import { logger } from '@/lib/logger.js';
import { getAuthErrorFromLocation } from '@/lib/auth-redirect';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

export default function LoginPage() {
  const { isLoading } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getSafeAuthRedirectFromSearch(location.search);

  // Handle OAuth error params in URL
  useEffect(() => {
    const oauthError = getAuthErrorFromLocation(location.search, location.hash);
    if (!oauthError) return;

    logger.warn('[LoginPage] OAuth error:', oauthError);
    navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
  }, [location.hash, location.search, navigate, redirectPath]);

  const handleSuccess = useCallback(() => {
    preloadCoreRoutes();
    navigate(redirectPath, { replace: true });
  }, [navigate, redirectPath]);

  // Show brand loading state while auth state is initializing
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src={RIDE_RADAR_LOGO_URL}
            alt="Ride Radar"
            className="h-14 w-auto object-contain drop-shadow-[0_0_16px_hsl(var(--primary)/0.4)] animate-pulse"
          />
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="h-1 w-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4 py-8">
      {/* Background effects */}
      <div className="absolute inset-0 radar-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rr-surface rounded-[20px] p-8 shadow-2xl">
          {/* Branding */}
          <div className="mb-8 flex flex-col items-center">
            <RRLogo size="lg" className="mb-4" />
            <h1 className="font-display text-center text-3xl font-bold">
              Ride<span className="text-primary">Radar</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your rider network
            </p>
          </div>

          <LoginForm onSuccess={handleSuccess} />

          {/* Link to landing */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New to Ride Radar?{' '}
            <button
              onClick={() => navigate('/landing')}
              className="font-medium text-primary hover:underline"
            >
              Learn more
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
