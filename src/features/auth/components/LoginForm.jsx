/**
 * @fileoverview LoginForm - Email/password and OAuth authentication form.
 *
 * Uses react-hook-form + zod for validation.
 * Supports sign-in / sign-up modes, Google OAuth, and password reset.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthActions } from '@/features/auth/hooks/use-auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { resetPassword } from '@/features/auth/api/auth-api.js';

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ------------------------------------------------------------------
// Friendly error messages
// ------------------------------------------------------------------

function getFriendlyErrorMessage(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  return msg || 'Something went wrong. Please try again.';
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

/**
 * @param {{
 *   onSuccess?: () => void,
 *   defaultMode?: 'signin' | 'signup',
 * }} props
 */
export default function LoginForm({ onSuccess, defaultMode = 'signin', defaultError = '' }) {
  const { signIn, signUp, signInWithProvider } = useAuthActions();
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState('');
  const [formError, setFormError] = useState(defaultError);

  useEffect(() => {
    if (defaultError) setFormError(defaultError);
  }, [defaultError]);
  const [notice, setNotice] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(
    () => localStorage.getItem('rr_remember_device') !== 'false'
  );

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setFormError('');
    setNotice('');
    setLoading(true);

    try {
      const options = { rememberDevice };
      if (mode === 'signin') {
        await signIn(values.email, values.password, options);
        onSuccess?.();
      } else {
        const data = await signUp(values.email, values.password, options);
        if (data?.session) {
          onSuccess?.();
        } else {
          setNotice('Check your email to confirm your account, then come back and sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProvider = async (provider) => {
    setFormError('');
    setNotice('');
    setProviderLoading(provider);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err));
      setProviderLoading('');
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email || !z.string().email().safeParse(email).success) {
      setFormError('Enter a valid email above to reset your password.');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setNotice('Password reset email sent. Check your inbox.');
      setShowForgot(false);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* OAuth buttons */}
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-start gap-3"
          onClick={() => handleProvider('google')}
          disabled={loading || !!providerLoading}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 font-display text-sm font-bold shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
            {providerLoading === 'google' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              'G'
            )}
          </span>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-12 justify-start gap-3"
          onClick={() => {
            setShowForgot(false);
            setFormError('');
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

      {/* Notices */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-primary/10 p-4 text-sm font-medium text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]"
        >
          {notice}
        </div>
      )}

      {/* Errors */}
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      {/* Email form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Mode toggle */}
          <div
            className="rr-glass-border grid grid-cols-2 rounded-full bg-black/25 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setFormError('');
                setShowForgot(false);
              }}
              className={cn(
                'rr-haptic min-h-11 rounded-full text-sm font-bold transition',
                mode === 'signin'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => {
                setMode('signup');
                setFormError('');
                setShowForgot(false);
              }}
              className={cn(
                'rr-haptic min-h-11 rounded-full text-sm font-bold transition',
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Create account
            </button>
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="rider@example.com"
                    autoComplete="email"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter a secure password"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      disabled={loading}
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Forgot password */}
          {mode === 'signin' && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowForgot((s) => !s)}
                className="text-xs font-medium text-primary hover:underline min-h-[44px] px-2"
              >
                Forgot password?
              </button>
            </div>
          )}

          {showForgot && (
            <div className="rounded-2xl bg-secondary/30 p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                We’ll send a reset link to the email address above.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </div>
          )}

          {/* Remember device */}
          <label className="rr-haptic flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 text-sm text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.055)]">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => {
                setRememberDevice(e.target.checked);
                localStorage.setItem('rr_remember_device', String(e.target.checked));
              }}
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
        </form>
      </Form>
    </div>
  );
}
