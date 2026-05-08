import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RRLogo from '@/components/RRLogo';
import { preloadCoreRoutes } from '@/lib/routePreload';
import { logger } from '@/lib/logger';
import { Mail } from 'lucide-react';

const PROVIDERS = [
  { id: 'google', label: 'Google', mark: 'G' },
];

function getSafeRedirect(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/home';
  if (value.startsWith('/login')) return '/home';
  return value;
}

export default function SupabaseLogin() {
  const { signIn, signUp, signInWithProvider, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = getSafeRedirect(searchParams.get('redirect'));
  const [mode, setMode] = useState('signin');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState('');

  const handleProvider = async (provider) => {
    setError('');
    setNotice('');
    setProviderLoading(provider);

    try {
      await signInWithProvider(provider, `${window.location.origin}${redirectPath}`);
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
        await signIn(email, password);
        preloadCoreRoutes();
        navigate(redirectPath, { replace: true });
      } else {
        const data = await signUp(email, password, {
          full_name: email.split('@')[0],
        });

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
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rr-surface rounded-3xl border border-border/50 p-7 shadow-2xl">
          <div className="mb-7 flex flex-col items-center">
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
                className="h-12 rounded-xl justify-start gap-3"
                onClick={() => handleProvider(provider.id)}
                disabled={loading || !!providerLoading}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-black/25 font-display text-sm font-bold">
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
              className="h-12 rounded-xl justify-start gap-3"
              onClick={() => {
                setShowEmailForm(true);
                setError('');
                setNotice('');
              }}
              disabled={loading || !!providerLoading}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-black/25">
                <Mail className="h-4 w-4" />
              </span>
              Continue with email
            </Button>
          </div>

          {notice && (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm text-primary">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {showEmailForm && (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 rounded-xl border border-border/70 bg-black/25 p-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`min-h-10 rounded-lg text-sm font-bold transition ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`min-h-10 rounded-lg text-sm font-bold transition ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Create account
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

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
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New accounts can add bike, bio, and photo details now or later.
          </p>
        </div>
      </div>
    </div>
  );
}
