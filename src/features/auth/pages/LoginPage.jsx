/**
 * @fileoverview LoginPage - Full login page with branding.
 *
 * Wraps LoginForm with Ride Radar branding, background effects,
 * and redirect handling after successful authentication.
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState, useAuthActions } from '@/features/auth/hooks/use-auth.js';
import LoginForm from '@/features/auth/components/LoginForm.jsx';
import RRLogo from '@/components/RRLogo';
import { getSafeAuthRedirectFromSearch } from '@/lib/auth-redirect.js';
import { preloadCoreRoutes } from '@/lib/routePreload.js';
import { logger } from '@/lib/logger.js';
import { getAuthErrorFromLocation } from '@/lib/auth-redirect';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { isLoading, authEvent } = useAuthState();
  const { updatePassword } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getSafeAuthRedirectFromSearch(location.search);

  const [oauthError, setOauthError] = useState(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const isRecovery = authEvent === 'PASSWORD_RECOVERY';

  // Handle OAuth error params in URL
  useEffect(() => {
    const err = getAuthErrorFromLocation(location.search, location.hash);
    if (!err) return;

    logger.warn('[LoginPage] OAuth error:', err);
    setOauthError(err.message);
    navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
  }, [location.hash, location.search, navigate, redirectPath]);

  const handleSuccess = useCallback(() => {
    preloadCoreRoutes();
    navigate(redirectPath, { replace: true });
  }, [navigate, redirectPath]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (recoveryPassword.length < 6) {
      setRecoveryError('Password must be at least 6 characters.');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      await updatePassword(recoveryPassword);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setRecoveryError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

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
    <div className="min-h-dvh bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radar-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%)]" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-surface rounded-[20px] p-8 border border-border shadow-2xl">
          {/* Branding */}
          <div className="mb-8 flex flex-col items-center">
            <RRLogo size="lg" className="mb-4" />
            <h1 className="font-display text-center text-3xl font-bold tracking-tight">
              Ride<span className="text-primary">Radar</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRecovery ? 'Set a new password for your account' : 'Sign in to your rider network'}
            </p>
          </div>

          {isRecovery ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {recoveryError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive border border-destructive/20"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {recoveryError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="recovery-password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  New password
                </Label>
                <Input
                  id="recovery-password"
                  type="password"
                  placeholder="Enter a secure password"
                  autoComplete="new-password"
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  disabled={recoveryLoading}
                  className="h-12 bg-surface border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
              <Button
                type="submit"
                disabled={recoveryLoading}
                className="h-12 w-full rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 active:scale-95 transition-all duration-150"
              >
                {recoveryLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating...
                  </span>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          ) : (
            <LoginForm onSuccess={handleSuccess} defaultError={oauthError || ''} />
          )}

          {/* Link to landing */}
          {!isRecovery && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              New to Ride Radar?{' '}
              <button
                onClick={() => navigate('/landing')}
                className="font-medium text-primary hover:underline active:scale-95 transition-transform inline-block"
              >
                Learn more
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
