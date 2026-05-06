import { useState } from 'react';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RRLogo from '@/components/RRLogo';
import { preloadCoreRoutes } from '@/lib/routePreload';
import { logger } from '@/lib/logger';

export default function SupabaseLogin() {
  const { signIn, signUp, isLoading } = useSupabaseAuth();
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // Preload core route chunks while auth redirect is happening
      preloadCoreRoutes();
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 radar-grid-animated pointer-events-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_32%)]" />

      {/* Login form */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rr-surface rounded-3xl p-8 border border-border/50 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <RRLogo size="lg" className="mb-4" />
            <h1 className="font-display font-bold text-3xl text-center">
              Ride<span className="text-primary">Radar</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === 'signin' ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <span className="font-semibold text-primary">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="font-semibold text-primary">Sign in</span>
                </>
              )}
            </button>
          </div>

          {/* Test credentials hint */}
          <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground text-center">
              🧪 <strong>Test Account:</strong> Create one using the form above
            </p>
          </div>
        </div>

        {/* Supabase badge */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Supabase • Session persists across browser restarts ✅
          </p>
        </div>
      </div>
    </div>
  );
}
