import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RRLogo from '@/components/RRLogo';
import { preloadCoreRoutes } from '@/lib/routePreload';
import { logger } from '@/lib/logger';
import { getAuthErrorFromLocation, getSafeAuthRedirectFromSearch } from '@/lib/authRedirect';
import { Mail } from 'lucide-react';

const PROVIDERS = [
  { id: 'google', label: 'Google', mark: 'G' },
];

export default function SupabaseLogin() {
  const { signIn, signUp, signInWithProvider, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = getSafeAuthRedirectFromSearch(searchParams);
  const [mode, setMode] = useState('signin');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState('');
  const [rememberDevice, setRememberDevice] = useState(() => localStorage.getItem('rr_remember_device') !== 'false');

  useEffect(() => {
    const oauthError = getAuthErrorFromLocation(location.search, location.hash);
    if (!oauthError) return;

    setError(oauthError.message);
    setProviderLoading('');
    navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
  }, [location.hash, location.search, navigate, redirectPath]);

  const handleProvider = async (provider) => {
    setError('');
    setNotice('');
    setProviderLoading(provider);

    try {
      sessionStorage.setItem('rr_oauth_redirect', redirectPath);
      await signInWithProvider(provider, `${window.location.origin}/login`, { rememberDevice });
    } catch (err) {
      logger.error('OAuth error:', err);
      setError(err.message || `Could not continue with ${provider}.`);
      setProviderLoading('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password, { rememberDevice });
        preloadCoreRoutes();
        navigate(redirectPath, { replace: true });
      } else {
        const data = await signUp(email, password, {
          full_name: email.split('@')[0],
        }, { rememberDevice });

        if (data?.session) {
          navigate('/onboarding', { replace: true });
        } else {
          setNotice('Check your email to confirm your account, then come back and sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      logger.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border border-primary/50 shadow-[0_0_18px_hsl(var(--primary)/0.22)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 radar-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rr-surface rounded-[20px] p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center">
            <RRLogo size="lg" className="mb-4" />
            <h1 className="font-display text-center text-3xl font-bold">
              Ride<span className="text-primary">Radar</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === 'signin' ? 'Sign in to your rider network' : 'Create your rider account'}
            </p>
          </div>

          <div className="grid gap-2">
            {PROVIDERS.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="h-12 justify-start gap-3"
                onClick={() => handleProvider(provider.id)}
                disabled={loading || !!providerLoading}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 font-display text-sm font-bold shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
                  {providerLoading === provider.id ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    provider.mark
                  )}
                </span>
                Continue with {provider.label}
              </Button>
            ))}

            <Button
              type="button"
              variant={showEmailForm ? 'default' : 'outline'}
              className="h-12 justify-start gap-3"
              onClick={() => {
                setShowEmailForm(true);
                setError('');
                setNotice('');
              }}
              disabled={loading || !!providerLoading}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
                <Mail className="h-4 w-4" />
              </span>
              Continue with email
            </Button>
          </div>

          {notice && (
            <div role="status" aria-live="polite" className="mt-4 rounded-2xl bg-primary/10 p-4 text-sm font-medium text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
              {notice}
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
              {error}
            </div>
          )}

          {showEmailForm && (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="rr-glass-border grid grid-cols-2 rounded-full bg-black/25 p-1" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  aria-controls="email-auth-panel"
                  onClick={() => setMode('signin')}
                  className={`rr-haptic min-h-10 rounded-full text-sm font-bold transition ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  aria-controls="email-auth-panel"
                  onClick={() => setMode('signup')}
                  className={`rr-haptic min-h-10 rounded-full text-sm font-bold transition ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Create account
                </button>
              </div>

              <div id="email-auth-panel" role="tabpanel" className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium">Email</label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rider@example.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-medium">Password</label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a secure password"
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                <label className="rr-haptic flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Remember this device
                </label>

                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl font-semibold">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : mode === 'signin' ? (
                    'Sign in with email'
                  ) : (
                    'Create account with email'
                  )}
                </Button>
              </div>
            </form>
          )}

          {!showEmailForm && (
            <label className="rr-haptic mt-4 flex items-center justify-center gap-3 rounded-2xl bg-black/20 px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Remember this device
            </label>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New accounts can add bike, bio, and photo details now or later.
          </p>
        </div>
      </div>
    </div>
  );
}
